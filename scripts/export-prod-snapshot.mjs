// ============================================================================
// export-prod-snapshot.mjs — dump the full local SQLite state to a JSON
// snapshot committed with the repo. The Vercel build consumes it via
// scripts/provision-neon.mjs to provision the Neon database automatically
// (no manual ETL needed).
//
// Run locally whenever the shipped demo state changes:
//   bun scripts/export-prod-snapshot.mjs        (or: node scripts/export-prod-snapshot.mjs)
// then commit scripts/prod-snapshot.json.
//
// JSON round-trip safety: the schema has no BigInt/Bytes/Decimal fields;
// DateTime fields serialize to ISO strings, which Prisma createMany accepts.
// ============================================================================

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
process.env.DATABASE_URL ??= "file:./db/custom.db";

const { PrismaClient, Prisma } = require("@prisma/client");
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] });

// Same topological order logic as scripts/etl-sqlite-to-neon.ts (proven).
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

const w = async () => {
  const models = Prisma.dmmf.datamodel.models;
  const order = topoOrder(models);
  const data = {};
  const counts = {};
  let grand = 0;
  for (const m of models) {
    const name = m.name;
    const delegate = db[name];
    if (!delegate?.findMany) { console.log(`SKIP ${name} (no delegate)`); continue; }
    const rows = await delegate.findMany();
    if (rows.length > 0) { data[name] = rows; counts[name] = rows.length; grand += rows.length; }
  }
  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: "local sqlite seed — verified demo state (AA + AD active, DR deactivated)",
    counts,
    order,
    data,
  };
  const out = path.join(root, "scripts", "prod-snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot));
  console.log(`models: ${order.length}; total rows: ${grand}`);
  console.log(`CityConfig: ${counts.CityConfig ?? 0}, OrgUnit: ${counts.OrgUnit ?? 0}, SystemUser: ${counts.SystemUser ?? 0}, AuditEvent: ${counts.AuditEvent ?? 0}`);
  console.log(`written: ${out}`);
  await db.$disconnect();
};

w().catch((e) => { console.error(e); process.exit(1); });
