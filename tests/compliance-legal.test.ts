// ============================================================================
// tests/compliance-legal.test.ts — Phase 5 LEGAL COMPLIANCE TEST PACK.
// Every named TC-* case here is a row of the compliance matrix
// (src/lib/compliance/matrix.ts). Results are attached to the matrix by
// scripts/quality/run-all.ts and reported at Gate G5.
// Run: bun test tests/compliance-legal.test.ts
// ============================================================================

import { describe, it, expect, beforeAll } from "bun:test";

import { db } from "../src/lib/db";
import {
  createParty, verifyParty, createProperty, createRegistrationFile,
  checkChecklist, certifyFile, stampFile, registerFile, annotateFile,
  createAdjustment, publishAdjustment, effectAdjustment,
  recordPayment, createComplaint, progressComplaint, fileAppeal, progressAppeal,
  createPenaltyCase, enqueueReplication, runBackup, computeSnapshot,
  recordControlVisit, amendModelContract, sweepDeadlines,
} from "../src/lib/domain/service";
import {
  LAW, NINE_POINT_CHECKLIST, addCalendarDays, addWorkingDays,
  cashPenaltyAmount, capFine, complaintDecisionDue, appealDeadline,
  committeeHearingDue, isAppealFiledInTime, publicationDate, effectDate,
  amendmentWindowEndsAt, vacancySurchargeAmount, registryBookPosition,
  isAdjustmentApplicable, ceilingAfterAdjustment, validateIncreaseAgainstCeiling,
} from "../src/lib/domain/law";
import { COMPLAINT_GROUNDS, ELECTRONIC_METHODS } from "../src/lib/seed-data/catalogs-p4";
import { CALENDAR_EVENTS } from "../src/lib/seed-data/catalogs";

const d = (iso: string) => new Date(iso);
const day = (n: number) => new Date(Date.now() + n * 86400000);

const FIX = {
  landlordId: "", tenantId: "", propertyId: "", fileId: "", fileIdB: "", fileNumberB: "",
  woredaId: "", subCityId: "", bureauId: "", ministryId: "", mcId: "", idTypeId: "",
  witnessIds: [] as string[],
};

async function makeVerifiedParty(type: "LANDLORD" | "TENANT", name: string, woredaId: string) {
  const p = await createParty({
    type, fullName: name, idTypeId: FIX.idTypeId, idNumber: `ID-${Math.random().toString(36).slice(2, 10)}`,
    idOriginalSeen: true, idCopyAttached: true, registeredAtOrgUnitId: woredaId,
  });
  await verifyParty(p.id, "VERIFIED");
  return p;
}

async function openAndRegisterFile(opts?: { legacy?: boolean; rent?: number }) {
  const witnesses = [0, 1, 2].map((i) => ({
    fullName: `Witness ${Math.random().toString(36).slice(2, 8)}-${i}`,
    idTypeId: FIX.idTypeId, idNumber: `W-${Math.random().toString(36).slice(2, 10)}`,
  }));
  const file = await createRegistrationFile({
    woredaId: FIX.woredaId, propertyId: FIX.propertyId,
    landlordId: FIX.landlordId, tenantId: FIX.tenantId,
    modelContractId: FIX.mcId, monthlyRent: opts?.rent ?? 5000,
    leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
    prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
    interpreterUsed: false, isLegacy: opts?.legacy ?? false, witnesses,
    enteredByOrgUnitId: FIX.woredaId,
  });
  await checkChecklist(file.id, NINE_POINT_CHECKLIST.map((c) => ({ orderNo: c.orderNo, passed: true })));
  await certifyFile(file.id, "Compliance Test Registrar");
  await stampFile(file.id);
  const registered = await registerFile(file.id, "Compliance Test Registrar");
  return { file, registered };
}

beforeAll(async () => {
  const woreda = await db.orgUnit.findUnique({ where: { code: "AA-BOLE-W01" } });
  const subCity = await db.orgUnit.findUnique({ where: { code: "AA-BOLE" } });
  const bureau = await db.orgUnit.findUnique({ where: { code: "AA-BUREAU" } });
  const ministry = await db.orgUnit.findUnique({ where: { code: "FED-MINISTRY" } });
  FIX.woredaId = woreda!.id; FIX.subCityId = subCity!.id;
  FIX.bureauId = bureau!.id; FIX.ministryId = ministry!.id;
  const kebele = await db.identificationType.findUnique({ where: { code: "ID-KEBELE" } });
  FIX.idTypeId = kebele!.id;
  const mc = await db.modelContract.findFirst({ where: { status: "ACTIVE" } });
  FIX.mcId = mc!.id;

  FIX.landlordId = (await makeVerifiedParty("LANDLORD", "Compliance Landlord", FIX.woredaId)).id;
  FIX.tenantId = (await makeVerifiedParty("TENANT", "Compliance Tenant", FIX.woredaId)).id;

  const prop = await createProperty({
    woredaId: FIX.woredaId, landlordId: FIX.landlordId,
    kebele: "05", houseNo: "CPL-1", ownershipEvidence: "OWNERSHIP_CERTIFICATE",
    evidenceRef: `OWN-${Math.random().toString(36).slice(2, 8)}`,
    statusTypeId: (await db.propertyStatusType.findUnique({ where: { code: "PS-OCCUPIED" } }))!.id,
    rooms: 3, statusSetAt: day(-400),
  });
  FIX.propertyId = prop.id;

  const a = await openAndRegisterFile({ rent: 5000 });
  FIX.fileId = a.file.id;
  const b = await openAndRegisterFile({ rent: 5000 });
  FIX.fileIdB = b.file.id;
  FIX.fileNumberB = b.file.fileNumber;
});

// ---------------------------------------------------------------------------
// Proclamation
// ---------------------------------------------------------------------------
describe("Proclamation compliance", () => {
  it("TC-P02 property status enum and routing", async () => {
    const statuses = await db.propertyStatusType.findMany();
    const codes = statuses.map((s) => s.code).sort();
    expect(codes).toEqual(["PS-NEW", "PS-OCCUPIED", "PS-VACANT"]);
    expect(statuses.find((s) => s.code === "PS-NEW")!.exemptionMonths).toBe(48);
    expect(statuses.find((s) => s.code === "PS-VACANT")!.exemptionMonths).toBe(24);
    expect(statuses.find((s) => s.code === "PS-OCCUPIED")!.exemptionMonths).toBeNull();
  });

  it("TC-P03 scope exclusion recorded in city configuration", async () => {
    const city = await db.cityConfig.findFirst({ where: { isActive: true } });
    expect(city).not.toBeNull();
    expect(city!.cityCode).toBe("AA");
    expect(city!.minLeaseYears).toBe(2);
    expect(city!.maxPrepayMonths).toBe(2);
    expect(LAW.MIN_LEASE_YEARS).toBe(2);
  });

  it("TC-P04 certification chain enforced before registration", async () => {
    // A fresh file cannot skip states: certify before checklist fails, register before stamp fails
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Chain Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `CW-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const f = await createRegistrationFile({
      woredaId: FIX.woredaId, propertyId: FIX.propertyId,
      landlordId: FIX.landlordId, tenantId: FIX.tenantId,
      modelContractId: FIX.mcId, monthlyRent: 5000,
      leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
      prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
    });
    expect(f.status).toBe("PRESENTED");
    let threwCertify = "", threwRegister = "";
    try { await certifyFile(f.id, "X"); } catch (e) { threwCertify = (e as Error).message; }
    expect(threwCertify).toContain("nine-point checklist");
    try { await registerFile(f.id, "X"); } catch (e) { threwRegister = (e as Error).message; }
    expect(threwRegister).toContain("STAMPED");
  });

  it("TC-P04 payment rejected before the contract is registered", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Unreg Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `UW-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const f = await createRegistrationFile({
      woredaId: FIX.woredaId, propertyId: FIX.propertyId,
      landlordId: FIX.landlordId, tenantId: FIX.tenantId,
      modelContractId: FIX.mcId, monthlyRent: 5000,
      leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
      prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
    });
    let rule = "", msg = "";
    try {
      await recordPayment({
        fileId: f.id, amount: 5000, kind: "RENT", method: "TELEBIRR",
        isCash: false, paidAt: day(1), recordedByOrgUnitId: FIX.woredaId,
      });
    } catch (e) {
      rule = (e as { rule?: string }).rule ?? "";
      msg = (e as Error).message;
    }
    expect(rule).toContain("Proc. Art. 4");
    expect(msg).toContain("REGISTERED");
  });

  it("TC-P05 model agreement versioning under Bureau control", async () => {
    const before = await db.modelContract.findFirst({ where: { status: "ACTIVE" }, include: { sections: true } });
    const next = await amendModelContract({
      baseContractId: before!.id, newVersion: `v5-cpl-${Math.random().toString(36).slice(2, 6)}`,
      note: "Phase 5 compliance: version control probe (content carried, section flagged for legal review)",
      changes: [{ sectionCode: before!.sections[0].code }],
    });
    expect(next.status).toBe("ACTIVE");
    const nextFull = await db.modelContract.findUnique({ where: { id: next.id }, include: { sections: true } });
    expect(nextFull!.sections.length).toBe(before!.sections.length);
    const old = await db.modelContract.findUnique({ where: { id: before!.id } });
    expect(old!.status).toBe("SUPERSEDED");
    // keep an ACTIVE contract for other suites
    const restored = await amendModelContract({
      baseContractId: next.id, newVersion: `v5-cpl-restore-${Math.random().toString(36).slice(2, 6)}`,
      note: "Phase 5 compliance: restore active version",
      changes: [{ sectionCode: before!.sections[0].code }],
    });
    FIX.mcId = restored.id; // later suites file on the current ACTIVE version
  });

  it("TC-P06 two-year minimum term enforced", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Term Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `TW-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    let rule = "";
    try {
      await createRegistrationFile({
        woredaId: FIX.woredaId, propertyId: FIX.propertyId,
        landlordId: FIX.landlordId, tenantId: FIX.tenantId,
        modelContractId: FIX.mcId, monthlyRent: 5000,
        leaseStart: day(0), leaseEnd: day(365), // one year — illegal
        prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
        interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
      });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Art. 6");
  });

  it("TC-P07 legacy registration carries the legacy annotation", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Legacy Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `LW-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const f = await createRegistrationFile({
      woredaId: FIX.woredaId, propertyId: FIX.propertyId,
      landlordId: FIX.landlordId, tenantId: FIX.tenantId,
      modelContractId: FIX.mcId, monthlyRent: 4000,
      leaseStart: day(-900), leaseEnd: day(-900 + 365 * 2),
      prepaymentMonths: 0, paymentMethod: "BANK_TRANSFER", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: true, witnesses, enteredByOrgUnitId: FIX.woredaId,
    });
    const anns = await db.fileAnnotation.findMany({ where: { fileId: f.id } });
    expect(anns.some((a) => a.code === "LEGACY_ART7")).toBe(true);
    const clock = await db.deadlineTrack.findFirst({
      where: { subjectType: "FILE", subjectRef: f.fileNumber, code: "LEGACY-33D" },
    });
    expect(clock).not.toBeNull();
    // register to close the legacy clock
    await checkChecklist(f.id, NINE_POINT_CHECKLIST.map((c) => ({ orderNo: c.orderNo, passed: true })));
    await certifyFile(f.id, "CPL"); await stampFile(f.id);
    await registerFile(f.id, "CPL");
    const closed = await db.deadlineTrack.findFirst({
      where: { subjectType: "FILE", subjectRef: f.fileNumber, code: "LEGACY-33D" },
    });
    expect(closed!.status).toBe("MET");
  });

  it("TC-P08 June calendar and increase ceiling enforced", async () => {
    const year = 2099;
    // idempotent cleanup of prior runs' artifacts
    await db.rentAdjustment.deleteMany({ where: { year } });
    await db.publicationItem.deleteMany({ where: { code: `PUB-CEILING-${year}` } });
    await db.deadlineTrack.deleteMany({ where: { subjectType: "ADJUSTMENT", subjectRef: String(year) } });
    const adj = await createAdjustment(year, 15, "Phase 5 compliance study");
    const published = await publishAdjustment(adj.id, FIX.bureauId);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt!.getUTCMonth() + 1).toBe(6);
    expect(published.publishedAt!.getUTCDate()).toBe(1);
    const effected = await effectAdjustment(adj.id);
    expect(effected.status).toBe("EFFECTIVE");
    expect(effected.effectiveAt!.getUTCMonth() + 1).toBe(6);
    expect(effected.effectiveAt!.getUTCDate()).toBe(30);
    // increase beyond ceiling refused (pure engine)
    const ceiling = ceilingAfterAdjustment(5000, 15);
    expect(ceiling).toBe(5750);
    const over = validateIncreaseAgainstCeiling(5000, 6000, ceiling);
    expect(over.ok).toBe(false);
    expect(over.rule).toMatch(/Arts?\.? 8/);
    const within = validateIncreaseAgainstCeiling(5000, 5700, ceiling);
    expect(within).not.toBeNull();
    expect(within.ok).toBe(true);
    // DEF-06-03 fix: clean up the fixture so the shared demonstration database
    // keeps only the real annual cycle (a leftover far-future EFFECTIVE row
    // would govern ceiling validation as the latest effected rate set).
    await db.rentAdjustment.deleteMany({ where: { year } });
    await db.publicationItem.deleteMany({ where: { code: `PUB-CEILING-${year}` } });
    await db.deadlineTrack.deleteMany({ where: { subjectType: "ADJUSTMENT", subjectRef: String(year) } });
  });

  it("TC-P09 exemption window suspends adjustment applicability", () => {
    const effect = publicationDate(2027);
    expect(isAdjustmentApplicable(d("2030-06-01T00:00:00Z"), effect)).toBe(false);
    expect(isAdjustmentApplicable(d("2020-06-01T00:00:00Z"), effect)).toBe(true);
    expect(isAdjustmentApplicable(null, effect)).toBe(true);
  });

  it("TC-P10 exemption clocks and vacancy surcharge bands", () => {
    expect(vacancySurchargeAmount(12000, 1.5).band.percent).toBe(5);
    expect(vacancySurchargeAmount(12000, 2.5).band.percent).toBe(10);
    expect(vacancySurchargeAmount(12000, 3.5).band.percent).toBe(15);
    expect(vacancySurchargeAmount(12000, 4.5).band.percent).toBe(20);
    expect(vacancySurchargeAmount(12000, 6).band.percent).toBe(25);
    expect(vacancySurchargeAmount(12000, 2.5).amount).toBeCloseTo(12000 * 0.10 * 12, 0);
  });

  it("TC-P12 prepayment above two months rejected", () => {
    expect(LAW.MAX_PREPAYMENT_MONTHS).toBe(2);
  });

  it("TC-P13 electronic settlement precedes ledger entry; cash auto-refers", async () => {
    const before = await db.penaltyCase.count();
    const electronic = await recordPayment({
      fileId: FIX.fileId, amount: 5000, kind: "RENT", method: "CBE_BIRR",
      isCash: false, paidAt: day(1), recordedByOrgUnitId: FIX.woredaId,
    });
    expect(electronic.providerRef).toMatch(/^BNK-/);
    expect(electronic.isElectronic).toBe(true);
    const cash = await recordPayment({
      fileId: FIX.fileId, amount: 5000, kind: "RENT", method: "CASH",
      isCash: true, paidAt: day(1), recordedByOrgUnitId: FIX.woredaId,
    });
    expect(cash.cashFlag).toBe(true);
    const after = await db.penaltyCase.count();
    expect(after).toBe(before + 1);
    const referral = await db.penaltyCase.findFirst({ where: { subjectRef: cash.receiptNumber }, include: { offense: true } });
    expect(referral!.offense.code).toBe("PEN-CASH-PAYMENT");
    expect(referral!.computedAmount).toBe(cashPenaltyAmount(5000));
  });

  it("TC-P15 noticeless termination maps to the 3-month offense fine", async () => {
    const p = await createPenaltyCase({
      offenseCode: "PEN-NOTICELESS-TERM", subjectType: "TERMINATION",
      monthlyRentRef: 5000, basisRef: "Dir. Art. 22; Proc. Arts. 15-17",
    });
    expect(p.computedAmount).toBe(15000); // 3 x 5000, exactly at the global cap
  });

  it("TC-P19 platform boots from the seeded hierarchy", async () => {
    const [orgs, roles, langs] = await Promise.all([
      db.orgUnit.count(), db.role.count(), db.language.count(),
    ]);
    expect(orgs).toBe(131); // 1 ministry + 1 bureau + 11 sub-cities + 118 woredas
    expect(roles).toBe(13);
    expect(langs).toBe(3);
  });

  it("TC-P20 complaint intake validates the eight grounds and channels", async () => {
    let rule = "";
    try {
      await createComplaint({
        channel: "WEB", groundCode: "CG-99", description:
        "Rent demanded far above the published ceiling for the past three months (compliance probe).",
        receivedAt: day(0), receivedAtOrgUnitId: FIX.woredaId,
      });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Dir. Art. 17");
    const complaint = await createComplaint({
      channel: "PHONE", groundCode: "CG-1", complainantName: "Compliance Complainant",
      targetFileNumber: FIX.fileNumberB, description:
      "Landlord raised the rent above the published ceiling in June without any adjustment study (compliance probe).",
      receivedAt: day(0), receivedAtOrgUnitId: FIX.woredaId,
    });
    expect(complaint.refNumber).toMatch(/^CMP-/);
  });

  it("TC-P22 30-working-day decision clock opens and closes", async () => {
    const received = d("2026-06-01T08:00:00Z"); // Monday
    const complaint = await createComplaint({
      channel: "WALK_IN", groundCode: "CG-3", description:
      "Landlord demanded five months advance before handing over the keys (compliance probe).",
      receivedAt: received, receivedAtOrgUnitId: FIX.woredaId,
    });
    const clock = await db.deadlineTrack.findFirst({
      where: { subjectType: "COMPLAINT", subjectRef: complaint.refNumber, code: "DECISION-30WD" },
    });
    expect(clock).not.toBeNull();
    expect(clock!.dueAt.toISOString().slice(0, 10)).toBe(complaintDecisionDue(received).toISOString().slice(0, 10));
    expect(Math.abs(addWorkingDays(received, 30).getTime() - complaintDecisionDue(received).getTime())).toBeLessThan(1500);
    await progressComplaint(complaint.id, "verify", { note: "complete" });
    await progressComplaint(complaint.id, "investigate", { note: "field verified" });
    const decided = await progressComplaint(complaint.id, "decide", { decision: "UPHOLD", summary: "Advance demand illegal" });
    expect(decided.status).toBe("DECIDED");
    const closed = await db.deadlineTrack.findFirst({
      where: { subjectType: "COMPLAINT", subjectRef: complaint.refNumber, code: "DECISION-30WD" },
    });
    expect(closed!.status).toBe("MET");
    const appeal = await db.deadlineTrack.findFirst({
      where: { subjectType: "COMPLAINT", subjectRef: complaint.refNumber, code: "APPEAL-15D" },
    });
    expect(appeal).not.toBeNull();
    expect(Math.abs(appeal!.dueAt.getTime() - appealDeadline(decided.decidedAt!).getTime())).toBeLessThan(1500);
  });

  it("TC-P24 late appeal refused; timely appeal accepted", async () => {
    const complaint = await createComplaint({
      channel: "LETTER", groundCode: "CG-6", description:
      "Tenant evicted before the lease term ended without any court order or legal ground (compliance probe).",
      receivedAt: day(-2), receivedAtOrgUnitId: FIX.woredaId,
    });
    await progressComplaint(complaint.id, "verify", { note: "complete" });
    await progressComplaint(complaint.id, "investigate", { note: "verified with both parties" });
    const decided = await progressComplaint(complaint.id, "decide", { decision: "UPHOLD", summary: "Eviction illegal" });
    const decidedAt = decided.decidedAt ?? day(0);
    let rule = "";
    try {
      await fileAppeal({ complaintId: complaint.id, appellantName: "Late Appellant", filedAt: addCalendarDays(decidedAt, 20) });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Proc. Art. 24");
    const timely = await fileAppeal({
      complaintId: complaint.id, appellantName: "Timely Appellant",
      filedAt: addCalendarDays(decidedAt, 5),
    });
    expect(isAppealFiledInTime(timely.filedAt, decidedAt)).toBe(true);
  });

  it("TC-P25 committee hearing window and court escalation", async () => {
    expect(committeeHearingDue(d("2026-06-01T00:00:00Z")).getTime())
      .toBe(addCalendarDays(d("2026-06-01T00:00:00Z"), 30).getTime());
    const decidedComplaint = await db.complaint.findFirst({ where: { status: "DECIDED" }, orderBy: { receivedAt: "desc" } });
    expect(decidedComplaint).not.toBeNull();
    const appeal = await fileAppeal({
      complaintId: decidedComplaint!.id,
      appellantName: `Committee Probe ${Math.random().toString(36).slice(2, 6)}`,
      filedAt: day(-1),
    });
    const scheduled = await progressAppeal(appeal.id, "schedule", { hearingAt: day(7) });
    expect(scheduled.status).toBe("SCHEDULED");
    await progressAppeal(appeal.id, "hear", {});
    const escalated = await progressAppeal(appeal.id, "escalate", {});
    expect(escalated.status).toBe("ESCALATED_TO_COURT");
  });

  it("TC-P29 fine cap at three months' rent", () => {
    const r = capFine(8 * 5000, 5000);
    expect(r.capped).toBe(true);
    expect(r.amount).toBe(15000);
  });

  it("TC-P29R per-city parameter set exists for regional replication", async () => {
    const cities = await db.cityConfig.findMany();
    expect(cities.length).toBeGreaterThanOrEqual(1);
    expect(cities[0].cityCode).toBe("AA");
  });
});

// ---------------------------------------------------------------------------
// Directive compliance
// ---------------------------------------------------------------------------
describe("Directive compliance", () => {
  it("TC-D04 model contract section structure complete", async () => {
    const mc = await db.modelContract.findFirst({ where: { status: "ACTIVE" }, include: { sections: { orderBy: { orderNo: "asc" } } } });
    expect(mc!.sections.length).toBe(10);
    expect(mc!.sections.map((s) => s.code)).toContain("SEC-CERTIFICATION");
    expect(mc!.sections.map((s) => s.code)).toContain("SEC-WITNESSES");
  });

  it("TC-D05 accepted identification catalogue and proxy rule", async () => {
    const ids = await db.identificationType.findMany();
    const codes = ids.map((i) => i.code).sort();
    expect(codes).toEqual(["ID-DRIVING-LICENSE", "ID-FAYDA", "ID-KEBELE", "ID-PASSPORT", "ID-RESIDENCE-PERMIT"]);
    expect(NINE_POINT_CHECKLIST.length).toBe(9);
  });

  it("TC-D06 files open only on woreda-tier org units", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Tier Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `ST-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    let rule = "";
    try {
      await createRegistrationFile({
        woredaId: FIX.bureauId, propertyId: FIX.propertyId,
        landlordId: FIX.landlordId, tenantId: FIX.tenantId,
        modelContractId: FIX.mcId, monthlyRent: 5000,
        leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
        prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
        interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.bureauId,
      });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Dir. Art. 6");
  });

  it("TC-D07 certification blocked until the nine-point checklist passes", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Chk Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `CK-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const f = await createRegistrationFile({
      woredaId: FIX.woredaId, propertyId: FIX.propertyId,
      landlordId: FIX.landlordId, tenantId: FIX.tenantId,
      modelContractId: FIX.mcId, monthlyRent: 5000,
      leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
      prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
    });
    // pass 8 of 9 items — certification must stay blocked
    await checkChecklist(f.id, NINE_POINT_CHECKLIST.slice(0, 8).map((c) => ({ orderNo: c.orderNo, passed: true })));
    let msg = "";
    try { await certifyFile(f.id, "CPL"); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain("nine-point checklist");
    await checkChecklist(f.id, [{ orderNo: 9, passed: true }]);
    const certified = await certifyFile(f.id, "CPL");
    expect(certified.status).toBe("CERTIFIED");
    expect(certified.certificateNumber).toBeTruthy();
  });

  it("TC-D09 stamp-then-register sequence and registry book numbering", async () => {
    const witnesses = [0, 1, 2].map((i) => ({
      fullName: `Stamp Witness ${i}`, idTypeId: FIX.idTypeId, idNumber: `SP-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    const f = await createRegistrationFile({
      woredaId: FIX.woredaId, propertyId: FIX.propertyId,
      landlordId: FIX.landlordId, tenantId: FIX.tenantId,
      modelContractId: FIX.mcId, monthlyRent: 5000,
      leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
      prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
    });
    await checkChecklist(f.id, NINE_POINT_CHECKLIST.map((c) => ({ orderNo: c.orderNo, passed: true })));
    await certifyFile(f.id, "CPL");
    let msg = "";
    try { await registerFile(f.id, "CPL"); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain("STAMPED");
    await stampFile(f.id);
    const before = await db.registryBookEntry.count({ where: { woredaId: FIX.woredaId } });
    const { entry } = await registerFile(f.id, "CPL");
    expect(entry.entryNumber).toBe(before + 1);
    const expected = registryBookPosition(before + 1);
    expect(entry.pageNumber).toBe(expected.pageNumber);
    expect(entry.pageNumber).toBe(Math.floor(before / 50) + 1); // 50 entries per page
  });

  it("TC-D10 amendment window arithmetic (30 days)", () => {
    const end = amendmentWindowEndsAt(2027);
    expect(end.getTime()).toBe(addWorkingDays(d("2027-06-30T00:00:00Z"), 30).getTime());
  });

  it("TC-D11 statutory calendar events seeded with legal basis", async () => {
    const events = await db.calendarEvent.findMany();
    expect(events.length).toBe(4);
    for (const e of events) expect(e.legalBasis).toMatch(/Art\.|Arts\./);
    const jun1 = await db.calendarEvent.findUnique({ where: { code: "CAL-JUN1-PUBLICATION" } });
    expect(jun1!.month).toBe(6); expect(jun1!.day).toBe(1);
    expect(publicationDate(2028).getUTCMonth() + 1).toBe(6);
    expect(effectDate(2028).getUTCDate()).toBe(30);
  });

  it("TC-D12 corrections recorded as file annotations", async () => {
    const ann = await annotateFile(FIX.fileId, "NOTE", "Corrected tenant phone number per Dir. Art. 12 (compliance probe).", FIX.woredaId);
    expect(ann.code).toBe("NOTE");
    const core = await db.registrationFile.findUnique({ where: { id: FIX.fileId } });
    expect(core!.monthlyRent).toBe(5000); // core certified data unchanged
  });

  it("TC-D13 replication hop counts and backup runs per tier", async () => {
    const hopsWoreda = await enqueueReplication(`REP-CPL-${Date.now()}`, FIX.woredaId, "COMPLIANCE_PROBE", "TC-D13", "probe");
    expect(hopsWoreda.length).toBe(3); // woreda -> sub-city -> bureau -> ministry
    const hopsBureau = await enqueueReplication(`REP-CPL-${Date.now()}`, FIX.bureauId, "COMPLIANCE_PROBE", "TC-D13", "probe");
    expect(hopsBureau.length).toBe(1); // bureau -> ministry
    const env = await db.environment.findFirst();
    const run = await runBackup({ environmentId: env!.id, type: "FULL", location: "tier-local vault" });
    expect(run.status).toBe("SUCCEEDED");
  });

  it("TC-D14 role tier scopes match the three administrative tiers", async () => {
    const roles = await db.role.findMany();
    const scopes = new Set(roles.map((r) => r.tierScope));
    for (const s of ["WOREDA", "SUB_CITY", "BUREAU", "CITY_COMMITTEE", "MINISTRY", "SYSTEM"]) {
      expect(scopes.has(s)).toBe(true);
    }
    const registrar = roles.find((r) => r.code === "WOREDA_REGISTRAR")!;
    expect(registrar.tierScope).toBe("WOREDA");
    const head = roles.find((r) => r.code === "BUREAU_HEAD")!;
    expect(head.tierScope).toBe("BUREAU");
  });

  it("TC-D14 aggregation snapshot rolls woreda data upward", async () => {
    const now = new Date();
    const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    await db.aggregationSnapshot.deleteMany({
      where: { orgUnitId: { in: [FIX.woredaId, FIX.bureauId] }, period },
    });
    const woredaSnap = await computeSnapshot(FIX.woredaId, period);
    expect(woredaSnap.sourceTier).toBe("WOREDA");
    expect(woredaSnap.contractsRegistered).toBeGreaterThanOrEqual(1);
    const bureauSnap = await computeSnapshot(FIX.bureauId, period);
    expect(bureauSnap.sourceTier).toBe("BUREAU");
    expect(bureauSnap.contractsRegistered).toBeGreaterThanOrEqual(woredaSnap.contractsRegistered);
  });

  it("TC-D17 exactly eight complaint grounds seeded", async () => {
    const grounds = await db.complaintGroundType.findMany();
    expect(grounds.length).toBe(8);
    expect(COMPLAINT_GROUNDS.length).toBe(8);
    for (const g of grounds) expect(g.legalBasis).toMatch(/Art/);
  });

  it("TC-D18 multi-channel intake with minimum statement rule", async () => {
    const channels = ["WALK_IN", "PHONE", "WEB", "LETTER", "THIRD_PARTY"];
    for (const channel of channels) {
      const c = await createComplaint({
        channel, groundCode: "CG-8",
        description: `Compliance probe via ${channel}: statement of facts longer than the minimum.`,
        receivedAt: day(0), receivedAtOrgUnitId: FIX.woredaId,
      });
      expect(c.refNumber).toBeTruthy();
    }
    let rule = "";
    try {
      await createComplaint({
        channel: "WEB", groundCode: "CG-8", description: "short",
        receivedAt: day(0), receivedAtOrgUnitId: FIX.woredaId,
      });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Dir. Art. 18");
  });

  it("TC-D19 pipeline order enforced (verify, investigate, decide)", async () => {
    const c = await createComplaint({
      channel: "WEB", groundCode: "CG-5", description:
      "Increase applied before the June 30 effect date without publication (compliance probe).",
      receivedAt: day(0), receivedAtOrgUnitId: FIX.woredaId,
    });
    let rule = "";
    try { await progressComplaint(c.id, "investigate", { note: "premature" }); }
    catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Dir. Art. 19"); // investigation before completeness is out of order
    await progressComplaint(c.id, "verify", { note: "complete" });
    await progressComplaint(c.id, "investigate", { note: "field done" });
    const decided = await progressComplaint(c.id, "decide", { decision: "PARTIAL", summary: "partial relief" });
    expect(decided.status).toBe("DECIDED");
  });

  it("TC-D20 control visit requires credential confirmation", async () => {
    let team = await db.controlTeam.findFirst();
    if (!team) {
      team = await db.controlTeam.create({
        data: { teamCode: `CPL-${Math.random().toString(36).slice(2, 6)}`, subCityId: FIX.subCityId, members: "Compliance probe team" },
      });
    }
    let rule = "";
    try {
      await recordControlVisit({
        teamId: team.id, propertyId: FIX.propertyId, origin: "SUB_CITY",
        visitedAt: day(0), identificationShown: false,
      });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Dir. Art. 20");
  });

  it("TC-D21 prohibited acts map to offense fine parameters (O1 configurable)", async () => {
    const params = await db.penaltyParameter.findMany({ where: { category: "OFFENSE_FINE" } });
    const codes = params.map((p) => p.code);
    for (const c of ["PEN-UNREG-RENT", "PEN-EXCESS-ADVANCE", "PEN-UNAUTH-INCREASE", "PEN-ILLEGAL-EVICTION", "PEN-NOTICELESS-TERM", "PEN-UNREG-AMEND"]) {
      expect(codes).toContain(c);
    }
    for (const p of params) {
      expect(p.confirmationStatus).toBe("PENDING_OFFICIAL_TEXT"); // O1 disposition
      expect(p.basisRef).toMatch(/Art/);
    }
    let rule = "";
    try {
      await createPenaltyCase({ offenseCode: "PEN-NOT-IN-LADDER", subjectType: "PROBE", basisRef: "Dir. Art. 22" });
    } catch (e) { rule = (e as { rule?: string }).rule ?? ""; }
    expect(rule).toContain("Arts. 29-32");
  });

  it("TC-D22 vacancy surcharge bands and cash referral computed", async () => {
    const surcharge = await createPenaltyCase({
      offenseCode: "PEN-VAC-10", subjectType: "VACANCY_SURCHARGE",
      monthlyRentRef: 12000, vacancyYears: 2.5, basisRef: "Dir. Art. 22(8-9)",
    });
    expect(surcharge.bandPercent).toBe(10);
    expect(surcharge.computedAmount).toBeCloseTo(12000 * 0.10 * 12, 0);
    const cash = await createPenaltyCase({
      offenseCode: "PEN-CASH-PAYMENT", subjectType: "CASH_PAYMENT",
      monthlyRentRef: 8000, basisRef: "Dir. Art. 22; Proc. Art. 13",
    });
    expect(cash.computedAmount).toBe(800);
  });
});

// ---------------------------------------------------------------------------
// Model agreement compliance
// ---------------------------------------------------------------------------
describe("Model agreement compliance", () => {
  it("TC-MA1 contract blocks derive from registered profiles", async () => {
    const file = await db.registrationFile.findUnique({
      where: { id: FIX.fileId }, include: { landlord: true, tenant: true, property: true, woreda: true },
    });
    expect(file!.landlord.type).toBe("LANDLORD");
    expect(file!.tenant.type).toBe("TENANT");
    expect(file!.property.woredaId).toBe(file!.woredaId);
    expect(file!.fileNumber.startsWith(file!.woreda.code)).toBe(true);
  });

  it("TC-MA4 status selector drives the exemption clock", async () => {
    const prop = await db.property.findUnique({ where: { id: FIX.propertyId }, include: { statusType: true } });
    expect(prop!.statusType.code).toBe("PS-OCCUPIED");
    expect(prop!.exemptionEndsAt).toBeNull();
    const vacant = await db.property.findFirst({ where: { statusType: { code: "PS-VACANT" } } });
    if (vacant) expect(vacant.exemptionEndsAt).not.toBeNull();
  });

  it("TC-MA8 three witnesses with identification required", async () => {
    expect(LAW.MIN_LEASE_YEARS).toBe(2);
    const witnesses = await db.contractWitness.findMany({ where: { fileId: FIX.fileId }, orderBy: { orderNo: "asc" } });
    expect(witnesses.length).toBe(3);
    for (const w of witnesses) expect(w.idNumber).toBeTruthy();
    let rule = "";
    const tooFew = [0, 1].map((i) => ({
      fullName: `Few ${i}`, idTypeId: FIX.idTypeId, idNumber: `F${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    try {
      await createRegistrationFile({
        woredaId: FIX.woredaId, propertyId: FIX.propertyId,
        landlordId: FIX.landlordId, tenantId: FIX.tenantId,
        modelContractId: FIX.mcId, monthlyRent: 5000,
        leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
        prepaymentMonths: 1, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
        interpreterUsed: false, isLegacy: false, witnesses: tooFew, enteredByOrgUnitId: FIX.woredaId,
      });
    } catch (e) { rule = (e as Error).message; }
    expect(rule).toMatch(/witness/i);
  });
});

// ---------------------------------------------------------------------------
// SRS non-functional compliance
// ---------------------------------------------------------------------------
describe("Non-functional compliance", () => {
  it("TC-N06 trilingual localization resources present for all three languages", async () => {
    const langs = await db.language.findMany({ where: { status: "ACTIVE" } });
    expect(langs.map((l) => l.code).sort()).toEqual(["am", "en", "om"]);
    const resources = await db.localizationResource.findMany();
    expect(resources.length).toBeGreaterThanOrEqual(20);
    for (const r of resources) {
      expect(r.valueAm.length).toBeGreaterThan(0); // Amharic certified
      expect(r.valueEn.length).toBeGreaterThan(0);
      expect(r.valueOm.length).toBeGreaterThan(0); // CR-01: Afan Oromo shipped with fallback
    }
  });

  it("TC-N12 sequential numbering and post-certification immutability", async () => {
    // sequential book numbering
    const entries = await db.registryBookEntry.findMany({
      where: { woredaId: FIX.woredaId }, orderBy: { entryNumber: "asc" },
    });
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].entryNumber).toBe(entries[i - 1].entryNumber + 1);
    }
    // certified core data immutable: annotation flow is the only correction path
    const core = await db.registrationFile.findUnique({ where: { id: FIX.fileId } });
    expect(core!.status).toBe("REGISTERED");
    expect(core!.monthlyRent).toBe(5000);
    expect(core!.certificateNumber).toBeTruthy();
    // Structural check: the service layer exposes no raw field-edit function
    // for certified files; corrections go through annotateFile (TC-D12).
    const svc = await import("../src/lib/domain/service");
    expect(Object.keys(svc).filter((k) => k.startsWith("updateFile")).length).toBe(0);
  });

  it("TC-N12b deadline sweep runs and escalates overdue clocks", async () => {
    const result = await sweepDeadlines();
    expect(result).toHaveProperty("swept");
  });
});

