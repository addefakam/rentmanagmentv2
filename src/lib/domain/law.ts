// ============================================================================
// law.ts — Legal rule engine (pure functions). Every function cites its
// article. Values flagged O1 (pending official Amharic text) are configurable
// via the PenaltyParameter / CityConfig seed rather than hard-coded policy.
// Verified in tests/phase4-domain.test.ts (Phase 4, Sprint S1-S7).
// ============================================================================

export const LAW = {
  MIN_LEASE_YEARS: 2, // Proc. Art. 6: minimum two-year lease term
  MAX_PREPAYMENT_MONTHS: 2, // Proc. Art. 12: advance payment cap
  ELECTRONIC_PAYMENT_ONLY: true, // Proc. Art. 13: bank / legal electronic channel
  REGISTRATION_WINDOW_DAYS: 30, // Proc. Art. 4: register within 30 days
  LEGACY_GRACE_DAYS: 3, // Proc. Art. 7 / Dir. Art. 8(2): legacy 30 + 3 days
  COMPLAINT_DECISION_WORKING_DAYS: 30, // Proc. Art. 22: decision in 30 working days
  APPEAL_WINDOW_DAYS: 15, // Proc. Art. 24: appeal within 15 days of decision
  COMMITTEE_WINDOW_DAYS: 30, // committee hearing window (configuration; O1 note)
  AMENDMENT_WINDOW_WORKING_DAYS: 30, // Proc. Arts. 6-7; Dir. Art. 10
  FINE_CAP_MONTHS: 3, // Proc. Arts. 29-32: cap 3 months' rent of the contract
  CASH_PENALTY_PERCENT: 10, // Dir. Art. 22: 10% of one month's rent per cash payment
  VACANCY_MONITOR_MONTHS: 6, // Dir. Art. 20: vacancy monitoring beyond six months
  NEW_BUILD_EXEMPTION_MONTHS: 48, // Proc. Art. 10(1): new construction 4 years
  VACANT_EXEMPTION_MONTHS: 24, // Proc. Art. 10(2): vacant 2 years
  PUBLICATION_MONTH: 6, PUBLICATION_DAY: 1, // Proc. Art. 8: June 1 publication
  EFFECT_MONTH: 6, EFFECT_DAY: 30, // Proc. Art. 8: June 30 effect
} as const;

// Nine-point checklist — Directive Arts. 6-9 (M4). Order is the registrar's
// verification sequence at the woreda front desk.
export const NINE_POINT_CHECKLIST = [
  { orderNo: 1, code: "CL-1", requirement: "Written on the current Bureau model contract version", basis: "Proc. Art. 5; Dir. Art. 4" },
  { orderNo: 2, code: "CL-2", requirement: "Parties' identification verified: original presented, copy attached", basis: "Dir. Art. 7" },
  { orderNo: 3, code: "CL-3", requirement: "Ownership evidence presented (holding certificate, confirmation, court-sale or inheritance document)", basis: "Dir. Art. 6" },
  { orderNo: 4, code: "CL-4", requirement: "Lease term not less than two years", basis: "Proc. Art. 6" },
  { orderNo: 5, code: "CL-5", requirement: "Rent amount recorded and within the published ceiling", basis: "Proc. Arts. 8-9" },
  { orderNo: 6, code: "CL-6", requirement: "Advance payment not more than two months", basis: "Proc. Art. 12" },
  { orderNo: 7, code: "CL-7", requirement: "Electronic payment method confirmed at the woreda", basis: "Proc. Art. 13; Dir. Art. 16(4)" },
  { orderNo: 8, code: "CL-8", requirement: "Three witnesses named with identification", basis: "Model agreement; Dir. Art. 7" },
  { orderNo: 9, code: "CL-9", requirement: "Interpreter flow completed for deaf parties; proxy documents complete for agents", basis: "Dir. Arts. 7-8" },
] as const;

// ---------------------------------------------------------------------------
// Working-day calendar (Dir. Art. 14 city configuration: MON-FRI work week;
// national holidays configurable at city level, not encoded here).
// ---------------------------------------------------------------------------
export function addWorkingDays(start: Date, workingDays: number): Date {
  const d = new Date(start.getTime());
  let added = 0;
  while (added < workingDays) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay(); // 0 Sun, 6 Sat
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function addCalendarDays(start: Date, days: number): Date {
  const d = new Date(start.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMonths(start: Date, months: number): Date {
  const d = new Date(start.getTime());
  const dayOfMonth = d.getUTCDate();
  d.setUTCDate(1); // avoid overflow before setting the month
  d.setUTCMonth(d.getUTCMonth() + months);
  // Clamp to the last day of the target month (Jan 31 + 1 month -> Feb 28)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dayOfMonth, lastDay));
  return d;
}

export function addYears(start: Date, years: number): Date {
  return addMonths(start, years * 12);
}

// ---------------------------------------------------------------------------
// M1 — Party identity verification (Dir. Art. 7 original-and-copy rule)
// ---------------------------------------------------------------------------
export type IdCheck = { idOriginalSeen: boolean; idCopyAttached: boolean };
export function isPartyIdentityComplete(c: IdCheck): boolean {
  return c.idOriginalSeen && c.idCopyAttached;
}

// Proxy acting for a party requires proxy identification and two witness
// names on the proxy documents (Dir. Art. 7).
export type ProxyCheck = { proxyName?: string | null; proxyIdNumber?: string | null; proxyWitness1Name?: string | null; proxyWitness2Name?: string | null };
export function isProxyDocumentationComplete(p: ProxyCheck): boolean {
  return Boolean(p.proxyName && p.proxyIdNumber && p.proxyWitness1Name && p.proxyWitness2Name);
}

// ---------------------------------------------------------------------------
// M2 — Exemption clocks (Proc. Art. 10): new construction 4 years from
// completion; vacant house 2 years from vacancy. Occupied: no exemption.
// ---------------------------------------------------------------------------
export function computeExemptionEndsAt(statusExemptionMonths: number | null, statusSetAt: Date): { endsAt: Date | null; basis: string } {
  if (statusExemptionMonths == null) {
    return { endsAt: null, basis: "Proc. Arts. 2, 10: occupied house is within the adjustment regime; no exemption clock." };
  }
  const endsAt = addMonths(statusSetAt, statusExemptionMonths);
  const years = statusExemptionMonths / 12;
  return {
    endsAt,
    basis: `Proc. Art. 10: ${years}-year exemption clock from ${statusExemptionMonths === LAW.NEW_BUILD_EXEMPTION_MONTHS ? "construction completion" : "vacancy"}.`,
  };
}

export function isExempt(exemptionEndsAt: Date | null, on: Date = new Date()): boolean {
  return exemptionEndsAt != null && on.getTime() < exemptionEndsAt.getTime();
}

// ---------------------------------------------------------------------------
// M3/M4 — Lease validation (Proc. Arts. 4, 6, 12, 13)
// ---------------------------------------------------------------------------
export type LeaseValidation =
  | { ok: true }
  | { ok: false; rule: string; message: string };

export function validateLease(input: {
  leaseStart: Date; leaseEnd: Date; monthlyRent: number;
  prepaymentMonths: number; paymentMethodConfirmed: boolean; paymentMethod?: string | null;
  minLeaseYears?: number; maxPrepayMonths?: number;
}): LeaseValidation {
  const minYears = input.minLeaseYears ?? LAW.MIN_LEASE_YEARS;
  const maxPrepay = input.maxPrepayMonths ?? LAW.MAX_PREPAYMENT_MONTHS;
  const earliestEnd = addYears(input.leaseStart, minYears);
  if (input.leaseEnd.getTime() < earliestEnd.getTime()) {
    return { ok: false, rule: "Proc. Art. 6", message: `Lease term must be at least ${minYears} years (until ${earliestEnd.toISOString().slice(0, 10)}).` };
  }
  if (!(input.monthlyRent > 0)) {
    return { ok: false, rule: "Proc. Art. 5", message: "Monthly rent must be recorded." };
  }
  if (input.prepaymentMonths > maxPrepay) {
    return { ok: false, rule: "Proc. Art. 12", message: `Advance payment cannot exceed ${maxPrepay} months' rent.` };
  }
  if (!input.paymentMethodConfirmed) {
    return { ok: false, rule: "Proc. Art. 13; Dir. Art. 16(4)", message: "Payment method must be confirmed at the woreda (electronic channel only)." };
  }
  return { ok: true };
}

// Witnesses on the executed contract: exactly three (model agreement).
export function validateWitnesses(count: number): LeaseValidation {
  if (count !== 3) return { ok: false, rule: "Model agreement", message: `Exactly three witnesses are required (found ${count}).` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// M5 — Adjustment calendar and ceiling math (Proc. Arts. 8-11; Dir. Art. 11)
// ---------------------------------------------------------------------------
export function publicationDate(year: number): Date {
  return new Date(Date.UTC(year, LAW.PUBLICATION_MONTH - 1, LAW.PUBLICATION_DAY));
}
export function effectDate(year: number): Date {
  return new Date(Date.UTC(year, LAW.EFFECT_MONTH - 1, LAW.EFFECT_DAY));
}

export function amendmentWindowEndsAt(year: number): Date {
  // Proc. Arts. 6-7; Dir. Art. 10: amendments affected by the new rate set are
  // registered within 30 working days after effect.
  return addWorkingDays(effectDate(year), LAW.AMENDMENT_WINDOW_WORKING_DAYS);
}

// Ceiling baseline after an adjustment: Bureau study percentage applied to
// the last registered rent of the contract (Proc. Art. 8(2) mechanism).
export function ceilingAfterAdjustment(lastRent: number, percentage: number): number {
  return Math.round(lastRent * (1 + percentage / 100) * 100) / 100;
}

// Proc. Art. 9: no increase above the ceiling; decreases are not restricted.
export function validateIncreaseAgainstCeiling(currentRent: number, proposedRent: number, ceilingRent: number): LeaseValidation {
  if (proposedRent <= currentRent) return { ok: true };
  if (proposedRent > ceilingRent) {
    return { ok: false, rule: "Proc. Arts. 8-9", message: `Proposed rent ${proposedRent} exceeds the published ceiling ${ceilingRent}.` };
  }
  return { ok: true };
}

// Exemption interaction (Proc. Art. 10): a rate adjustment does not apply to
// a house whose exemption window covers the effect date.
export function isAdjustmentApplicable(exemptionEndsAt: Date | null, effect: Date): boolean {
  return !isExempt(exemptionEndsAt, effect);
}

// ---------------------------------------------------------------------------
// M6 — Payment ledger (Proc. Arts. 12-14; Dir. Art. 22 cash referral)
// ---------------------------------------------------------------------------
export function cashPenaltyAmount(monthlyRent: number): number {
  return Math.round(monthlyRent * (LAW.CASH_PENALTY_PERCENT / 100) * 100) / 100;
}

// ---------------------------------------------------------------------------
// M8/M12 — Dispute clocks (Proc. Arts. 20-26; Dir. Arts. 17-19)
// ---------------------------------------------------------------------------
export function complaintDecisionDue(receivedAt: Date): Date {
  return addWorkingDays(receivedAt, LAW.COMPLAINT_DECISION_WORKING_DAYS);
}
export function appealDeadline(decidedAt: Date): Date {
  return addCalendarDays(decidedAt, LAW.APPEAL_WINDOW_DAYS);
}
export function committeeHearingDue(filedAt: Date): Date {
  return addCalendarDays(filedAt, LAW.COMMITTEE_WINDOW_DAYS);
}
export function isAppealFiledInTime(filedAt: Date, decidedAt: Date): boolean {
  return filedAt.getTime() <= appealDeadline(decidedAt).getTime();
}

// ---------------------------------------------------------------------------
// M9 — Penalty ladder (Proc. Arts. 29-32; Dir. Art. 22)
// ---------------------------------------------------------------------------
export type PenaltyBand = { code: string; percent: number };

// Vacancy surcharge bands — Dir. Art. 22(8-9): vacancy without service
// 1-2y: 5%, 2-3y: 10%, 3-4y: 15%, 4-5y: 20%, above 5y: 25%.
export function vacancySurchargeBand(yearsVacant: number): PenaltyBand {
  if (yearsVacant > 5) return { code: "PEN-VAC-25", percent: 25 };
  if (yearsVacant > 4) return { code: "PEN-VAC-20", percent: 20 };
  if (yearsVacant > 3) return { code: "PEN-VAC-15", percent: 15 };
  if (yearsVacant > 2) return { code: "PEN-VAC-10", percent: 10 };
  if (yearsVacant > 1) return { code: "PEN-VAC-5", percent: 5 };
  throw new RangeError("Vacancy surcharge applies above one year without service (Dir. Art. 22(8)).");
}

// Surcharge base: annual rent of the house (percentage of one year's rent).
// Interpretation documented for legal validation at Gate G6 (Dir. Art. 22).
export function vacancySurchargeAmount(monthlyRent: number, yearsVacant: number): { band: PenaltyBand; amount: number } {
  const band = vacancySurchargeBand(yearsVacant);
  const amount = Math.round(monthlyRent * 12 * (band.percent / 100) * 100) / 100;
  return { band, amount };
}

// Global cap: administrative fine cannot exceed 3 months' rent of the
// affected contract (Proc. Arts. 29-32).
export function capFine(amount: number, monthlyRent: number): { amount: number; capped: boolean } {
  const cap = monthlyRent * LAW.FINE_CAP_MONTHS;
  if (amount > cap) return { amount: Math.round(cap * 100) / 100, capped: true };
  return { amount: Math.round(amount * 100) / 100, capped: false };
}

// Multiple-of-monthly-rent offense (Dir. Art. 22 ladder; O1 configurable).
export function offenseFineAmount(monthlyRent: number, multiple: number): { amount: number; capped: boolean } {
  return capFine(monthlyRent * multiple, monthlyRent);
}

// ---------------------------------------------------------------------------
// M10 — Tier replication path (Dir. Art. 13: woreda -> sub-city -> Bureau ->
// Ministry upward change propagation)
// ---------------------------------------------------------------------------
export function replicationHopCount(tier: string): number {
  switch (tier) {
    case "WOREDA": return 3;
    case "SUB_CITY": return 2;
    case "BUREAU": return 1;
    default: return 0; // MINISTRY is the top of the chain
  }
}

// ---------------------------------------------------------------------------
// Numbering (Dir. Art. 9): file numbers and registry book entries are
// woreda-scoped and sequential.
// ---------------------------------------------------------------------------
export function fileNumberFor(woredaCode: string, year: number, seq: number): string {
  return `${woredaCode}/${year}/${String(seq).padStart(4, "0")}`;
}
export function certificateNumberFor(fileNumber: string): string {
  return `CERT-${fileNumber.replace(/\//g, "-")}`;
}
// Registry book: 50 entries per page (Dir. Art. 9 registry book format).
export function registryBookPosition(entryNumber: number): { entryNumber: number; pageNumber: number } {
  return { entryNumber, pageNumber: Math.floor((entryNumber - 1) / 50) + 1 };
}
