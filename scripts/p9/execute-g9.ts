// ============================================================================
// execute-g9.ts — Executes the owner's Gate G9 decision over the live HTTP
// API layer and captures the closure evidence bundle.
//
// The owner's decision ("approve" on the Gate G9 package) signs closure
// minute CM-P8-G9-01 under the written decision reference GATE-G9-2026-09-11
// (convention: GATE-G7-2026-09-10, GATE-G8-2026-09-10). On success the
// platform freezes the closure state: the minute moves DRAFT -> SIGNED, the
// signed record + post-closure g9Check + audit chain are dumped to
// scripts/g9_closure_evidence.json.
//
// Run: bun scripts/p9/execute-g9.ts   (dev server on :3000, seeded database)
// ============================================================================

import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

const G9_REF = "GATE-G9-2026-09-11";
const MINUTE = "CM-P8-G9-01";
const SIGNED_BY = "Owner";

async function api(path: string, method: string, payload?: unknown, actor?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (actor) headers["x-staff-code"] = actor;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: payload ? JSON.stringify(payload) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, json };
}

function fail(msg: string): never {
  console.error(`EXECUTE-G9 FAILED: ${msg}`);
  process.exit(1);
}

const w = async () => {
  // -- 1. Pre-decision state ------------------------------------------------
  const pre = await api("/api/phase8", "GET");
  if (!pre.json?.ok) fail("operations summary unavailable");
  const preMinute = pre.json.data.operations?.minute;
  if (preMinute?.reference !== MINUTE || !["DRAFT", "SIGNED"].includes(preMinute?.status ?? ""))
    fail(`minute ${preMinute?.reference}/${preMinute?.status} is not the closure minute`);
  console.log(`pre: ${preMinute.reference} ${preMinute.status}, lessons=${JSON.parse(preMinute.lessonsJson).length}`);

  // -- 2. The owner's Gate G9 decision (idempotent: skips if already executed) --
  const alreadySigned = preMinute.status === "SIGNED" && preMinute.g9Ref === G9_REF;
  if (!alreadySigned) {
    const sign = await api("/api/phase8", "POST",
      { kind: "minute-sign", reference: MINUTE, g9Ref: G9_REF, signedBy: SIGNED_BY },
      "STF-0005");
    if (!sign.json?.ok) fail(`signature refused: ${JSON.stringify(sign.json)}`);
    console.log(`decision executed: ${sign.json.data?.summary ?? "minute signed"}`);
  } else {
    console.log("decision already executed earlier — proceeding to verification");
  }

  // -- 3. Post-closure verification ------------------------------------------
  const post = await api("/api/phase8", "GET");
  const minute = post.json.data.operations?.minute;
  if (minute?.reference !== MINUTE || minute?.status !== "SIGNED" || minute?.g9Ref !== G9_REF)
    fail("post-closure minute state incorrect");
  console.log(`post: ${minute.reference} ${minute.status} g9Ref=${minute.g9Ref} signedBy=${minute.signedBy} at=${minute.signedAt}`);

  // Double-sign refusal proves the freeze.
  const reSign = await api("/api/phase8", "POST",
    { kind: "minute-sign", reference: MINUTE, g9Ref: G9_REF, signedBy: SIGNED_BY }, "STF-0005");
  if (reSign.json?.ok) fail("minute accepted a second signature — closure NOT frozen");
  console.log(`freeze proven: re-signature refused (${reSign.json?.error ?? "refused"})`);

  // -- 4. Evidence bundle ----------------------------------------------------
  const { g9Check, operationsSummary } = await import("../../src/lib/domain/operations");
  const { verifyAuditChain } = await import("../../src/lib/security/audit");
  const g9 = await g9Check();
  const chain = await verifyAuditChain();
  if (!chain.intact) fail(`audit chain broken after closure: ${chain.detail ?? ""}`);
  const ops = await operationsSummary();
  const waves = await prisma.goLiveWave.findMany({ orderBy: { plannedOrder: "asc" } });

  const bundle = {
    capturedAt: new Date().toISOString(),
    decision: {
      gate: "G9",
      decisionRef: G9_REF,
      decidedBy: SIGNED_BY,
      decidedAt: minute.signedAt,
      channel: "Owner decision on the Gate G9 Closure Report (download/Rent_Control_System_Gate_G9_Closure_Report.docx)",
      minute: {
        reference: minute.reference,
        status: minute.status,
        g9Ref: minute.g9Ref,
        signedBy: minute.signedBy,
        signedAt: minute.signedAt,
        lessons: JSON.parse(minute.lessonsJson ?? "[]"),
        transitions: JSON.parse(minute.transitionsJson ?? "[]"),
        openItems: JSON.parse(minute.openItemsJson ?? "[]"),
      },
    },
    postClosureG9Check: g9.checks.map((c) => ({ criterion: c.criterion, basis: c.basis, pass: c.pass, detail: c.detail })),
    auditChain: chain,
    operationsSnapshot: {
      waves: waves.map((x) => ({ code: x.code, status: x.status, order: x.goLiveOrderRef })),
      hypercare: ops.hypercare,
      annualCycle: ops.annualCycle,
      referrals: ops.referrals,
      feeds: ops.feeds,
      handover: ops.handover ? { reference: ops.handover.reference, manualVersion: ops.handover.manualVersion, runbook: ops.handover.runbookRef, status: ops.handover.status } : null,
      pir: ops.pir ? { reference: ops.pir.reference, findings: ops.pir.findings.length } : null,
    },
    freezeProof: { resignAttempt: "refused", error: reSign.json?.error ?? "refused" },
  };
  writeFileSync("/home/z/my-project/scripts/g9_closure_evidence.json", JSON.stringify(bundle, null, 2));
  console.log(`evidence: scripts/g9_closure_evidence.json (${g9.checks.filter((c) => c.pass).length}/${g9.checks.length} G9 checks pass, audit chain ${chain.intact ? "INTACT" : "BROKEN"})`);
  await prisma.$disconnect();
};
w();
