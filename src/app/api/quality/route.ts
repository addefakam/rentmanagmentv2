// /api/quality — Phase 5 testing evidence: compliance matrix with attached
// test results, audit chain verdict (live), performance results, RBAC and
// integration inventory, open item dispositions.
import { readFileSync } from "fs";
import { join } from "path";
import { ok, fail } from "@/lib/api";
import { COMPLIANCE_MATRIX, OPEN_ITEM_DISPOSITIONS } from "@/lib/compliance/matrix";
import { CAPABILITIES } from "@/lib/security/authz";
import { verifyAuditChain } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

function readJson<T>(rel: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), rel), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const results = readJson<{ generatedAt: string; totals: { pass: number; fail: number }; byTest: Record<string, "pass" | "fail"> }>(
      "src/lib/compliance/results.json",
      { generatedAt: "", totals: { pass: 0, fail: 0 }, byTest: {} },
    );
    const perf = readJson<{ generatedAt: string; nfrTargets: Record<string, number>; profiles: Record<string, unknown>[] }>(
      "src/lib/compliance/perf.json",
      { generatedAt: "", nfrTargets: {}, profiles: [] },
    );

    const matrix = COMPLIANCE_MATRIX.map((row) => {
      const outcomes = row.tests.map((t) => ({ test: t, result: results.byTest[t] ?? "NOT_RUN" }));
      const failed = outcomes.filter((o) => o.result === "fail").length;
      const notRun = outcomes.filter((o) => o.result === "NOT_RUN").length;
      return {
        ...row,
        outcomes,
        status: failed > 0 ? "FAIL" : notRun > 0 ? "INCOMPLETE" : "PASS",
      };
    });

    const summary = {
      rows: matrix.length,
      pass: matrix.filter((m) => m.status === "PASS").length,
      fail: matrix.filter((m) => m.status === "FAIL").length,
      incomplete: matrix.filter((m) => m.status === "INCOMPLETE").length,
      testTotals: results.totals,
      testsGeneratedAt: results.generatedAt,
    };

    const audit = await verifyAuditChain();

    return ok({
      summary,
      matrix,
      openItems: OPEN_ITEM_DISPOSITIONS,
      audit,
      perf,
      capabilities: Object.entries(CAPABILITIES).map(([capability, roles]) => ({ capability, roles })),
      integration: {
        payment: { provider: "MOCK-BANK-SANDBOX", modes: ["NORMAL", "DECLINE", "TIMEOUT"], production: "binds at procurement (open item O3)" },
        identity: { provider: "MOCK-ID-SANDBOX", modes: ["NORMAL", "NO_MATCH", "TIMEOUT"], production: "Fayda national digital ID binding at UAT" },
      },
    });
  } catch (err) { return fail(err); }
}
