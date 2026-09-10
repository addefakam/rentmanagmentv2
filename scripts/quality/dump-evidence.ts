// dump-evidence.ts — Consolidate Phase 5 evidence into a JSON bundle for the
// Gate G5 report generator (single source of truth: matrix.ts + results.json
// + perf.json + live audit verdict).
import { readFileSync, writeFileSync } from "fs";

const results = JSON.parse(readFileSync("/home/z/my-project/src/lib/compliance/results.json", "utf-8"));
const perf = JSON.parse(readFileSync("/home/z/my-project/src/lib/compliance/perf.json", "utf-8"));

// matrix.ts is TypeScript — import it via bun's transpiler
const { COMPLIANCE_MATRIX, OPEN_ITEM_DISPOSITIONS } = await import("../../src/lib/compliance/matrix");
const { verifyAuditChain } = await import("../../src/lib/security/audit");
const { db } = await import("../../src/lib/db");

const audit = await verifyAuditChain();
const counts = {
  parties: await db.party.count(),
  properties: await db.property.count(),
  files: await db.registrationFile.count(),
  registered: await db.registrationFile.count({ where: { status: "REGISTERED" } }),
  payments: await db.payment.count(),
  complaints: await db.complaint.count(),
  penalties: await db.penaltyCase.count(),
  auditEvents: audit.events,
};

const matrix = COMPLIANCE_MATRIX.map((row) => {
  const outcomes = row.tests.map((t) => ({ test: t, result: results.byTest[t] ?? "NOT_RUN" }));
  const failed = outcomes.filter((o) => o.result === "fail").length;
  const notRun = outcomes.filter((o) => o.result === "NOT_RUN").length;
  return {
    id: row.id, source: row.source, rule: row.rule, module: row.module,
    kind: row.kind, tests: row.tests, openItem: row.openItem ?? null,
    status: failed > 0 ? "FAIL" : notRun > 0 ? "INCOMPLETE" : "PASS",
  };
});

const bundle = {
  generatedAt: new Date().toISOString(),
  battery: { totals: results.totals, at: results.generatedAt },
  perf,
  audit,
  counts,
  matrix,
  openItems: OPEN_ITEM_DISPOSITIONS,
  summary: {
    rows: matrix.length,
    pass: matrix.filter((m) => m.status === "PASS").length,
    fail: matrix.filter((m) => m.status === "FAIL").length,
    incomplete: matrix.filter((m) => m.status === "INCOMPLETE").length,
  },
};

writeFileSync("/home/z/my-project/scripts/p5_evidence.json", JSON.stringify(bundle, null, 2));
console.log(`evidence bundle: matrix ${bundle.summary.pass}/${bundle.summary.rows} pass, battery ${results.totals.pass}/${results.totals.pass + results.totals.fail}, audit intact=${audit.intact} (${audit.events} events)`);
