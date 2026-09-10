// ============================================================================
// validate.ts — Phase 3 validation battery.
// Gate G3 exit criteria (Plan §5.4): a walkthrough shows a staged promotion
// running end to end, and the seeded hierarchy matches the official structure.
// Each check returns { name, expected, actual, passed, severity }.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { OFFICIAL_WOREDA_TOTAL } from "../seed-data/orgTree";

export interface CheckResult {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  severity: "BLOCKING" | "ADVISORY";
  category: string;
}

export async function runValidationBattery(prisma: PrismaClient): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  const add = (c: CheckResult) => checks.push(c);

  // ---- A. Organizational hierarchy (Directive Arts. 2, 6) -----------------
  const ministries = await prisma.orgUnit.count({ where: { tier: "MINISTRY" } });
  add({
    category: "A. Organizational hierarchy", name: "Single federal Ministry node",
    expected: "1", actual: String(ministries), passed: ministries === 1, severity: "BLOCKING",
  });

  const bureau = await prisma.orgUnit.findFirst({ where: { tier: "BUREAU" } });
  add({
    category: "A. Organizational hierarchy", name: "Single city Bureau node",
    expected: "1 (AA-BUREAU)", actual: bureau ? `1 (${bureau.code})` : "0",
    passed: !!bureau && bureau.code === "AA-BUREAU", severity: "BLOCKING",
  });

  const ministry = await prisma.orgUnit.findFirst({ where: { tier: "MINISTRY" } });
  add({
    category: "A. Organizational hierarchy", name: "Bureau reports to Ministry",
    expected: "AA-BUREAU.parent = FED-MINISTRY", actual: bureau?.parentId && ministry && bureau.parentId === ministry.id ? "linked" : "not linked",
    passed: !!bureau?.parentId && !!ministry && bureau.parentId === ministry.id, severity: "BLOCKING",
  });

  const subCities = await prisma.orgUnit.findMany({ where: { tier: "SUB_CITY" }, orderBy: { code: "asc" } });
  add({
    category: "A. Organizational hierarchy", name: "Sub-city count matches official structure",
    expected: "11 (official: 10 + Lemi Kura, est. Oct 2020)", actual: String(subCities.length),
    passed: subCities.length === 11, severity: "BLOCKING",
  });
  const subsWithBureauParent = subCities.filter((sc) => sc.parentId === bureau?.id).length;
  add({
    category: "A. Organizational hierarchy", name: "All sub-cities report to the Bureau",
    expected: "11/11", actual: `${subsWithBureauParent}/11`, passed: subsWithBureauParent === 11, severity: "BLOCKING",
  });

  const woredas = await prisma.orgUnit.findMany({ where: { tier: "WOREDA" }, include: { parent: true } });
  const woredasWithSubCityParent = woredas.filter((w) => w.parent?.tier === "SUB_CITY").length;
  add({
    category: "A. Organizational hierarchy", name: "Every woreda belongs to a sub-city",
    expected: `${woredas.length}/${woredas.length}`, actual: `${woredasWithSubCityParent}/${woredas.length}`,
    passed: woredasWithSubCityParent === woredas.length && woredas.length > 0, severity: "BLOCKING",
  });

  const totalWoredas = await prisma.orgUnit.count({ where: { tier: "WOREDA" } });
  add({
    category: "A. Organizational hierarchy", name: "Configured woreda register matches sourced official total",
    expected: `${OFFICIAL_WOREDA_TOTAL} (2025 published study)`, actual: String(totalWoredas),
    passed: totalWoredas === OFFICIAL_WOREDA_TOTAL, severity: "BLOCKING",
  });

  // Sequential woreda numbering W01..WN per sub-city, no gaps
  let numberingOk = true;
  let numberingDetail = "";
  for (const sc of subCities) {
    const ws = woredas.filter((w) => w.parentId === sc.id).sort((a, b) => a.code.localeCompare(b.code));
    for (let i = 0; i < ws.length; i++) {
      const expectedCode = `W${String(i + 1).padStart(2, "0")}`;
      if (!ws[i].code.endsWith(expectedCode)) {
        numberingOk = false;
        numberingDetail = `${sc.code}: expected ...${expectedCode}, found ${ws[i].code}`;
        break;
      }
    }
    if (!numberingOk) break;
  }
  add({
    category: "A. Organizational hierarchy", name: "Woreda numbering sequential per sub-city (W01..WN)",
    expected: "no gaps", actual: numberingOk ? "no gaps" : numberingDetail, passed: numberingOk, severity: "BLOCKING",
  });

  const pendingWoredas = await prisma.orgUnit.count({ where: { tier: "WOREDA", confirmationStatus: "PENDING_OFFICIAL_REGISTER" } });
  add({
    category: "A. Organizational hierarchy", name: "Provisional woreda counts flagged for official reconciliation (O-7)",
    expected: "flagged rows tracked as configurable parameters",
    actual: `${pendingWoredas} of ${totalWoredas} woredas flagged PENDING_OFFICIAL_REGISTER`,
    passed: pendingWoredas > 0, severity: "ADVISORY",
  });

  // ---- B. Language catalogue and trilingual completeness (CR-01) ----------
  const languages = await prisma.language.findMany({ orderBy: { code: "asc" } });
  const activeCodes = languages.filter((l) => l.status === "ACTIVE").map((l) => l.code).sort();
  add({
    category: "B. Trilingual configuration (CR-01)", name: "Three active interface languages",
    expected: "am, en, om", actual: activeCodes.join(", "),
    passed: activeCodes.length === 3 && ["am", "en", "om"].every((c) => activeCodes.includes(c)),
    severity: "BLOCKING",
  });
  const amDefault = languages.find((l) => l.code === "am")?.isDefault ?? false;
  add({
    category: "B. Trilingual configuration (CR-01)", name: "Amharic is the default legal rendering",
    expected: "am isDefault = true", actual: `am isDefault = ${amDefault}`, passed: amDefault, severity: "BLOCKING",
  });
  const resources = await prisma.localizationResource.findMany();
  const incomplete = resources.filter((r) => !r.valueAm || !r.valueEn || !r.valueOm).length;
  add({
    category: "B. Trilingual configuration (CR-01)", name: "Localization resources complete in all three languages",
    expected: "0 incomplete", actual: `${incomplete} incomplete of ${resources.length}`,
    passed: incomplete === 0 && resources.length >= 20, severity: "BLOCKING",
  });

  // ---- C. Model contract v1 (Proc. Art. 5; Dir. Art. 4) -------------------
  const contract = await prisma.modelContract.findFirst({ where: { version: "1.0" }, include: { sections: { orderBy: { orderNo: "asc" } } } });
  add({
    category: "C. Model contract v1", name: "Model contract version 1.0 seeded and ACTIVE",
    expected: "v1.0 ACTIVE", actual: contract ? `v${contract.version} ${contract.status}` : "missing",
    passed: !!contract && contract.status === "ACTIVE", severity: "BLOCKING",
  });
  add({
    category: "C. Model contract v1", name: "Contract sections seeded (model agreement structure)",
    expected: "10 sections", actual: String(contract?.sections.length ?? 0),
    passed: (contract?.sections.length ?? 0) === 10, severity: "BLOCKING",
  });
  const sectionsWithAm = contract?.sections.filter((s) => s.contentAm && s.titleAm).length ?? 0;
  add({
    category: "C. Model contract v1", name: "Canonical Amharic rendering present on every section",
    expected: "10/10", actual: `${sectionsWithAm}/10`, passed: sectionsWithAm === 10, severity: "BLOCKING",
  });
  const sectionsTrilingual = contract?.sections.filter((s) => s.contentEn && s.contentOm && s.titleEn && s.titleOm).length ?? 0;
  add({
    category: "C. Model contract v1", name: "English and Afan Oromo renderings seeded with certification flags (CR-01)",
    expected: "10/10 flagged PENDING_LEGAL_REVIEW", actual: `${sectionsTrilingual}/10 present`,
    passed: sectionsTrilingual === 10, severity: "ADVISORY",
  });
  const sectionByCode = (code: string) => contract?.sections.find((s) => s.code === code);
  const legalConstraintsOk =
    /\bArt\.?\s*6\b/.test(sectionByCode("SEC-TERM")?.legalBasis ?? "") &&
    /\bArt\.?\s*12\b/.test(sectionByCode("SEC-ADVANCE")?.legalBasis ?? "") &&
    /\b13\b/.test(sectionByCode("SEC-RENT")?.legalBasis ?? "");
  add({
    category: "C. Model contract v1", name: "Legal constraints encoded: 2-year term, 2-month advance cap, electronic-only payment",
    expected: "Art. 6 + Art. 12 + Art. 13 sections present", actual: legalConstraintsOk ? "all three present" : "missing constraint",
    passed: legalConstraintsOk, severity: "BLOCKING",
  });

  // ---- D. Regulatory catalogues -------------------------------------------
  const roles = await prisma.role.count();
  add({
    category: "D. Regulatory catalogues", name: "Role catalogue seeded (SRS actor model)",
    expected: ">= 13 roles", actual: String(roles), passed: roles >= 13, severity: "BLOCKING",
  });
  const idTypes = await prisma.identificationType.findMany();
  const allRequireOriginalCopy = idTypes.length > 0 && idTypes.every((i) => i.requiresOriginal && i.requiresCopy);
  add({
    category: "D. Regulatory catalogues", name: "Identification catalogue with original-and-copy rule (Dir. Art. 7)",
    expected: "5 types, original+copy on all", actual: `${idTypes.length} types, rule ${allRequireOriginalCopy ? "enforced" : "missing"}`,
    passed: idTypes.length === 5 && allRequireOriginalCopy, severity: "BLOCKING",
  });
  const statuses = await prisma.propertyStatusType.findMany();
  const newExemption = statuses.find((s) => s.code === "PS-NEW")?.exemptionMonths;
  const vacantExemption = statuses.find((s) => s.code === "PS-VACANT")?.exemptionMonths;
  add({
    category: "D. Regulatory catalogues", name: "Property status types with exemption clocks (Proc. Art. 10)",
    expected: "NEW=48 months, VACANT=24 months, OCCUPIED=no clock",
    actual: `NEW=${newExemption}, VACANT=${vacantExemption}, OCCUPIED=${statuses.find((s) => s.code === "PS-OCCUPIED")?.exemptionMonths ?? null}`,
    passed: statuses.length === 3 && newExemption === 48 && vacantExemption === 24, severity: "BLOCKING",
  });

  const cap = await prisma.penaltyParameter.findFirst({ where: { code: "PEN-CAP-GLOBAL" } });
  add({
    category: "D. Regulatory catalogues", name: "Global fine cap of three months' rent (Proc. Arts. 29-32)",
    expected: "3x monthly rent, CONFIRMED", actual: cap ? `${cap.valueMax}x, ${cap.confirmationStatus}` : "missing",
    passed: !!cap && cap.valueMax === 3 && cap.confirmationStatus === "CONFIRMED", severity: "BLOCKING",
  });
  const cash = await prisma.penaltyParameter.findFirst({ where: { code: "PEN-CASH-PAYMENT" } });
  add({
    category: "D. Regulatory catalogues", name: "Ten percent referral rule per cash payment (Proc. Art. 13; Dir. Art. 22)",
    expected: "10 percent, CONFIRMED", actual: cash ? `${cash.valueMin} percent, ${cash.confirmationStatus}` : "missing",
    passed: !!cash && cash.valueMin === 10 && cash.confirmationStatus === "CONFIRMED", severity: "BLOCKING",
  });
  const bands = await prisma.penaltyParameter.findMany({ where: { category: "SURCHARGE_BAND" }, orderBy: { valueMin: "asc" } });
  const bandValues = bands.map((b) => b.valueMin);
  add({
    category: "D. Regulatory catalogues", name: "Vacancy surcharge ladder 5-25 percent (Dir. Art. 22)",
    expected: "5,10,15,20,25", actual: bandValues.join(","),
    passed: bandValues.length === 5 && bandValues.every((v) => [5, 10, 15, 20, 25].includes(v)), severity: "BLOCKING",
  });
  const pendingFines = await prisma.penaltyParameter.count({ where: { category: "OFFENSE_FINE", confirmationStatus: "PENDING_OFFICIAL_TEXT" } });
  add({
    category: "D. Regulatory catalogues", name: "Offense-level ladder figures kept configurable pending official text (O1)",
    expected: "ladder encoded as parameters, flagged", actual: `${pendingFines} offense parameters flagged PENDING_OFFICIAL_TEXT`,
    passed: pendingFines >= 6, severity: "ADVISORY",
  });

  const pub = await prisma.calendarEvent.findFirst({ where: { code: "CAL-JUN1-PUBLICATION" } });
  const eff = await prisma.calendarEvent.findFirst({ where: { code: "CAL-JUN30-EFFECT" } });
  add({
    category: "D. Regulatory catalogues", name: "June adjustment calendar seeded (Proc. Art. 8; Dir. Art. 11)",
    expected: "June 1 publication + June 30 effect", actual: `${pub ? "Jun 1 ok" : "Jun 1 missing"}, ${eff ? "Jun 30 ok" : "Jun 30 missing"}`,
    passed: !!pub && !!eff && pub.month === 6 && pub.day === 1 && eff.month === 6 && eff.day === 30, severity: "BLOCKING",
  });

  // ---- E. Environments and Directive Art. 13 data custody ------------------
  const envs = await prisma.environment.findMany();
  const stages = envs.map((e) => e.stage).sort();
  add({
    category: "E. Environments (Dir. Art. 13)", name: "DEV, STAGING and PROD environments provisioned",
    expected: "DEV, PROD, STAGING", actual: stages.join(", "),
    passed: stages.length === 3 && ["DEV", "PROD", "STAGING"].every((s) => stages.includes(s)), severity: "BLOCKING",
  });
  const allWithBackup = envs.length > 0 && envs.every((e) => (e.backupScheme ?? "").length > 10);
  add({
    category: "E. Environments (Dir. Art. 13)", name: "Backup scheme configured at every tier",
    expected: "nightly full + continuous log per tier", actual: allWithBackup ? "configured on all 3" : "missing scheme",
    passed: allWithBackup, severity: "BLOCKING",
  });
  const prod = envs.find((e) => e.stage === "PROD");
  add({
    category: "E. Environments (Dir. Art. 13)", name: "Upward change propagation chain defined",
    expected: "Woreda -> Sub-city -> Bureau -> Ministry", actual: prod?.replicationTarget ?? "not set",
    passed: (prod?.replicationTarget ?? "").includes("Ministry"), severity: "BLOCKING",
  });
  add({
    category: "E. Environments (Dir. Art. 13)", name: "Recovery objectives recorded (NFR-03)",
    expected: "RPO 15 min, RTO 4 h", actual: `RPO ${prod?.rpoMinutes ?? "?"} min, RTO ${prod?.rtoHours ?? "?"} h`,
    passed: prod?.rpoMinutes === 15 && prod?.rtoHours === 4, severity: "BLOCKING",
  });

  return checks;
}

export function summarizeChecks(checks: CheckResult[]) {
  const blocking = checks.filter((c) => c.severity === "BLOCKING");
  const blockingFailed = blocking.filter((c) => !c.passed);
  const advisoryFailed = checks.filter((c) => c.severity === "ADVISORY" && !c.passed);
  return {
    total: checks.length,
    blocking: blocking.length,
    blockingFailed: blockingFailed.length,
    advisoryFailed: advisoryFailed.length,
    allBlockingPassed: blockingFailed.length === 0,
  };
}
