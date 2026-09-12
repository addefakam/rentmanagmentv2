// ============================================================================
// provision-neon.mjs — automatic production database provisioning, run by
// scripts/build.mjs whenever DATABASE_URL is PostgreSQL (i.e. on Vercel).
//
// Why: the deployed code queries the current multi-city schema
// (CityConfig.isActive, AD/DR cities, CITY_ADMIN role). A Neon database
// provisioned before 2026-09-11 lacks all of that, so /api/auth/staff fails
// and the login page shows no cities/officers. This script makes every
// Vercel deployment self-healing:
//
//   1. If the Neon schema/data is already current -> plain `prisma db push`
//      (additive sync only; destructive sync fails the build loudly).
//   2. If the database is empty or stale (no isActive column, or fewer than
//      2 cities) -> full re-provision: drop schema, push the current schema,
//      load scripts/prod-snapshot.json (the committed verified demo state),
//      realign autoincrement sequences, verify counts.
//
// Local development is untouched: with a SQLite DATABASE_URL the script
// exits immediately. DDL and data load use the DIRECT Neon endpoint
// (host without "-pooler", no pgbouncer param) — the pooler kills long
// transactions; the runtime URL on Vercel is left exactly as configured.
// ============================================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const log = (m) => console.log(`[provision] ${m}`);
const die = (m) => { console.error(`[provision] ERROR: ${m}`); process.exit(1); };

const url = (process.env.DATABASE_URL ?? "").trim();
if (!/^(postgres|postgresql):\/\//i.test(url)) {
  log(`DATABASE_URL is not postgres (${url.split("@")[1] ?? (url || "unset")}) — nothing to provision (local dev).`);
  process.exit(0);
}

// Direct endpoint for DDL/bulk copy: strip "-pooler" from the host and drop
// PgBouncer-specific params. sslmode is kept.
const directUrl = (() => {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.replace(/-pooler(?=\.)/, "");
    u.searchParams.delete("pgbouncer");
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch { return url; }
})();

const runner = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (args, extraEnv = {}) => {
  const r = spawnSync(runner, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
  if (r.status !== 0) die(`command failed (exit ${r.status}): ${args.join(" ")}`);
};

const require2 = createRequire(path.join(root, "package.json"));
const pgClientDir = path.join(root, "node_modules", ".prisma-pg");

// --- 1. PostgreSQL client for this script's own probes + bulk copy ---------
log("generating the PostgreSQL Prisma client (node_modules/.prisma-pg)...");
run(["--no-install", "prisma", "generate", "--schema", "prisma/schema.postgres.prisma",
     "--output", pgClientDir]);

const { PrismaClient: PG, Prisma: PGPrisma } = require2(pgClientDir);
const db = new PG({ datasourceUrl: directUrl, log: [] });

const scalarCount = async (sql) => {
  const rows = await db.$queryRawUnsafe(sql);
  return Number(rows[0]?.n ?? 0);
};

// --- 2. Probe the current state of the database -----------------------------
log(`probing ${new URL(directUrl).hostname} ...`);
let cityConfigTable = 0, isActiveColumn = 0, cityCount = 0;
try {
  cityConfigTable = await scalarCount(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='CityConfig'`);
  isActiveColumn = await scalarCount(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='CityConfig' AND column_name='isActive'`);
  if (cityConfigTable > 0 && isActiveColumn > 0)
    cityCount = await scalarCount(`SELECT COUNT(*)::int AS n FROM "CityConfig"`);
} catch (e) {
  die(`cannot probe the database: ${e.message.slice(0, 200)}`);
}
log(`state: CityConfig table=${cityConfigTable ? "yes" : "no"}, isActive column=${isActiveColumn ? "yes" : "no"}, cities=${cityCount}`);

const stale = cityConfigTable === 0 || isActiveColumn === 0 || cityCount < 2;

// --- 3a. Current database: additive schema sync only ------------------------
if (!stale) {
  log("database is current — syncing schema (additive only)...");
  const push = spawnSync(runner,
    ["--no-install", "prisma", "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"],
    { stdio: "inherit", env: { ...process.env, DATABASE_URL: directUrl } });
  if (push.status !== 0)
    die("schema sync failed (destructive change?). Re-provision by emptying the database, or run scripts/refresh-neon.sh locally.");
  log("schema in sync.");
  await db.$disconnect();
  process.exit(0);
}

// --- 3b. Stale/empty database: full re-provision -----------------------------
log("stale or empty database detected — full re-provision starting.");

const snapPath = path.join(root, "scripts", "prod-snapshot.json");
if (!existsSync(snapPath)) die("scripts/prod-snapshot.json missing — cannot load the shipped state.");
const snapshot = JSON.parse(readFileSync(snapPath, "utf8"));

log("dropping the old schema...");
await db.$executeRawUnsafe(`DROP SCHEMA public CASCADE`);
await db.$executeRawUnsafe(`CREATE SCHEMA public`);

log("creating the current schema (prisma db push)...");
run(["--no-install", "prisma", "db", "push", "--schema", "prisma/schema.postgres.prisma",
     "--skip-generate", "--accept-data-loss"], { DATABASE_URL: directUrl });

// --- 4. Load the committed snapshot (batched createMany, topo order) --------
function topoOrder(models) {
  const names = new Set(models.map((m) => m.name));
  const deps = new Map();
  for (const m of models) {
    const d = new Set();
    for (const f of m.fields) {
      if (f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && f.type !== m.name && names.has(f.type))
        d.add(f.type);
    }
    deps.set(m.name, d);
  }
  const order = [];
  const done = new Set();
  const visit = (n, stack) => {
    if (done.has(n) || stack.has(n)) return;
    stack.add(n);
    for (const d of deps.get(n) ?? []) visit(d, stack);
    stack.delete(n);
    done.add(n);
    order.push(n);
  };
  for (const m of models) visit(m.name, new Set());
  return order;
}

const models = PGPrisma.dmmf.datamodel.models;
const order = topoOrder(models);
const BATCH = 400;
const loaded = {};
let grand = 0;
log(`loading snapshot (${order.length} models, source exported ${snapshot.exportedAt})...`);
for (const name of order) {
  const rows = snapshot.data[name];
  if (!rows || rows.length === 0) { loaded[name] = 0; continue; }
  const delegate = db[name];
  if (!delegate?.createMany) { log(`SKIP ${name} (no delegate)`); loaded[name] = 0; continue; }
  for (let i = 0; i < rows.length; i += BATCH)
    await delegate.createMany({ data: rows.slice(i, i + BATCH) });
  loaded[name] = rows.length;
  grand += rows.length;
}

// --- 5. Realign autoincrement sequences (rows were inserted with ids) -------
let realigned = 0;
for (const m of models) {
  for (const f of m.fields) {
    if (f.kind !== "scalar" || f.default?.name !== "autoincrement") continue;
    try {
      await db.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${m.name}"', '${f.name}'), ` +
        `COALESCE((SELECT MAX("${f.name}") FROM "${m.name}"), 0) + 1, false)`);
      realigned++;
    } catch { /* tables whose column has no owning sequence — safe to ignore */ }
  }
}

// --- 6. Verify ---------------------------------------------------------------
const mismatches = Object.entries(snapshot.counts).filter(([n, c]) => (loaded[n] ?? 0) !== c);
log(`loaded ${grand} rows; sequences realigned: ${realigned}`);
for (const key of ["CityConfig", "OrgUnit", "SystemUser", "Party", "Property", "AuditEvent"])
  log(`verify ${key}: ${loaded[key] ?? 0} (expected ${snapshot.counts[key] ?? 0})`);

if (mismatches.length > 0) {
  die(`row-count mismatch for: ${mismatches.map(([n, c]) => `${n} (${loaded[n] ?? 0}/${c})`).join(", ")}`);
}
if ((loaded.CityConfig ?? 0) < 2) die("CityConfig did not load — refusing to ship a broken login.");

await db.$disconnect();
log("DONE — Neon now matches the verified demo state. The deployment will serve the full login directory.");
