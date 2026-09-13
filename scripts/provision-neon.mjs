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
//   2. If the database is empty or stale (no isActive column, or zero
//      cities) -> full re-provision: drop schema, push the current schema,
//      load scripts/prod-snapshot.json (the committed verified demo state),
//      realign autoincrement sequences, verify counts.
//   3. On every run, purge any city listed in scripts/purge-cities.mjs
//      (owner directive: Adama removed entirely; one-shot marker keeps a
//      future re-onboarded city with the same code safe from auto-purge).
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

const require2 = createRequire(path.join(root, "package.json"));
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) die("prisma CLI not found at node_modules/prisma/build/index.js");

// Direct CLI runner — immune to npx resolution quirks on Vercel.
const runPrisma = (args, extraEnv = {}) => {
  const r = spawnSync(process.execPath, [prismaCli, ...args], { stdio: "inherit", env: { ...process.env, ...extraEnv } });
  if (r.status !== 0) die(`command failed (exit ${r.status}): prisma ${args.join(" ")}`);
};

// The default @prisma/client has ALREADY been generated from the PostgreSQL
// schema by scripts/build.mjs before this script runs — no extra generate.
const { PrismaClient: PG, Prisma: PGPrisma } = require2("@prisma/client");
const db = new PG({ datasourceUrl: directUrl, log: [] });

const scalarCount = async (sql) => {
  const rows = await db.$queryRawUnsafe(sql);
  return Number(rows[0]?.n ?? 0);
};

// --- Pre-sync DDL: apply the changes that `prisma db push` refuses to make
// without --accept-data-loss even though they are provably safe. Adding a
// UNIQUE constraint on a NEW column is flagged as potential data loss
// ("if there are existing duplicate values, this will fail") — but a brand
// new column holds only NULLs and NULLs never collide in a unique index.
// Creating those objects idempotently here keeps the additive push below
// warning-free, while genuinely destructive changes still fail the build
// loudly (we never pass --accept-data-loss on the additive path).
//
// Maintenance rule: whenever the schema gains another @unique on an existing
// table, extend this function with the matching idempotent statements and
// keep the names identical to Prisma's convention (<table>_<column>_key).
async function preSyncDdl() {
  // SaaS Phase 2: CityConfig.slug — tenant URL identity (subdomain routing).
  await db.$executeRawUnsafe(`ALTER TABLE "CityConfig" ADD COLUMN IF NOT EXISTS "slug" TEXT`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CityConfig_slug_key" ON "CityConfig"("slug")`);
}

// --- Phase 9 SaaS backfill (idempotent): every existing city becomes a full
// tenant — slug, lifecycle status, white-label colors, module flags and a
// starter service catalog. Fills ONLY empty fields; safe on every deploy.
const ALL_MODULES = JSON.stringify({
  CITIZEN_SERVICES: true, SERVICE_REQUESTS: true, COMPLAINTS: true, APPOINTMENTS: true,
  PERMITS: true, LICENSING: true, PAYMENTS: true, NOTIFICATIONS: true,
  DOCUMENTS: true, REPORTS: true, ANALYTICS: true, ANNOUNCEMENTS: true,
});
const TENANT_COLORS = {
  AA: { primary: "#1D4ED8", secondary: "#0F766E", accent: "#2563EB" },
  AD: { primary: "#059669", secondary: "#065F46", accent: "#10B981" },
  DR: { primary: "#475569", secondary: "#334155", accent: "#64748B" },
};
const STARTER_SERVICES = [
  { code: "REG-CERT", nameEn: "Rental contract registration & certification", category: "REGISTRATION", fee: 100, days: 5, docs: ["Lease agreement", "ID of landlord and tenant", "Ownership evidence"] },
  { code: "COMPLAINT-FILE", nameEn: "File a rent complaint", category: "COMPLAINTS", fee: 0, days: 30, docs: ["ID card", "Lease or payment evidence"] },
  { code: "PAY-RECEIPT", nameEn: "Rent payment recording", category: "PAYMENTS", fee: 0, days: 1, docs: ["Receipt reference"] },
  { code: "PERMIT-RENTAL", nameEn: "Rental business permit application", category: "PERMITS", fee: 250, days: 10, docs: ["Business license", "Ownership evidence", "ID card"] },
];
const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
async function backfillTenants() {
  let cols = 0;
  try {
    cols = await scalarCount(`SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='CityConfig' AND column_name='slug'`);
  } catch { return; }
  if (!cols) { log("backfill: SaaS columns not present yet — skipped."); return; }
  const cities = await db.cityConfig.findMany({ orderBy: { cityCode: "asc" } });
  let changed = 0;
  for (const c of cities) {
    const data = {};
    if (!c.slug) {
      let slug = slugify(c.nameEn) || c.cityCode.toLowerCase();
      const taken = await db.cityConfig.findUnique({ where: { slug } });
      if (taken && taken.cityCode !== c.cityCode) slug = slugify(`${c.nameEn}-${c.cityCode}`) || `${slug}-${c.cityCode.toLowerCase()}`;
      data.slug = slug;
    }
    if (!c.status) data.status = c.isActive ? "ACTIVE" : "DEACTIVATED";
    if (!c.isActive && c.status === "ACTIVE") data.status = "DEACTIVATED";
    if (c.isActive && c.status === "DEACTIVATED") data.status = "ACTIVE";
    if (!c.country) data.country = "Ethiopia";
    if (!c.timezone) data.timezone = "Africa/Addis_Ababa";
    if ((c.primaryColor ?? "").toUpperCase() === "#1D4ED8" && (c.secondaryColor ?? "").toUpperCase() === "#0F766E" && (c.accentColor ?? "").toUpperCase() === "#D4875A" && (TENANT_COLORS[c.cityCode] || !c.primaryColor)) {
      const p = TENANT_COLORS[c.cityCode] ?? TENANT_COLORS.AA;
      data.primaryColor = p.primary; data.secondaryColor = p.secondary; data.accentColor = p.accent;
    }
    if (!c.modulesJson) data.modulesJson = ALL_MODULES;
    if (Object.keys(data).length > 0) {
      await db.cityConfig.update({ where: { cityCode: c.cityCode }, data });
      changed++;
      log(`backfill ${c.cityCode}: ${Object.keys(data).join(", ")}`);
    }
    const svc = await db.serviceDefinition.count({ where: { cityCode: c.cityCode } });
    if (svc === 0) {
      const bureauId = c.bureauId ?? null;
      for (const s of STARTER_SERVICES) {
        await db.serviceDefinition.create({
          data: {
            cityCode: c.cityCode, code: s.code, nameEn: s.nameEn, category: s.category,
            requiredDocumentsJson: JSON.stringify(s.docs), processingTimeDays: s.days,
            slaDays: s.days, feeAmount: s.fee, feeCurrency: "ETB",
            departmentOrgUnitId: bureauId, isActive: true, isPublic: true,
          },
        });
      }
      log(`backfill ${c.cityCode}: ${STARTER_SERVICES.length} starter services seeded`);
    }
  }
  log(`backfill done — ${changed} of ${cities.length} tenant(s) updated`);
}

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

// Sanity floor is ONE city: the platform ships Addis Ababa; any further
// cities exist only because they were onboarded (or, as with the deactivated
// Dire Dawa demo, shipped in the snapshot).
const stale = cityConfigTable === 0 || isActiveColumn === 0 || cityCount < 1;

// --- 3a. Current database: additive schema sync only ------------------------
if (!stale) {
  log("database is current — syncing schema (additive only)...");
  await preSyncDdl();
  const push = spawnSync(process.execPath, [prismaCli, "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"],
    { stdio: "inherit", env: { ...process.env, DATABASE_URL: directUrl } });
  if (push.status !== 0)
    die("schema sync failed (destructive change, or a unique-constraint migration not covered by preSyncDdl?). Re-provision by emptying the database, or run scripts/refresh-neon.sh locally.");
  log("schema in sync.");
  // Owner-directed city removal runs BEFORE tenant backfill so the backfill
  // never re-seeds a service catalog for a city that must not exist.
  const { purgeRemovedCities } = await import("./purge-cities.mjs");
  await purgeRemovedCities(db, log);
  await backfillTenants();
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
runPrisma(["db", "push", "--schema", "prisma/schema.postgres.prisma",
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
if ((loaded.CityConfig ?? 0) < 1) die("CityConfig did not load — refusing to ship a broken login.");

const purge = await import("./purge-cities.mjs");
await purge.purgeRemovedCities(db, log);
await backfillTenants();
await db.$disconnect();
log("DONE — Neon now matches the verified demo state. The deployment will serve the full login directory.");
