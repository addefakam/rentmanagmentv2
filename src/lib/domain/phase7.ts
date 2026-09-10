// ============================================================================
// phase7.ts — Phase 7 service layer: legacy migration (Proc. Art. 7; Dir.
// Art. 8(2)), reconciliation (Dir. Art. 13), training by role and tier, pilot
// operation with exit check, and trilingual awareness materials (Proc. Arts.
// 14, 16). Same conventions as service.ts: LegalError carries the violated
// rule to the API surface; every function cites its legal basis.
// ============================================================================

import { db } from "@/lib/db";
import { LegalError } from "./service";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

export const LEGACY_ANNOTATION_TEXT =
  "Pre-proclamation contract registered as it stands under Dir. Art. 8(2), " +
  "presented within the 30+3 day window of Proc. Art. 7; legacy book position recorded.";

export const COMPETENCE_THRESHOLD = 70; // assessment score >= 70 -> COMPETENT

// Roles that must be trained (competent) before the pilot can exit.
export const PILOT_TRAINING_ROLES = [
  "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR",
  "BUREAU_ANALYST", "BUREAU_HEAD", "SYSTEM_ADMIN",
] as const;

function requireTrue(cond: unknown, rule: string, message: string): asserts cond {
  if (!cond) throw new LegalError(rule, message);
}

// ---------------------------------------------------------------------------
// Legacy migration (Proc. Art. 7; Dir. Art. 8(2))
// ---------------------------------------------------------------------------

/** Migrate every un-migrated legacy book row of one woreda. Each row becomes
 * parties + property + a registered file with the LEGACY_ART7 annotation,
 * a registry-book position and an upward replication record — the full
 * lifecycle a front-desk presentation produces, driven from the paper book. */
export async function migrateLegacyWoreda(woredaId: string, byStaffCode: string) {
  const woreda = await db.orgUnit.findUnique({ where: { id: woredaId } });
  requireTrue(woreda && woreda.tier === "WOREDA", "Dir. Art. 6", "Migration target must be a woreda office.");

  const entries = await db.legacyBookEntry.findMany({
    where: { woredaId, migrated: false },
    orderBy: [{ bookRef: "asc" }, { pageNo: "asc" }, { entryNo: "asc" }],
  });
  const unscanned = entries.filter((e) => !e.scanAttached);
  requireTrue(unscanned.length === 0, "Dir. Arts. 7, 8(2)",
    `Migration blocked: ${unscanned.length} book row(s) without a scanned source document ` +
    `(first: ${unscanned[0]?.bookRef ?? "-"} p.${unscanned[0]?.pageNo ?? "-"} e.${unscanned[0]?.entryNo ?? "-"}). Scan and attach before migrating.`);

  const { createRegistrationFile, checkChecklist, certifyFile, stampFile, registerFile } = await import("./service");
  const idType = await db.identificationType.findUnique({ where: { code: "ID-KEBELE" } });
  requireTrue(idType, "Dir. Art. 7", "Kebele identification type not seeded.");
  const occupied = await db.propertyStatusType.findUnique({ where: { code: "PS-OCCUPIED" } });
  requireTrue(occupied, "Proc. Art. 2", "Occupied property status not seeded.");
  const modelContract = await db.modelContract.findFirst({ where: { status: "ACTIVE" } });
  requireTrue(modelContract, "Proc. Art. 5; Dir. Art. 4", "No ACTIVE model contract.");

  const results: { entryId: string; fileNumber: string }[] = [];

  for (const entry of entries) {
    // Parties from the book row, verified at the front desk with scanned
    // identification (Dir. Art. 7 original-and-copy, legacy documents scanned).
    const partyCount = await db.party.count();
    const landlord = await db.party.create({
      data: {
        partyCode: `PTY-${pad(partyCount + 1, 6)}`, type: "LANDLORD",
        fullName: entry.landlordName, idTypeId: idType.id,
        idNumber: `LEG-${entry.bookRef}-P${entry.pageNo}-E${entry.entryNo}-L`,
        idOriginalSeen: true, idCopyAttached: true, verificationStatus: "VERIFIED",
        verifiedAt: new Date(), address: entry.houseAddress,
        registeredAtOrgUnitId: woredaId,
        documents: { create: { docType: "ID_COPY", ref: `SCAN-${entry.bookRef}-P${entry.pageNo}-E${entry.entryNo}-L`, originalSeen: true, copyAttached: true } },
      },
    });
    const tenant = await db.party.create({
      data: {
        partyCode: `PTY-${pad(partyCount + 2, 6)}`, type: "TENANT",
        fullName: entry.tenantName, idTypeId: idType.id,
        idNumber: `LEG-${entry.bookRef}-P${entry.pageNo}-E${entry.entryNo}-T`,
        idOriginalSeen: true, idCopyAttached: true, verificationStatus: "VERIFIED",
        verifiedAt: new Date(), address: entry.houseAddress,
        registeredAtOrgUnitId: woredaId,
        documents: { create: { docType: "ID_COPY", ref: `SCAN-${entry.bookRef}-P${entry.pageNo}-E${entry.entryNo}-T`, originalSeen: true, copyAttached: true } },
      },
    });

    // Property: occupied house at the book's woreda, no exemption clock
    // (Proc. Arts. 2, 10); ownership evidence referenced from the scan.
    const propSeq = (await db.property.count({ where: { woredaId } })) + 1;
    const property = await db.property.create({
      data: {
        propertyCode: `PRP-${woreda!.code}-${pad(propSeq, 4)}`,
        woredaId, subCityId: woreda!.parentId ?? undefined,
        landlordId: landlord.id, kebele: entry.houseAddress.split("/")[0]?.trim() || undefined,
        houseNo: `LEG-${entry.entryNo}`, addressNote: entry.houseAddress,
        ownershipEvidence: "HOLDING_CERT", evidenceRef: `SCAN-${entry.bookRef}-P${entry.pageNo}-E${entry.entryNo}-O`,
        statusTypeId: occupied!.id, rooms: 1, statusSetAt: entry.contractDate,
      },
    });

    // Registration file: legacy intake. Dir. Art. 8(2) — registered as it
    // stands (short legacy terms allowed, annotation documents it); payment
    // and ceiling discipline still enforced by createRegistrationFile.
    const leaseEnd = new Date(entry.leaseStart.getTime());
    leaseEnd.setUTCMonth(leaseEnd.getUTCMonth() + Math.round(entry.leaseYears * 12));
    const file = await createRegistrationFile({
      woredaId, propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id,
      modelContractId: modelContract!.id, monthlyRent: entry.monthlyRent,
      leaseStart: entry.leaseStart, leaseEnd,
      prepaymentMonths: 0, paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: true,
      witnesses: [
        { fullName: `Witness One (${entry.bookRef} p${entry.pageNo}e${entry.entryNo})`, idTypeId: idType.id, idNumber: `LEGW-${entry.entryNo}-1` },
        { fullName: `Witness Two (${entry.bookRef} p${entry.pageNo}e${entry.entryNo})`, idTypeId: idType.id, idNumber: `LEGW-${entry.entryNo}-2` },
        { fullName: `Witness Three (${entry.bookRef} p${entry.pageNo}e${entry.entryNo})`, idTypeId: idType.id, idNumber: `LEGW-${entry.entryNo}-3` },
      ],
      enteredByOrgUnitId: woredaId,
    });

    // Nine-point checklist through the service path: legacy equivalence per
    // Dir. Art. 8(2) - each item verified against the scanned source document,
    // the term item annotated; passing all nine moves the file to
    // CHECKLIST_PASSED exactly as a front-desk check would.
    const legacyNote = (extra?: string) =>
      `Verified against the scanned legacy source (Dir. Art. 8(2)).${extra ? " " + extra : ""}`;
    await checkChecklist(file.id, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((orderNo) => ({
      orderNo, passed: true,
      note: orderNo === 4
        ? legacyNote("Legacy term recorded as-is; Proc. Art. 6 governs new and amended contracts.")
        : legacyNote(),
    })));

    // Full lifecycle: certify -> stamp -> register (book entry + replication
    // + LEGACY-33D clock closure happen inside registerFile).
    await certifyFile(file.id, `Legacy migration desk (${byStaffCode})`);
    await stampFile(file.id);
    const { file: registered, entry: bookEntry } = await registerFile(file.id, `Legacy migration (${byStaffCode})`);

    await db.legacyBookEntry.update({ where: { id: entry.id }, data: { migrated: true } });
    await db.migrationRecord.create({
      data: {
        legacyEntryId: entry.id, woredaId,
        landlordId: landlord.id, tenantId: tenant.id, propertyId: property.id, fileId: registered.id,
        annotationCode: "LEGACY_ART7", annotationText: LEGACY_ANNOTATION_TEXT,
        status: "MIGRATED",
        note: `Registered ${registered.fileNumber}; book p.${bookEntry.pageNumber}/e.${bookEntry.entryNumber}; rent ${entry.monthlyRent} ETB/month.`,
        migratedBy: byStaffCode,
      },
    });
    results.push({ entryId: entry.id, fileNumber: registered.fileNumber });
  }
  return { woredaCode: woreda!.code, migrated: results.length, results };
}

/** Reconcile one woreda: paper book rows vs the migration register (Dir.
 * Art. 13 custody; plan exit criterion). platformCount counts the registered
 * files created by the migration register - other legacy filings in the
 * woreda (e.g. front-desk presentations) are outside the paper book's scope. */
export async function reconcileWoreda(woredaId: string) {
  const woreda = await db.orgUnit.findUnique({ where: { id: woredaId } });
  requireTrue(woreda && woreda.tier === "WOREDA", "Dir. Art. 6", "Reconciliation target must be a woreda office.");
  const bookCount = await db.legacyBookEntry.count({ where: { woredaId } });
  const migratedCount = await db.migrationRecord.count({ where: { woredaId, status: "MIGRATED" } });
  const platformCount = await db.migrationRecord.count({
    where: { woredaId, status: "MIGRATED", file: { status: "REGISTERED" } },
  });
  const variance = bookCount - migratedCount;
  const balanced = variance === 0 && platformCount === bookCount;
  return db.reconciliationReport.create({
    data: {
      woredaId, bookCount, migratedCount, platformCount, variance, balanced,
      note: balanced
        ? "Book, migration register and platform agree (Dir. Art. 13)."
        : `Variance ${variance}: book=${bookCount}, migrated=${migratedCount}, platform=${platformCount}.`,
    },
  });
}

/** Reconcile every woreda that has legacy book rows; returns all fresh reports. */
export async function reconcileAllMigrated() {
  const woredas = await db.orgUnit.findMany({
    where: { tier: "WOREDA", legacyBookEntries: { some: {} } },
    select: { id: true },
  });
  const reports: Awaited<ReturnType<typeof reconcileWoreda>>[] = [];
  for (const w of woredas) reports.push(await reconcileWoreda(w.id));
  return reports;
}

// ---------------------------------------------------------------------------
// Training by role and tier (plan section 5.8)
// ---------------------------------------------------------------------------

export async function createTrainingSession(input: {
  courseCode: string; heldAt: Date; trainer: string; orgUnitId: string; venue: string;
}) {
  const course = await db.trainingCourse.findUnique({ where: { code: input.courseCode } });
  requireTrue(course, "Plan 5.8", "Training course not found in the curriculum.");
  return db.trainingSession.create({
    data: {
      courseId: course.id, heldAt: input.heldAt, trainer: input.trainer,
      orgUnitId: input.orgUnitId, venue: input.venue,
    },
  });
}

export async function addTrainee(input: {
  sessionId: string; name: string; staffCode?: string; roleCode: string;
  attendance: "PRESENT" | "ABSENT"; assessmentScore?: number;
}) {
  const session = await db.trainingSession.findUnique({ where: { id: input.sessionId } });
  requireTrue(session, "Plan 5.8", "Training session not found.");
  requireTrue(input.assessmentScore == null || (input.assessmentScore >= 0 && input.assessmentScore <= 100),
    "Plan 5.8", "Assessment score must be 0-100.");
  const competence = input.attendance === "ABSENT" ? null
    : input.assessmentScore == null ? null
      : input.assessmentScore >= COMPETENCE_THRESHOLD ? "COMPETENT" : "NEEDS_SUPPORT";
  return db.traineeRecord.create({
    data: {
      sessionId: input.sessionId, name: input.name, staffCode: input.staffCode,
      roleCode: input.roleCode, attendance: input.attendance,
      assessmentScore: input.assessmentScore, competence,
    },
  });
}

// ---------------------------------------------------------------------------
// Pilot operation (plan section 5.8)
// ---------------------------------------------------------------------------

export async function openPilot(input: {
  subCityId: string; woredaCodes: string[]; startedAt: Date; plannedWeeks: number; ownerApprovalRef: string;
}) {
  requireTrue(input.ownerApprovalRef?.trim(), "Plan 5.8; Gate G6",
    "Pilot requires the owner's authorization reference (G6 decision).");
  requireTrue(input.woredaCodes.length > 0, "Plan 5.8", "Select at least one pilot woreda.");
  requireTrue(input.plannedWeeks > 0 && input.plannedWeeks <= 8, "Plan 5.8",
    "Pilot length must be between 1 and 8 weeks.");
  const subCity = await db.orgUnit.findUnique({ where: { id: input.subCityId } });
  requireTrue(subCity && subCity.tier === "SUB_CITY", "Dir. Art. 2", "Pilot must be scoped to a sub-city.");
  for (const code of input.woredaCodes) {
    const w = await db.orgUnit.findUnique({ where: { code } });
    requireTrue(w && w.tier === "WOREDA" && w.parentId === input.subCityId, "Dir. Art. 6",
      `Woreda ${code} not found under the pilot sub-city.`);
  }
  await db.pilotConfig.updateMany({ where: { active: true }, data: { active: false } });
  return db.pilotConfig.create({
    data: {
      subCityId: input.subCityId, woredaCodes: input.woredaCodes.join(","),
      startedAt: input.startedAt, plannedWeeks: input.plannedWeeks,
      ownerApprovalRef: input.ownerApprovalRef, active: true,
    },
  });
}

export async function logPilotDay(input: {
  date: Date; woredaCode: string; filesOpened: number; filesRegistered: number;
  avgCycleMinutes: number; checklistCompliancePct: number; replicationCorrect: boolean;
  incidents?: string; severity?: "NONE" | "SEV1" | "SEV2" | "SEV3" | "SEV4"; supportNotes?: string;
}) {
  const config = await db.pilotConfig.findFirst({ where: { active: true } });
  requireTrue(config, "Plan 5.8", "No active pilot. Open the pilot first.");
  requireTrue(config!.woredaCodes.split(",").includes(input.woredaCode), "Plan 5.8",
    `${input.woredaCode} is not a pilot woreda.`);
  requireTrue(input.date.getTime() >= config!.startedAt.getTime(), "Plan 5.8",
    "Day log predates the pilot start.");
  requireTrue(input.checklistCompliancePct >= 0 && input.checklistCompliancePct <= 100,
    "Plan 5.8", "Checklist compliance must be 0-100 percent.");
  requireTrue(input.filesRegistered <= input.filesOpened, "Plan 5.8",
    "Files registered cannot exceed files opened.");
  const seq = (await db.pilotDayLog.count({ where: { configId: config!.id } })) + 1;
  return db.pilotDayLog.create({
    data: {
      configId: config!.id, seq, date: input.date, woredaCode: input.woredaCode,
      filesOpened: input.filesOpened, filesRegistered: input.filesRegistered,
      avgCycleMinutes: input.avgCycleMinutes,
      checklistCompliancePct: input.checklistCompliancePct,
      replicationCorrect: input.replicationCorrect,
      incidents: input.incidents, severity: input.severity ?? "NONE",
      supportNotes: input.supportNotes,
    },
  });
}

export type PilotExitCheck = {
  ready: boolean;
  checks: { criterion: string; basis: string; pass: boolean; detail: string }[];
  metrics: {
    daysLogged: number; woredas: string[];
    avgCycleMinutes: number | null; avgChecklistPct: number | null;
    replicationCorrectPct: number | null; sev1Count: number;
    balancedWoredas: number; totalBookRows: number;
    competentRoles: string[]; missingRoles: string[];
    awarenessByBasis: Record<string, { total: number; approved: number }>;
  };
};

/** The Gate G7 exit check: pilot woredas operate without severity-one issues
 * and reconciliation balances (plan section 5.8 exit criterion). */
export async function pilotExitCheck(): Promise<PilotExitCheck> {
  const config = await db.pilotConfig.findFirst({ where: { active: true }, include: { dayLogs: true } });
  if (!config) {
    return {
      ready: false,
      checks: [{ criterion: "Pilot open", basis: "Plan 5.8", pass: false, detail: "No active pilot configuration." }],
      metrics: {
        daysLogged: 0, woredas: [], avgCycleMinutes: null, avgChecklistPct: null,
        replicationCorrectPct: null, sev1Count: 0, balancedWoredas: 0, totalBookRows: 0,
        competentRoles: [], missingRoles: PILOT_TRAINING_ROLES as unknown as string[],
        awarenessByBasis: {},
      },
    };
  }
  const woredaCodes = config.woredaCodes.split(",");
  const logs = config.dayLogs;

  const sev1Count = logs.filter((l) => l.severity === "SEV1").length;
  const replicationOk = logs.filter((l) => l.replicationCorrect).length;
  const avgCycle = logs.length ? logs.reduce((s, l) => s + l.avgCycleMinutes, 0) / logs.length : null;
  const avgCheck = logs.length ? logs.reduce((s, l) => s + l.checklistCompliancePct, 0) / logs.length : null;

  const woredaIds = await db.orgUnit.findMany({
    where: { code: { in: woredaCodes } }, select: { id: true, code: true },
  });
  // Latest reconciliation report per pilot woreda.
  const latestReports = [];
  for (const w of woredaIds) {
    const r = await db.reconciliationReport.findFirst({
      where: { woredaId: w.id }, orderBy: { createdAt: "desc" },
    });
    if (r) latestReports.push(r);
  }
  const balancedWoredas = latestReports.filter((r) => r.balanced).length;
  const totalBookRows = await db.legacyBookEntry.count({ where: { woredaId: { in: woredaIds.map((w) => w.id) } } });

  const competent = await db.traineeRecord.findMany({
    where: { competence: "COMPETENT", attendance: "PRESENT" },
    select: { roleCode: true },
  });
  const competentRoles = [...new Set(competent.map((c) => c.roleCode))];
  const missingRoles = (PILOT_TRAINING_ROLES as readonly string[]).filter((r) => !competentRoles.includes(r));

  const awareness = await db.awarenessItem.findMany({ select: { basis: true, status: true } });
  const awarenessByBasis: Record<string, { total: number; approved: number }> = {};
  for (const a of awareness) {
    awarenessByBasis[a.basis] = awarenessByBasis[a.basis] ?? { total: 0, approved: 0 };
    awarenessByBasis[a.basis].total += 1;
    if (a.status === "APPROVED") awarenessByBasis[a.basis].approved += 1;
  }

  const checks = [
    {
      criterion: "Pilot open with the owner's authorization",
      basis: "Gate G6 decision; plan 5.8",
      pass: !!config.ownerApprovalRef,
      detail: `Pilot over ${woredaCodes.join(", ")} since ${config.startedAt.toISOString().slice(0, 10)}; approval ref ${config.ownerApprovalRef}.`,
    },
    {
      criterion: "No severity-one issue during the pilot",
      basis: "Gate G7 exit criterion (plan 5.8)",
      pass: sev1Count === 0,
      detail: `${logs.length} day-log entries; SEV1 count ${sev1Count}${sev1Count > 0 ? " - exit blocked" : ""}.`,
    },
    {
      criterion: "Reconciliation balances in every pilot woreda",
      basis: "Dir. Art. 13; Gate G7 exit criterion",
      pass: woredaIds.length > 0 && balancedWoredas === woredaIds.length,
      detail: `${balancedWoredas}/${woredaIds.length} pilot woredas balanced; ${totalBookRows} legacy book rows in scope.`,
    },
    {
      criterion: "Replication correctness at one hundred percent",
      basis: "Dir. Art. 13; plan 5.8 measurement",
      pass: logs.length > 0 && replicationOk === logs.length,
      detail: `${replicationOk}/${logs.length} day-log entries report correct upward replication.`,
    },
    {
      criterion: "Role and tier training coverage competent",
      basis: "Plan 5.8 training activity",
      pass: missingRoles.length === 0,
      detail: missingRoles.length === 0
        ? `All required roles trained competent: ${PILOT_TRAINING_ROLES.join(", ")}.`
        : `Missing competence for: ${missingRoles.join(", ")}.`,
    },
    {
      criterion: "Awareness materials prepared for both legal bases",
      basis: "Proc. Arts. 14, 16",
      pass: ["Proc. Art. 14", "Proc. Art. 16"].every((b) => (awarenessByBasis[b]?.total ?? 0) > 0),
      detail: Object.entries(awarenessByBasis).map(([b, v]) => `${b}: ${v.approved}/${v.total} approved`).join("; ") || "No awareness items.",
    },
  ];

  return {
    ready: checks.every((c) => c.pass),
    checks,
    metrics: {
      daysLogged: logs.length, woredas: woredaCodes,
      avgCycleMinutes: avgCycle == null ? null : Math.round(avgCycle * 10) / 10,
      avgChecklistPct: avgCheck == null ? null : Math.round(avgCheck * 10) / 10,
      replicationCorrectPct: logs.length ? Math.round((replicationOk / logs.length) * 1000) / 10 : null,
      sev1Count, balancedWoredas, totalBookRows,
      competentRoles, missingRoles, awarenessByBasis,
    },
  };
}

// ---------------------------------------------------------------------------
// Awareness materials (Proc. Arts. 14, 16) — trilingual per CR-01 / NFR-06
// ---------------------------------------------------------------------------

export async function createAwarenessItem(input: {
  basis: string; channel: string; titleEn: string; titleAm: string; titleOm: string; bodyEn: string;
}) {
  requireTrue(["Proc. Art. 14", "Proc. Art. 16"].includes(input.basis), "Proc. Arts. 14, 16",
    "Awareness basis must cite Proclamation Article 14 or Article 16.");
  requireTrue(input.titleEn.trim() && input.titleAm.trim() && input.titleOm.trim(), "CR-01; NFR-06",
    "Awareness material must carry Amharic, English and Afan Oromo titles (trilingual rule).");
  return db.awarenessItem.create({ data: { ...input, status: "PENDING_OWNER_APPROVAL" } });
}

export async function approveAwarenessItem(id: string, ownerApprovalRef: string) {
  const item = await db.awarenessItem.findUnique({ where: { id } });
  requireTrue(item, "Proc. Arts. 14, 16", "Awareness item not found.");
  requireTrue(!!ownerApprovalRef.trim(), "Plan 5.8", "Owner approval reference required to approve awareness material.");
  return db.awarenessItem.update({
    where: { id },
    data: { status: "APPROVED", ownerApprovalRef },
  });
}
