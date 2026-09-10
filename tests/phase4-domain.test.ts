// ============================================================================
// tests/phase4-domain.test.ts — Phase 4 unit tests: legal rule engine and
// seed catalogues for the operational domain (Sprints S1-S7, all 13 modules).
// Run: bun test tests/phase4-domain.test.ts
// ============================================================================

import { describe, it, expect } from "bun:test";

import {
  LAW, NINE_POINT_CHECKLIST,
  addWorkingDays, addCalendarDays, addMonths, addYears,
  isPartyIdentityComplete, isProxyDocumentationComplete,
  computeExemptionEndsAt, isExempt,
  validateLease, validateWitnesses,
  publicationDate, effectDate, amendmentWindowEndsAt,
  ceilingAfterAdjustment, validateIncreaseAgainstCeiling, isAdjustmentApplicable,
  cashPenaltyAmount, complaintDecisionDue, appealDeadline, committeeHearingDue,
  isAppealFiledInTime, vacancySurchargeBand, vacancySurchargeAmount,
  capFine, offenseFineAmount, replicationHopCount,
  fileNumberFor, certificateNumberFor, registryBookPosition,
} from "../src/lib/domain/law";
import { COMPLAINT_GROUNDS, ELECTRONIC_METHODS, CITY_CONFIGS } from "../src/lib/seed-data/catalogs-p4";

const d = (iso: string) => new Date(iso);

describe("Working-day calendar (Dir. Art. 14 city config)", () => {
  it("skips Saturdays and Sundays", () => {
    // 2026-09-04 is a Friday. +1 working day = Monday 2026-09-07.
    expect(addWorkingDays(d("2026-09-04T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-09-07");
  });
  it("adds 30 working days without weekend spill errors", () => {
    // Friday + 30wd: exactly 6 weekends skipped => 42 calendar days later.
    const start = d("2026-06-01T00:00:00Z"); // Monday
    const end = addWorkingDays(start, 30);
    const cal = Math.round((end.getTime() - start.getTime()) / 86400000);
    expect(cal).toBe(42);
    expect([0, 6]).not.toContain(end.getUTCDay());
  });
  it("calendar-day helper is direct offset", () => {
    expect(addCalendarDays(d("2026-09-10T00:00:00Z"), 15).toISOString().slice(0, 10)).toBe("2026-09-25");
  });
  it("month and year helpers clamp short months", () => {
    // Jan 31 + 1 month clamps to Feb 28 (no overflow into March)
    expect(addMonths(d("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonths(d("2026-01-15T00:00:00Z"), 1).getUTCMonth()).toBe(1);
    expect(addYears(d("2024-02-29T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2025-02-28");
  });
});

describe("M1 party verification (Dir. Art. 7)", () => {
  it("original-and-copy rule enforced", () => {
    expect(isPartyIdentityComplete({ idOriginalSeen: true, idCopyAttached: true })).toBe(true);
    expect(isPartyIdentityComplete({ idOriginalSeen: true, idCopyAttached: false })).toBe(false);
    expect(isPartyIdentityComplete({ idOriginalSeen: false, idCopyAttached: true })).toBe(false);
  });
  it("proxy documentation needs two witnesses", () => {
    expect(isProxyDocumentationComplete({ proxyName: "A", proxyIdNumber: "1", proxyWitness1Name: "W1", proxyWitness2Name: "W2" })).toBe(true);
    expect(isProxyDocumentationComplete({ proxyName: "A", proxyIdNumber: "1", proxyWitness1Name: "W1", proxyWitness2Name: null })).toBe(false);
  });
});

describe("M2 exemption clocks (Proc. Art. 10)", () => {
  it("new construction: 4 years from completion", () => {
    const r = computeExemptionEndsAt(48, d("2026-06-01T00:00:00Z"));
    expect(r.endsAt!.toISOString().slice(0, 10)).toBe("2030-06-01");
    expect(r.basis).toContain("Art. 10");
  });
  it("vacant: 2 years from vacancy", () => {
    const r = computeExemptionEndsAt(24, d("2026-06-01T00:00:00Z"));
    expect(r.endsAt!.toISOString().slice(0, 10)).toBe("2028-06-01");
  });
  it("occupied: no exemption clock", () => {
    const r = computeExemptionEndsAt(null, d("2026-06-01T00:00:00Z"));
    expect(r.endsAt).toBeNull();
    expect(isExempt(r.endsAt)).toBe(false);
  });
  it("isExempt boundary", () => {
    expect(isExempt(d("2030-06-01T00:00:00Z"), d("2030-05-31T00:00:00Z"))).toBe(true);
    expect(isExempt(d("2030-06-01T00:00:00Z"), d("2030-06-01T00:00:00Z"))).toBe(false);
  });
});

describe("M4 lease validation (Proc. Arts. 5, 6, 12, 13)", () => {
  const base = {
    leaseStart: d("2026-07-01T00:00:00Z"), monthlyRent: 10000,
    prepaymentMonths: 1, paymentMethodConfirmed: true,
  };
  it("accepts a two-year lease", () => {
    expect(validateLease({ ...base, leaseEnd: d("2028-07-01T00:00:00Z") }).ok).toBe(true);
  });
  it("rejects a term below two years (Art. 6)", () => {
    const v = validateLease({ ...base, leaseEnd: d("2028-06-30T00:00:00Z") });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.rule).toContain("Art. 6");
  });
  it("rejects prepayment above two months (Art. 12)", () => {
    const v = validateLease({ ...base, leaseEnd: d("2028-07-01T00:00:00Z"), prepaymentMonths: 3 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.rule).toContain("Art. 12");
  });
  it("requires confirmed electronic payment method (Art. 13)", () => {
    const v = validateLease({ ...base, leaseEnd: d("2028-07-01T00:00:00Z"), paymentMethodConfirmed: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.rule).toContain("Art. 13");
  });
  it("exactly three witnesses required (model agreement)", () => {
    expect(validateWitnesses(3).ok).toBe(true);
    expect(validateWitnesses(2).ok).toBe(false);
    expect(validateWitnesses(4).ok).toBe(false);
  });
});

describe("M5 adjustment engine (Proc. Arts. 8-11; Dir. Art. 11)", () => {
  it("publication June 1 and effect June 30", () => {
    expect(publicationDate(2026).toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(effectDate(2026).toISOString().slice(0, 10)).toBe("2026-06-30");
  });
  it("amendment window: 30 working days after effect", () => {
    const end = amendmentWindowEndsAt(2026);
    expect(end.getUTCMonth()).toBe(7); // lands mid-August
    expect([0, 6]).not.toContain(end.getUTCDay());
  });
  it("ceiling math and increase validation (Arts. 8-9)", () => {
    expect(ceilingAfterAdjustment(10000, 8)).toBe(10800);
    expect(validateIncreaseAgainstCeiling(10000, 10800, 10800).ok).toBe(true);
    const v = validateIncreaseAgainstCeiling(10000, 10900, 10800);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.rule).toContain("Arts. 8-9");
    expect(validateIncreaseAgainstCeiling(10000, 9000, 10800).ok).toBe(true); // decreases free
  });
  it("exempt houses are outside the adjustment regime (Art. 10)", () => {
    expect(isAdjustmentApplicable(d("2030-06-01T00:00:00Z"), d("2026-06-30T00:00:00Z"))).toBe(false);
    expect(isAdjustmentApplicable(null, d("2026-06-30T00:00:00Z"))).toBe(true);
  });
});

describe("M6 payment ledger (Proc. Arts. 12-14; Dir. Art. 22)", () => {
  it("cash penalty is 10 percent of one month's rent", () => {
    expect(cashPenaltyAmount(10000)).toBe(1000);
    expect(cashPenaltyAmount(5555)).toBe(555.5);
  });
  it("electronic channels catalogued", () => {
    expect(ELECTRONIC_METHODS.length).toBeGreaterThanOrEqual(4);
    expect(LAW.ELECTRONIC_PAYMENT_ONLY).toBe(true);
  });
});

describe("M8/M12 dispute clocks (Proc. Arts. 20-26)", () => {
  it("complaint decision due in 30 working days (Art. 22)", () => {
    const due = complaintDecisionDue(d("2026-07-01T00:00:00Z")); // Wednesday
    expect(due.getUTCDay()).not.toBe(0);
    expect(due.getUTCDay()).not.toBe(6);
  });
  it("appeal window 15 days from decision (Art. 24)", () => {
    const decided = d("2026-07-01T00:00:00Z");
    expect(appealDeadline(decided).toISOString().slice(0, 10)).toBe("2026-07-16");
    expect(isAppealFiledInTime(d("2026-07-15T00:00:00Z"), decided)).toBe(true);
    expect(isAppealFiledInTime(d("2026-07-17T00:00:00Z"), decided)).toBe(false);
  });
  it("committee hearing window configured", () => {
    expect(committeeHearingDue(d("2026-07-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-07-31");
  });
});

describe("M9 penalty ladder (Proc. Arts. 29-32; Dir. Art. 22)", () => {
  it("vacancy bands by years without service", () => {
    expect(vacancySurchargeBand(1.5).code).toBe("PEN-VAC-5");
    expect(vacancySurchargeBand(2.5).percent).toBe(10);
    expect(vacancySurchargeBand(3.5).percent).toBe(15);
    expect(vacancySurchargeBand(4.9).percent).toBe(20);
    expect(vacancySurchargeBand(7).percent).toBe(25);
    expect(() => vacancySurchargeBand(0.5)).toThrow();
  });
  it("surcharge base is annual rent", () => {
    const r = vacancySurchargeAmount(10000, 2.5);
    expect(r.amount).toBe(12000); // 10% of 120,000
  });
  it("global cap: 3 months' rent (Arts. 29-32)", () => {
    expect(capFine(25000, 10000)).toEqual({ amount: 25000, capped: false });
    expect(capFine(35000, 10000)).toEqual({ amount: 30000, capped: true });
  });
  it("offense fine respects cap", () => {
    expect(offenseFineAmount(10000, 3)).toEqual({ amount: 30000, capped: false });
    expect(offenseFineAmount(10000, 5)).toEqual({ amount: 30000, capped: true });
  });
});

describe("M10 replication path (Dir. Art. 13)", () => {
  it("hops: woreda 3, sub-city 2, bureau 1, ministry 0", () => {
    expect(replicationHopCount("WOREDA")).toBe(3);
    expect(replicationHopCount("SUB_CITY")).toBe(2);
    expect(replicationHopCount("BUREAU")).toBe(1);
    expect(replicationHopCount("MINISTRY")).toBe(0);
  });
});

describe("Numbering (Dir. Art. 9)", () => {
  it("woreda-scoped file numbers", () => {
    expect(fileNumberFor("AA-BOLE-W01", 2026, 7)).toBe("AA-BOLE-W01/2026/0007");
    expect(certificateNumberFor("AA-BOLE-W01/2026/0007")).toBe("CERT-AA-BOLE-W01-2026-0007");
  });
  it("registry book pagination 50 per page", () => {
    expect(registryBookPosition(1)).toEqual({ entryNumber: 1, pageNumber: 1 });
    expect(registryBookPosition(50)).toEqual({ entryNumber: 50, pageNumber: 1 });
    expect(registryBookPosition(51)).toEqual({ entryNumber: 51, pageNumber: 2 });
  });
});

describe("Nine-point checklist template (Dir. Arts. 6-9)", () => {
  it("has exactly nine ordered items with legal basis", () => {
    expect(NINE_POINT_CHECKLIST.length).toBe(9);
    expect(NINE_POINT_CHECKLIST[0].code).toBe("CL-1");
    expect(NINE_POINT_CHECKLIST[8].code).toBe("CL-9");
    for (const c of NINE_POINT_CHECKLIST) expect(c.basis.length).toBeGreaterThan(3);
  });
});

describe("Phase 4 seed catalogues", () => {
  it("eight complaint grounds (Dir. Art. 17)", () => {
    expect(COMPLAINT_GROUNDS.length).toBe(8);
    const codes = COMPLAINT_GROUNDS.map((g) => g.code);
    expect(new Set(codes).size).toBe(8);
    for (const g of COMPLAINT_GROUNDS) {
      expect(g.nameEn.length).toBeGreaterThan(0);
      expect(g.nameAm.length).toBeGreaterThan(0);
      expect(g.nameOm.length).toBeGreaterThan(0); // CR-01 trilingual
    }
  });
  it("city configuration encodes statutory parameters (Dir. Art. 14)", () => {
    expect(CITY_CONFIGS[0].minLeaseYears).toBe(2);
    expect(CITY_CONFIGS[0].maxPrepayMonths).toBe(2);
    expect(CITY_CONFIGS[0].currency).toBe("ETB");
  });
});
