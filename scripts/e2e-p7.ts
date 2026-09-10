// ============================================================================
// e2e-p7.ts — Phase 7 end-to-end walkthrough over the HTTP API layer.
// Rehearses the plan §5.8 activities live: a new legacy book row enters and
// migrates with the Dir. Art. 8(2) annotation, reconciliation rebalances,
// training records a competence result, the pilot accepts a day log and the
// exit check stays green, awareness approval flows with its refusals. RBAC is
// exercised with the acting officers' staff codes; negative gates included.
// Restores the shipped demonstration state by reseeding at the end.
// Run: bun scripts/e2e-p7.ts   (dev server on :3000, seeded database)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

async function api(path: string, method: string, payload?: unknown, actor?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-staff-code": actor ?? "STF-0001" },
    body: payload ? JSON.stringify(payload) : undefined,
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
  console.log("P7-A · Legacy migration intake (Dir. Art. 8(2))");
  const before = await api("/api/phase7", "GET");
  expectThrow("phase7 evidence payload loads", before.json.ok === true);
  const p7 = before.json.data;
  const w6 = await prisma.orgUnit.findUnique({ where: { code: "AA-BOLE-W06" } });
  const baselineBooks = p7.books.length;

  const entry = await prisma.legacyBookEntry.create({
    data: {
      woredaId: w6!.id, bookRef: "BL-W6-RB-E2E", pageNo: 1, entryNo: 1,
      landlordName: "E2E Landlord", tenantName: "E2E Tenant",
      houseAddress: "Keble 02, House 9, Bole W06",
      monthlyRent: 9600, contractDate: new Date("2022-04-04"),
      leaseStart: new Date("2022-05-01"), leaseYears: 1, // short legacy term
      scanAttached: true,
    },
  });
  step(`legacy book row created in AA-BOLE-W06 (${entry.bookRef})`);

  const denied = await api("/api/phase7", "POST", { kind: "migrate", woredaId: w6!.id }, "STF-0002");
  expectThrow("stamper cannot run migration (403 role separation)", denied.status === 403);

  const mig = await api("/api/phase7", "POST", { kind: "migrate", woredaId: w6!.id }, "STF-0001");
  expectThrow("registrar migrates the row through the live API", mig.json.ok === true && mig.json.data.migrated === 1);
  const rec = await prisma.migrationRecord.findUnique({
    where: { legacyEntryId: entry.id }, include: { file: true },
  });
  expectThrow("file registered with LEGACY_ART7 annotation despite 1-year legacy term",
    rec?.file.status === "REGISTERED" && rec.file.isLegacy === true);
  const ann = await prisma.fileAnnotation.findFirst({ where: { fileId: rec!.fileId } });
  expectThrow("Dir. Art. 8(2) annotation recorded", ann?.code === "LEGACY_ART7");

  console.log("P7-B · Reconciliation (Dir. Art. 13)");
  const rec2 = await api("/api/phase7", "POST", { kind: "reconcile" }, "STF-0003");
  expectThrow("sub-city monitor reconciles all book woredas", rec2.json.ok === true && Array.isArray(rec2.json.data) && rec2.json.data.length >= 3);
  const w6report = (rec2.json.data as { woredaId: string; balanced: boolean; bookCount: number }[]).find((r) => r.woredaId === w6!.id);
  expectThrow("W06 balances at 1 book row = 1 migrated", w6report?.balanced === true && w6report.bookCount === 1);

  console.log("P7-C · Training records");
  const deniedTrainer = await api("/api/phase7", "POST", { kind: "training-session", courseCode: "TRN-W1", trainer: "X", orgUnitId: w6!.id, venue: "V" }, "STF-0001");
  expectThrow("registrar cannot record training (403)", deniedTrainer.status === 403);
  const bureauId = (await prisma.orgUnit.findUnique({ where: { code: "AA-BUREAU" } }))!;
  const session = await api("/api/phase7", "POST", {
    kind: "training-session", courseCode: "TRN-W1", trainer: "E2E Trainer",
    orgUnitId: bureauId.id, venue: "E2E room",
  }, "STF-0008");
  expectThrow("system admin records a session", session.json.ok === true);
  const trainee = await api("/api/phase7", "POST", {
    kind: "trainee", sessionId: session.json.data.id, name: "E2E Trainee",
    roleCode: "WOREDA_REGISTRAR", attendance: "PRESENT", assessmentScore: 55,
  }, "STF-0008");
  expectThrow("score 55 -> NEEDS_SUPPORT (threshold 70)", trainee.json.data.competence === "NEEDS_SUPPORT");

  console.log("P7-D · Pilot day log and exit check");
  const dayDenied = await api("/api/phase7", "POST", {
    kind: "pilot-day", woredaCode: "AA-YEKA-W01", filesOpened: 1, filesRegistered: 1,
    avgCycleMinutes: 40, checklistCompliancePct: 100, replicationCorrect: true,
  }, "STF-0005");
  expectThrow("day log refused for a non-pilot woreda (422 plan 5.8)", dayDenied.status === 422);
  const day = await api("/api/phase7", "POST", {
    kind: "pilot-day", woredaCode: "AA-BOLE-W01", filesOpened: 3, filesRegistered: 3,
    avgCycleMinutes: 36, checklistCompliancePct: 100, replicationCorrect: true,
    supportNotes: "E2E support visit",
  }, "STF-0005");
  expectThrow("bureau head logs pilot day 36-minute cycle", day.json.ok === true && day.json.data.avgCycleMinutes === 36);

  console.log("P7-E · Awareness materials (Proc. Arts. 14, 16)");
  const badItem = await api("/api/phase7", "POST", {
    kind: "awareness-create", basis: "Proc. Art. 16", channel: "POSTER",
    titleEn: "Only English", titleAm: "", titleOm: "", bodyEn: "x",
  }, "STF-0007");
  expectThrow("monolingual material refused (CR-01/NFR-06 422)", badItem.status === 422);
  const noRef = await api("/api/phase7", "POST", {
    kind: "awareness-approve", id: p7.awareness[0].id, ownerApprovalRef: "",
  }, "STF-0007");
  expectThrow("approval without the owner's reference refused (422)", noRef.status === 422);
  const approve = await api("/api/phase7", "POST", {
    kind: "awareness-approve", id: p7.awareness[0].id, ownerApprovalRef: "G7-E2E-REF",
  }, "STF-0007");
  expectThrow("ministry analyst approves with owner reference", approve.json.ok === true && approve.json.data.status === "APPROVED");

  console.log("P7-F · Restore shipped demonstration state");
  const exit = await api("/api/phase7", "GET");
  expectThrow("exit payload readable before restore", exit.json.ok === true);

  // Remove E2E artifacts, then reseed for a pristine shipped state.
  const parties = await prisma.party.findMany({ where: { idNumber: { startsWith: "LEG-BL-W6-RB-E2E" } } });
  await prisma.partyDocument.deleteMany({ where: { partyId: { in: parties.map((p) => p.id) } } });
  await prisma.migrationRecord.delete({ where: { legacyEntryId: entry.id } });
  await prisma.legacyBookEntry.delete({ where: { id: entry.id } });
  await prisma.reconciliationReport.deleteMany({ where: { woredaId: w6!.id } });
  await prisma.deadlineTrack.deleteMany({ where: { subjectRef: rec!.file.fileNumber } });
  await prisma.registryBookEntry.deleteMany({ where: { fileId: rec!.fileId } });
  await prisma.replicationLog.deleteMany({ where: { recordRef: rec!.file.fileNumber } });
  await prisma.fileAnnotation.deleteMany({ where: { fileId: rec!.fileId } });
  await prisma.registrationChecklistItem.deleteMany({ where: { fileId: rec!.fileId } });
  await prisma.contractWitness.deleteMany({ where: { fileId: rec!.fileId } });
  await prisma.registrationFile.delete({ where: { id: rec!.fileId } });
  await prisma.property.delete({ where: { id: rec!.propertyId } });
  await prisma.party.deleteMany({ where: { idNumber: { startsWith: "LEG-BL-W6-RB-E2E" } } });
  await prisma.traineeRecord.deleteMany({ where: { sessionId: session.json.data.id } });
  await prisma.trainingSession.delete({ where: { id: session.json.data.id } });
  await prisma.pilotDayLog.delete({ where: { id: day.json.data.id } });
  await prisma.awarenessItem.update({ where: { id: p7.awareness[0].id }, data: { status: "PENDING_OWNER_APPROVAL", ownerApprovalRef: null } });
  step("E2E artifacts removed");

  const { runSeed } = await import("../prisma/seed");
  await runSeed();
  step("database reseeded to the shipped demonstration state");

  const after = await api("/api/phase7", "GET");
  const a = after.json.data;
  expectThrow("shipped state restored: 28 books / 28 migrated / exit READY",
    a.books.length === 28 && a.migrations.length === 28 && a.exit.ready === true);

  console.log(`\nE2E-P7 RESULT: ${pass} checks passed, 0 failed`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("E2E-P7 FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
