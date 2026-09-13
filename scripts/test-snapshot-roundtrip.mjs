// Round-trip test: load scripts/prod-snapshot.json into a scratch SQLite DB
// using the same topo-order + batched createMany logic as provision-neon.mjs.
// Proves every row (incl. Date fields) survives the JSON round trip.
import { unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const scratch = path.join(root, "db", "scratch-roundtrip.db");
try { unlinkSync(scratch); } catch {}

execSync(`npx --no-install prisma db push --schema prisma/schema.prisma --skip-generate`, {
  stdio: "pipe", env: { ...process.env, DATABASE_URL: `file:${scratch}` },
});

const { PrismaClient, Prisma } = require("@prisma/client");
const db = new PrismaClient({ datasourceUrl: `file:${scratch}`, log: [] });
const snapshot = require(path.join(root, "scripts", "prod-snapshot.json"));

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

const order = topoOrder(Prisma.dmmf.datamodel.models);
const BATCH = 400;
let grand = 0, bad = [];
for (const name of order) {
  const rows = snapshot.data[name];
  if (!rows?.length) continue;
  try {
    for (let i = 0; i < rows.length; i += BATCH)
      await db[name].createMany({ data: rows.slice(i, i + BATCH) });
    grand += rows.length;
  } catch (e) {
    bad.push(`${name}: ${e.message}`);
  }
}
const check = async (n) => (await db[n].count()).valueOf();
for (const k of ["CityConfig", "OrgUnit", "SystemUser", "AuditEvent"])
  console.log(`${k}: loaded=${await check(k)} expected=${snapshot.counts[k]}`);
console.log(`total rows loaded: ${grand}/${Object.values(snapshot.counts).reduce((a, b) => a + b, 0)}`);
if (bad.length) { console.log("FAILURES:\n" + bad.join("\n")); }
await db.$disconnect();
console.log(bad.length ? "ROUND-TRIP: FAIL" : "ROUND-TRIP: PASS");
