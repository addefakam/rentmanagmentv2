// ============================================================================
// e2e-g9.ts — Phase 8 Part B end-to-end walkthrough over the HTTP API layer
// (plan activities A-42..A-48; Gate G9 package). Rehearses the operational
// record live: the shipped operations payload under the executed go-live
// order, capability separations on the operations actions, hypercare
// discipline, the annual cycle immutability, referral lifecycle, Ministry
// feed immutability, PIR and closure-minute actions with the owner's G9
// signature drill. Restores the shipped state by reseeding.
// Run: bun scripts/e2e-g9.ts   (dev server on :3000, seeded database)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

async function api(path: string, method: string, payload?: unknown, opts?: { actor?: string; token?: string }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.actor) headers["x-staff-code"] = opts.actor;
  if (opts?.token) headers["authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: payload ? JSON.stringify(payload) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, json };
}

let pass = 0;
function step(name: string, assert?: () => void) {
  if (assert) assert();
  pass++;
  console.log(`  ✓ ${name}`);
}
function expectThrow(name: string, cond: boolean, detail?: string) {
  if (!cond) throw new Error(`E2E expectation failed: ${name}${detail ? ` - ${detail}` : ""}`);
  pass++;
  console.log(`  ✓ ${name}`);
}

async function main() {
  console.log("G9-A · Operations payload under the executed go-live order");
  const boot = await api("/api/phase8", "GET");
  expectThrow("phase8 payload loads with the operations summary", boot.json.ok === true && !!boot.json.data.operations);
  const ops = boot.json.data.operations;
  expectThrow("Wave 1 live under the owner's G8 order", boot.json.data.waves[1].status === "LIVE" && boot.json.data.waves[1].goLiveOrderRef === "GATE-G8-2026-09-10");
  expectThrow("hypercare 28/28 daily reports with zero severity-one and 96.4% SLA",
    ops.hypercare.daysLogged === 28 && ops.hypercare.daysPlanned === 28 && ops.hypercare.sev1 === 0 && ops.hypercare.slaPct >= 96);
  expectThrow("first annual cycle recorded end to end (study, publication, effect, amendment wave)",
    ops.annualCycle.length === 4 && ["STUDY", "PUBLICATION", "EFFECT", "AMENDMENT_WAVE"].every((s) => ops.annualCycle.some((x: { step: string }) => x.step === s)));
  expectThrow("2026 rate set EFFECTIVE with June 1 / June 30 anchoring",
    (boot.json.data.operations.annualCycle.find((x: { step: string }) => x.step === "EFFECT")).executedAt.startsWith("2026-06-30"));
  expectThrow("enforcement referrals operating: 4 referred, some concluded, some live",
    ops.referrals.length === 4
    && ops.referrals.some((r: { status: string }) => ["RESOLVED", "RECOVERED", "CLOSED"].includes(r.status))
    && ops.referrals.some((r: { status: string }) => ["REFERRED", "ACKNOWLEDGED", "IN_PROCEEDING"].includes(r.status)));
  expectThrow("Ministry feed published for three periods, hash-verified",
    ops.feeds.length === 3 && ops.feeds.every((f: { hash: string }) => f.hash.length === 64));
  expectThrow("hypercare closed with the signed operations handover (manual v1.1)",
    ops.handover?.status === "SIGNED" && ops.handover?.manualVersion === "OPS-MANUAL-v1.1");
  expectThrow("ninety-day PIR conducted with dispositioned findings",
    !!ops.pir && ops.pir.findings.length === 6 && ops.pir.findings.every((f: { disposition: string }) => ["BACKLOG", "ACCEPTED", "HANDOVER"].includes(f.disposition)));
  expectThrow("closure minute DRAFT with lessons recorded; G9 check green",
    ops.minute?.status === "DRAFT" && JSON.parse(ops.minute.lessonsJson).length >= 5 && ops.g9.ready === true);

  console.log("G9-B · Capability separations on the operations actions");
  const deniedLog = await api("/api/phase8", "POST", { kind: "hypercare-log", waveCode: "WAVE-1", dayNumber: 1 }, { actor: "STF-0001" });
  expectThrow("registrar cannot log hypercare days (403)", deniedLog.status === 403);
  const deniedOps = await api("/api/phase8", "POST", { kind: "cycle-operate", cycleYear: 2027, percentage: 5, studyRef: "x" }, { actor: "STF-0007" });
  expectThrow("ministry analyst cannot operate the annual cycle (403)", deniedOps.status === 403);
  const deniedSign = await api("/api/phase8", "POST", { kind: "minute-sign", reference: "CM-P8-G9-01", g9Ref: "X" }, { actor: "STF-0004" });
  expectThrow("bureau analyst cannot sign the closure minute (403)", deniedSign.status === 403);

  console.log("G9-C · Operational discipline over the live API");
  const closedLog = await api("/api/phase8", "POST", { kind: "hypercare-log", waveCode: "WAVE-1", dayNumber: 29, ticketsOpened: 1, ticketsClosed: 1 }, { actor: "STF-0005" });
  expectThrow("further hypercare reports refused on the closed schedule (422)",
    closedLog.status === 422 && closedLog.json.error.includes("closed"));
  const dupCycle = await api("/api/phase8", "POST", { kind: "cycle-operate", cycleYear: 2026, percentage: 8, studyRef: "dup" }, { actor: "STF-0005" });
  expectThrow("re-operating the recorded 2026 cycle refused (422 Proc. Art. 8)",
    dupCycle.status === 422 && dupCycle.json.rule.includes("Proc. Art. 8"));
  const dupFeed = await api("/api/phase8", "POST", { kind: "feed-publish", period: ops.feeds[0].period }, { actor: "STF-0007" });
  expectThrow("duplicate Ministry feed period refused (422)", dupFeed.status === 422 && dupFeed.json.error.includes("already published"));
  const badTransition = await api("/api/phase8", "POST", { kind: "referral-outcome", reference: ops.referrals[0].reference, status: "RECOVERED" }, { actor: "STF-0005" });
  expectThrow("invalid referral transition refused (422 Dir. Art. 22)", badTransition.status === 422 && badTransition.json.rule.includes("Dir. Art. 22"));

  console.log("G9-D · Referral lifecycle and the owner's G9 signature drill");
  const ref = await api("/api/phase8", "POST", {
    kind: "referral-create", offenseCode: "PEN-NOTICELESS-TERM", subjectType: "OTHER",
    subjectRef: "E2E/001", monthlyRentRef: 11000, referralKind: "COURT_RECOVERY",
    subject: "E2E referral: termination without statutory notice",
    competentBody: "COURT", basisRef: "Dir. Art. 22; Proc. Art. 17",
  }, { actor: "STF-0005" });
  expectThrow("referral created through the real penalty flow (3-month ladder value)",
    ref.json.ok === true && ref.json.data.amount === 33000 && !!ref.json.data.penaltyCaseId);
  const refRef: string = ref.json.data.reference;
  const ack = await api("/api/phase8", "POST", { kind: "referral-outcome", reference: refRef, status: "ACKNOWLEDGED", outcomeRef: "E2E-ACK" }, { actor: "STF-0005" });
  expectThrow("court acknowledges the referral", ack.json.ok === true && ack.json.data.status === "ACKNOWLEDGED");
  const proceeding = await api("/api/phase8", "POST", { kind: "referral-outcome", reference: refRef, status: "IN_PROCEEDING", outcomeRef: "E2E-DOCKET" }, { actor: "STF-0005" });
  expectThrow("case enters proceedings at the court", proceeding.json.ok === true && proceeding.json.data.status === "IN_PROCEEDING");
  const order = await api("/api/phase8", "POST", { kind: "referral-outcome", reference: refRef, status: "RECOVERY_ORDERED", outcomeRef: "E2E-ORDER" }, { actor: "STF-0005" });
  expectThrow("recovery order accepted from the court", order.json.ok === true && order.json.data.status === "RECOVERY_ORDERED");
  const recovered = await api("/api/phase8", "POST", { kind: "referral-outcome", reference: refRef, status: "RECOVERED", outcomeRef: "E2E-EXEC", recovered: 33000 }, { actor: "STF-0005" });
  expectThrow("recovery executed at the assessed amount", recovered.json.ok === true && recovered.json.data.recovered === 33000);

  const dupMinute = await api("/api/phase8", "POST", {
    kind: "minute-draft", reference: "CM-P8-G9-01", lessons: ["a", "b", "c", "d", "e"],
    transitions: ["t"], openItems: ["o"],
  }, { actor: "STF-0005" });
  expectThrow("duplicate closure minute refused (422 Plan A-48)", dupMinute.status === 422 && dupMinute.json.rule.includes("Plan A-48"));
  const noG9Ref = await api("/api/phase8", "POST", { kind: "minute-sign", reference: "CM-P8-G9-01", g9Ref: "  " }, { actor: "STF-0005" });
  expectThrow("closure signature without the owner's written reference refused (422 Gate G9)",
    noG9Ref.status === 422 && noG9Ref.json.rule.includes("Gate G9"));
  const sign = await api("/api/phase8", "POST", { kind: "minute-sign", reference: "CM-P8-G9-01", g9Ref: "DRILL-G9-E2E", signedBy: "Owner (e2e drill)" }, { actor: "STF-0005" });
  expectThrow("owner signs the closure minute under the drill G9 reference", sign.json.ok === true && sign.json.data.status === "SIGNED");
  const afterSign = await api("/api/phase8", "GET");
  expectThrow("G9 check still green with the minute signed", afterSign.json.data.operations.g9.ready === true);

  console.log("G9-E · Restore the shipped state");
  const { runSeed } = await import("../prisma/seed");
  await runSeed();
  step("database reseeded to the shipped operational state");
  const restored = await api("/api/phase8", "GET");
  const r = restored.json.data.operations;
  expectThrow("shipped state restored: minute DRAFT, G9 READY, hypercare 28/28",
    r.minute.status === "DRAFT" && r.g9.ready === true && r.hypercare.daysLogged === 28 && r.referrals.length === 4);

  console.log(`\nE2E-G9 RESULT: ${pass} checks passed, 0 failed`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("E2E-G9 FAILED:", err);
  const { runSeed } = await import("../prisma/seed");
  await runSeed().catch(() => undefined);
  console.error("database reseeded to the shipped state after the failure");
  await prisma.$disconnect();
  process.exit(1);
});
