// ============================================================================
// etl-sqlite-to-neon.ts — one-time bulk copy of the platform's shipped state
// from the local SQLite database (seed + executed gate actions) into the
// Neon PostgreSQL deployment database.
//
// Why: prisma/seed.ts is row-by-row; over WAN that is hours, and Neon's
// pooler kills long transactions. This script batches with createMany and
// copies the authoritative local state, including the SIGNED closure minute
// and the full audit chain.
//
// Usage:
//   SOURCE_URL=file:/home/z/my-project/db/custom.db \
//   TARGET_URL='postgresql://...@ep-xxx...neon.tech/neondb?sslmode=require' \
//   bun scripts/etl-sqlite-to-neon.ts
//
// The PostgreSQL client is generated at node_modules/.prisma-pg (see
// scripts/pipeline note in DEPLOYMENT.md); it is required dynamically.
// ============================================================================

// @ts-nocheck
const pgModule = require("/home/z/my-project/node_modules/.prisma-pg");
const { PrismaClient: SqliteClient } = require("@prisma/client");

const SOURCE_URL = process.env.SOURCE_URL ?? "file:/home/z/my-project/db/custom.db";
const TARGET_URL = process.env.TARGET_URL ?? "";
if (!TARGET_URL) { console.error("TARGET_URL required"); process.exit(1); }

const src = new SqliteClient({ datasourceUrl: SOURCE_URL, log: [] });
const dst = new pgModule.PrismaClient({ datasourceUrl: TARGET_URL, log: [] });

type ModelDef = { name: string; fields: { kind: string; type: string; relationFromFields?: string[] }[] };

function topoOrder(models: ModelDef[]): string[] {
  const names = new Set(models.map((m) => m.name));
  const deps = new Map<string, Set<string>>();
  for (const m of models) {
    const d = new Set<string>();
    for (const f of m.fields) {
      if (f.kind === "object" && (f.relationFromFields?.length ?? 0) > 0 && f.type !== m.name && names.has(f.type))
        d.add(f.type);
    }
    deps.set(m.name, d);
  }
  const order: string[] = [];
  const done = new Set<string>();
  const visit = (n: string, stack: Set<string>) => {
    if (done.has(n)) return;
    if (stack.has(n)) return; // cycle guard: insert anyway once
    stack.add(n);
    for (const d of deps.get(n) ?? []) visit(d, stack);
    stack.delete(n);
    done.add(n);
    order.push(n);
  };
  for (const m of models) visit(m.name, new Set());
  return order;
}

const BATCH = 400;
const w = async () => {
  const models: ModelDef[] = (pgModule.Prisma.dmmf.datamodel.models as ModelDef[]);
  const order = topoOrder(models);
  console.log(`models: ${models.length}; topo order computed`);
  const totals: Record<string, number> = {};
  let grand = 0;
  for (const name of order) {
    const s = (src as never as Record<string, { findMany: Function; count: Function }>)[name];
    const d = (dst as never as Record<string, { createMany: Function }>)[name];
    if (!s?.findMany || !d?.createMany) { console.log(`SKIP ${name} (no delegate)`); continue; }
    let rows: unknown[] = [];
    try { rows = await s.findMany(); } catch (e) { console.log(`ERR read ${name}: ${(e as Error).message.slice(0, 80)}`); continue; }
    if (rows.length === 0) { totals[name] = 0; continue; }
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        await d.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: false });
      }
      totals[name] = rows.length; grand += rows.length;
      if (rows.length >= 50) console.log(`${name}: ${rows.length} rows`);
    } catch (e) {
      console.log(`ERR write ${name} (${rows.length} rows): ${(e as Error).message.slice(0, 140)}`);
    }
  }
  // AuditEvent.seq is the only autoincrement: realign the Postgres sequence.
  try {
    const seqName = await dst.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"AuditEvent"','seq') AS s`);
    const s = (seqName as { s: string }[])[0]?.s;
    if (s) {
      const mx = await dst.auditEvent.aggregate({ _max: { seq: true } });
      await dst.$executeRawUnsafe(`SELECT setval('${s}', ${mx._max.seq ?? 1})`);
      console.log(`sequence ${s} -> ${mx._max.seq ?? 1}`);
    }
  } catch (e) { console.log(`sequence fixup skipped: ${(e as Error).message.slice(0, 100)}`); }
  console.log(`DONE grand total: ${grand} rows across ${Object.values(totals).filter((n) => n > 0).length} tables`);
  await src.$disconnect();
  await dst.$disconnect();
};
w();
