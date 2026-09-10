// ============================================================================
// tests/phase7.test.ts — Phase 7 domain tests: legacy migration (Proc. Art. 7;
// Dir. Art. 8(2)), reconciliation (Dir. Art. 13), training competence, pilot
// operation and exit check, trilingual awareness materials. Runs against the
// live seeded database (run `bun prisma/seed.ts` first).
// Run: bun test tests/
// ============================================================================

import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { validateLease } from "../src/lib/domain/law";
import {
  migrateLegacyWoreda, reconcileAllMigrated, reconcileWoreda,
  createTrainingSession, addTrainee, openPilot, logPilotDay,
  pilotExitCheck, createAwarenessItem, approveAwarenessItem,
  COMPETENCE_THRESHOLD, PILOT_TRAINING_ROLES,
} from "../src/lib/domain/phase7";
import { LegalError } from "../src/lib/domain/service";

const prisma = new PrismaClient();

function expectLegalError(fn: () => Promise<unknown>, rulePart: string) {
  return async () => {
    try {
      await fn();
      throw new Error(`Expected LegalError citing ${rulePart} - no error thrown`);
    } catch (err) {
      expect(err).toBeInstanceOf(LegalError);
      expect((err as LegalError).rule).toContain(rulePart);
    }
  };
}

describe("Phase 7 seed state: migration shipped reconciled", () => {
  it("seeded 28 legacy book rows across the three pilot woredas", async () => {
    const books = await prisma.legacyBookEntry.count();
    expect(books).toBe(28);
    const codes = await prisma.orgUnit.findMany({
      where: { legacyBookEntries: { some: {} } }, select: { code: true },
    });
    expect(codes.map((c) => c.code).sort()).toEqual(["AA-BOLE-W01", "AA-BOLE-W02", "AA-BOLE-W03"]);
  });

  it("migrated every book row into a registered legacy file with the Art. 8(2) annotation", async () => {
    const recs = await prisma.migrationRecord.findMany({ include: { file: true } });
    const registered = recs.filter((r) => r.file.status === "REGISTERED").length;
    expect(recs.length).toBe(28);
    expect(registered).toBe(28);
    const annotations = await prisma.fileAnnotation.count({ where: { code: "LEGACY_ART7" } });
    expect(annotations).toBeGreaterThanOrEqual(28);
  });

  it("every migrated file carries the legacy checklist equivalence and closed 30+3 clock", async () => {
    const files = await prisma.registrationFile.findMany({
      where: { isLegacy: true }, include: { checklist: true }, take: 5,
    });
    for (const f of files) {
      expect(f.checklist.length).toBe(9);
      const cl4 = f.checklist.find((c) => c.orderNo === 4)!;
      expect(cl4.passed).toBe(true);
      expect(cl4.note).toContain("Legacy term recorded as-is");
    }
    // Relational assertion: every REGISTERED file produced by the migration
    // register has its 30+3 clock closed. (Compliance-suite fixtures create
    // their own legacy clocks, so the absolute count is state-dependent.)
    const recs = await prisma.migrationRecord.findMany({ include: { file: true } });
    const clocks = await prisma.deadlineTrack.findMany({ where: { code: "LEGACY-33D" }, select: { subjectRef: true, status: true } });
    const metRefs = new Set(clocks.filter((c) => c.status === "MET").map((c) => c.subjectRef));
    for (const r of recs) {
      if (r.file.status === "REGISTERED") expect(metRefs.has(r.file.fileNumber)).toBe(true);
    }
  });

  it("reconciliation balances in every woreda with a legacy book (Dir. Art. 13)", async () => {
    const reports = await reconcileAllMigrated();
    expect(reports.length).toBe(3);
    for (const r of reports) {
      expect(r.balanced).toBe(true);
      expect(r.variance).toBe(0);
      expect(r.bookCount).toBe(r.platformCount);
    }
  });
});

describe("Legacy migration legal boundaries", () => {
  it("accepts a short legacy term with the annotation (Dir. Art. 8(2) bypass of Proc. Art. 6)", async () => {
    const woreda = await prisma.orgUnit.findUnique({ where: { code: "AA-BOLE-W04" } });
    expect(woreda).toBeTruthy();
    const entry = await prisma.legacyBookEntry.create({
      data: {
        woredaId: woreda!.id, bookRef: "BL-W4-RB-TEST", pageNo: 1, entryNo: 1,
        landlordName: "Test Landlord", tenantName: "Test Tenant",
        houseAddress: "Keble 01, House 1, Bole W04",
        monthlyRent: 9000, contractDate: new Date("2022-01-10"),
        leaseStart: new Date("2022-02-01"), leaseYears: 1, // shorter than Art. 6 minimum
        scanAttached: true,
      },
    });
    const res = await migrateLegacyWoreda(woreda!.id, "STF-0001");
    expect(res.migrated).toBe(1);
    const rec = await prisma.migrationRecord.findUnique({ where: { legacyEntryId: entry.id } });
    const file = await prisma.registrationFile.findUnique({ where: { id: rec!.fileId } });
    expect(file!.isLegacy).toBe(true);
    expect(file!.status).toBe("REGISTERED");
    const ann = await prisma.fileAnnotation.findFirst({ where: { fileId: file!.id } });
    expect(ann!.code).toBe("LEGACY_ART7");
    // cleanup so the seeded balanced state is restored (children before parents)
    const parties = await prisma.party.findMany({ where: { idNumber: { startsWith: "LEG-BL-W4-RB-TEST" } } });
    await prisma.partyDocument.deleteMany({ where: { partyId: { in: parties.map((p) => p.id) } } });
    await prisma.migrationRecord.delete({ where: { legacyEntryId: entry.id } });
    await prisma.legacyBookEntry.delete({ where: { id: entry.id } });
    await prisma.reconciliationReport.deleteMany({ where: { woredaId: woreda!.id } });
    await prisma.deadlineTrack.deleteMany({ where: { subjectRef: file!.fileNumber } });
    await prisma.registryBookEntry.deleteMany({ where: { fileId: file!.id } });
    await prisma.replicationLog.deleteMany({ where: { recordRef: file!.fileNumber } });
    await prisma.fileAnnotation.deleteMany({ where: { fileId: file!.id } });
    await prisma.registrationChecklistItem.deleteMany({ where: { fileId: file!.id } });
    await prisma.contractWitness.deleteMany({ where: { fileId: file!.id } });
    await prisma.registrationFile.delete({ where: { id: file!.id } });
    await prisma.property.delete({ where: { id: (file as { propertyId: string }).propertyId } });
    await prisma.party.deleteMany({ where: { idNumber: { startsWith: "LEG-BL-W4-RB-TEST" } } });
  });

  it("keeps the Proc. Art. 6 minimum-term rule for new filings (bypass is legacy-only)", () => {
    // The Art. 6 refusal for new files is exercised end to end by the Phase 5
    // compliance suite (TC-P06) and the Phase 6 battery (UAT-02 step 1); here
    // the pure rule is re-asserted so the legacy bypass cannot silently widen.
    const short = validateLease({
      leaseStart: new Date("2026-01-01"), leaseEnd: new Date("2026-12-31"),
      monthlyRent: 10000, prepaymentMonths: 0, paymentMethodConfirmed: true,
    });
    expect(short.ok).toBe(false);
    expect(short.rule).toBe("Proc. Art. 6");
    const twoYear = validateLease({
      leaseStart: new Date("2026-01-01"), leaseEnd: new Date("2028-01-02"),
      monthlyRent: 10000, prepaymentMonths: 0, paymentMethodConfirmed: true,
    });
    expect(twoYear.ok).toBe(true);
  });

  it("refuses migration without a scanned source document (Dir. Arts. 7, 8(2))", async () => {
    const woreda = await prisma.orgUnit.findUnique({ where: { code: "AA-BOLE-W05" } });
    await prisma.legacyBookEntry.create({
      data: {
        woredaId: woreda!.id, bookRef: "BL-W5-RB-TEST", pageNo: 1, entryNo: 1,
        landlordName: "No Scan", tenantName: "No Scan Tenant",
        houseAddress: "Keble 01, House 2, Bole W05",
        monthlyRent: 8000, contractDate: new Date("2022-01-10"),
        leaseStart: new Date("2022-02-01"), leaseYears: 2,
        scanAttached: false,
      },
    });
    await expectLegalError(
      () => migrateLegacyWoreda(woreda!.id, "STF-0001"),
      "Dir. Arts. 7, 8(2)",
    )();
    await prisma.legacyBookEntry.deleteMany({ where: { bookRef: "BL-W5-RB-TEST" } });
  });
});

describe("Reconciliation detects variance", () => {
  it("reports unbalanced when the platform misses a book row", async () => {
    const woreda = await prisma.orgUnit.findUnique({ where: { code: "AA-BOLE-W06" } });
    await prisma.legacyBookEntry.create({
      data: {
        woredaId: woreda!.id, bookRef: "BL-W6-RB-TEST", pageNo: 1, entryNo: 1,
        landlordName: "Unmigrated Row", tenantName: "Tenant",
        houseAddress: "Keble 01, House 3, Bole W06",
        monthlyRent: 8000, contractDate: new Date("2022-01-10"),
        leaseStart: new Date("2022-02-01"), leaseYears: 2, scanAttached: true,
      },
    });
    const report = await reconcileWoreda(woreda!.id);
    expect(report.balanced).toBe(false);
    expect(report.variance).toBe(1);
    // cleanup
    await prisma.legacyBookEntry.deleteMany({ where: { bookRef: "BL-W6-RB-TEST" } });
    await prisma.reconciliationReport.deleteMany({ where: { woredaId: woreda!.id } });
  });
});

describe("Training records (plan 5.8)", () => {
  it("threshold logic marks >= 70 as COMPETENT and absent trainees never competent", async () => {
    expect(COMPETENCE_THRESHOLD).toBe(70);
    const absent = await prisma.traineeRecord.count({
      where: { attendance: "ABSENT", competence: "COMPETENT" },
    });
    expect(absent).toBe(0);
  });

  it("all pilot-critical roles hold a competent trainee record", async () => {
    const competent = await prisma.traineeRecord.findMany({
      where: { competence: "COMPETENT", attendance: "PRESENT" }, select: { roleCode: true }, distinct: ["roleCode"],
    });
    const roles = new Set(competent.map((c) => c.roleCode));
    for (const r of PILOT_TRAINING_ROLES) expect(roles.has(r)).toBe(true);
  });

  it("createTrainingSession refuses an unknown course", async () => {
    const org = (await prisma.orgUnit.findFirst({ where: { code: "AA-BUREAU" } }))!;
    await expectLegalError(
      () => createTrainingSession({ courseCode: "TRN-NONE", heldAt: new Date(), trainer: "T", orgUnitId: org.id, venue: "V" }),
      "Plan 5.8",
    )();
  });
});

describe("Pilot operation and exit check (plan 5.8 / Gate G7)", () => {
  it("one active pilot exists with the G6 authorization reference", async () => {
    const pilot = await prisma.pilotConfig.findFirst({ where: { active: true } });
    expect(pilot).toBeTruthy();
    expect(pilot!.ownerApprovalRef).toContain("G6");
    expect(pilot!.woredaCodes.split(",")).toEqual(["AA-BOLE-W01", "AA-BOLE-W02", "AA-BOLE-W03"]);
  });

  it("pilot exit check passes: no SEV1, reconciliation balanced, replication 100%", async () => {
    const exit = await pilotExitCheck();
    expect(exit.ready).toBe(true);
    for (const c of exit.checks) {
      if (!c.pass) throw new Error(`Exit check failed: ${c.criterion} - ${c.detail}`);
    }
    expect(exit.metrics.sev1Count).toBe(0);
    expect(exit.metrics.balancedWoredas).toBe(3);
    expect(exit.metrics.replicationCorrectPct).toBe(100);
    expect(exit.metrics.avgCycleMinutes).toBeLessThan(70); // falling curve settles low
    expect(exit.metrics.avgChecklistPct).toBeGreaterThanOrEqual(95);
  });

  it("pilot exit check would fail on a severity-one incident", async () => {
    const pilot = await prisma.pilotConfig.findFirst({ where: { active: true } })!;
    const log = await logPilotDay({
      date: new Date(Date.now() + 86400000), woredaCode: "AA-BOLE-W01",
      filesOpened: 2, filesRegistered: 2, avgCycleMinutes: 40,
      checklistCompliancePct: 100, replicationCorrect: true,
      incidents: "DRILL: simulated sev-1 to prove the exit check blocks.",
      severity: "SEV1",
    });
    const blocked = await pilotExitCheck();
    expect(blocked.ready).toBe(false);
    expect(blocked.metrics.sev1Count).toBe(1);
    await prisma.pilotDayLog.delete({ where: { id: log.id } }); // restore
    const restored = await pilotExitCheck();
    expect(restored.ready).toBe(true);
  });

  it("refuses day logs for non-pilot woredas and pre-start dates", async () => {
    await expectLegalError(
      () => logPilotDay({
        date: new Date(), woredaCode: "AA-YEKA-W01",
        filesOpened: 1, filesRegistered: 1, avgCycleMinutes: 40,
        checklistCompliancePct: 100, replicationCorrect: true,
      }),
      "Plan 5.8",
    )();
    await expectLegalError(
      () => logPilotDay({
        date: new Date("2020-01-01"), woredaCode: "AA-BOLE-W01",
        filesOpened: 1, filesRegistered: 1, avgCycleMinutes: 40,
        checklistCompliancePct: 100, replicationCorrect: true,
      }),
      "Plan 5.8",
    )();
  });
});

describe("Awareness materials (Proc. Arts. 14, 16; CR-01/NFR-06)", () => {
  it("seeded four trilingual items covering both legal bases", async () => {
    const items = await prisma.awarenessItem.findMany();
    expect(items.length).toBe(4);
    for (const a of items) {
      expect(a.titleEn.length).toBeGreaterThan(0);
      expect(a.titleAm.length).toBeGreaterThan(0);
      expect(a.titleOm.length).toBeGreaterThan(0);
    }
    const bases = new Set(items.map((a) => a.basis));
    expect(bases.has("Proc. Art. 14")).toBe(true);
    expect(bases.has("Proc. Art. 16")).toBe(true);
  });

  it("refuses an awareness item without trilingual titles (CR-01; NFR-06)", async () => {
    await expectLegalError(
      () => createAwarenessItem({
        basis: "Proc. Art. 16", channel: "POSTER",
        titleEn: "Title", titleAm: "", titleOm: "", bodyEn: "Body",
      }),
      "CR-01; NFR-06",
    )();
  });

  it("approval records the owner's reference", async () => {
    const item = await prisma.awarenessItem.create({
      data: {
        basis: "Proc. Art. 16", channel: "BROCHURE",
        titleEn: "T-en", titleAm: "T-am", titleOm: "T-om", bodyEn: "B",
      },
    });
    const approved = await approveAwarenessItem(item.id, "G7-OWNER-REF");
    expect(approved.status).toBe("APPROVED");
    expect(approved.ownerApprovalRef).toBe("G7-OWNER-REF");
    await prisma.awarenessItem.delete({ where: { id: item.id } });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
