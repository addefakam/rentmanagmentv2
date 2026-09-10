// ============================================================================
// prisma/seed.ts — Phase 3 seed: applies the seeded configuration that makes
// the platform behave like the directive on day one (Plan §5.4).
// Idempotent: clears configuration-domain tables, then inserts seed values.
// Run: bunx tsx prisma/seed.ts   (or via scripts/pipeline/promote.ts)
// ============================================================================

import { PrismaClient } from "@prisma/client";

import {
  MINISTRY, BUREAU, SUB_CITIES,
} from "../src/lib/seed-data/orgTree";
import {
  LANGUAGES, ROLES, IDENTIFICATION_TYPES, PROPERTY_STATUS_TYPES,
  PENALTY_PARAMETERS, CALENDAR_EVENTS,
} from "../src/lib/seed-data/catalogs";
import {
  MODEL_CONTRACT_V1, CONTRACT_SECTIONS,
} from "../src/lib/seed-data/modelContract";
import {
  ENVIRONMENTS, LOCALIZATION_RESOURCES,
} from "../src/lib/seed-data/environments";
import {
  COMPLAINT_GROUNDS, CITY_CONFIGS, DEMO_STAFF, PUBLICATIONS,
} from "../src/lib/seed-data/catalogs-p4";
import {
  LEGACY_BOOKS, TRAINING_COURSES, TRAINING_SESSIONS, PILOT_SPEC, AWARENESS_ITEMS,
} from "../src/lib/seed-data/catalogs-p7";

const prisma = new PrismaClient();

async function seedOrgTree() {
  await prisma.orgUnit.deleteMany({});
  const ministry = await prisma.orgUnit.create({
    data: {
      code: MINISTRY.code, tier: "MINISTRY",
      nameEn: MINISTRY.nameEn, nameAm: MINISTRY.nameAm, nameOm: MINISTRY.nameOm,
      confirmationStatus: "CONFIRMED",
      sourceNote: "Proclamation Art. 18 national oversight; Directive Arts. 2, 13.",
    },
  });
  const bureau = await prisma.orgUnit.create({
    data: {
      code: BUREAU.code, tier: "BUREAU",
      nameEn: BUREAU.nameEn, nameAm: BUREAU.nameAm, nameOm: BUREAU.nameOm,
      parentId: ministry.id, confirmationStatus: "CONFIRMED",
      sourceNote: "Directive 7/2016 Arts. 2, 6: city-level regulation tier.",
    },
  });
  for (const sc of SUB_CITIES) {
    const subCity = await prisma.orgUnit.create({
      data: {
        code: sc.code, tier: "SUB_CITY",
        nameEn: sc.nameEn, nameAm: sc.nameAm, nameOm: sc.nameOm,
        parentId: bureau.id, confirmationStatus: "CONFIRMED",
        sourceNote: "Official Addis Ababa administrative structure (11 sub-cities).",
      },
    });
    for (let w = 1; w <= sc.woredas.count; w++) {
      const wnum = String(w).padStart(2, "0");
      await prisma.orgUnit.create({
        data: {
          code: `${sc.code}-W${wnum}`, tier: "WOREDA",
          nameEn: `Woreda ${wnum}`, nameAm: `ወረዳ ${wnum}`, nameOm: `Woredaa ${wnum}`,
          parentId: subCity.id,
          confirmationStatus: sc.woredas.basis === "FEDERAL_LIST_ANCHOR" ? "CONFIRMED" : "PENDING_OFFICIAL_REGISTER",
          sourceNote: sc.woredas.note,
        },
      });
    }
  }
}

async function seedCatalogs() {
  await prisma.localizationResource.deleteMany({});
  await prisma.language.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.identificationType.deleteMany({});
  await prisma.propertyStatusType.deleteMany({});
  await prisma.penaltyParameter.deleteMany({});
  await prisma.calendarEvent.deleteMany({});

  for (const l of LANGUAGES) {
    await prisma.language.create({ data: l });
  }
  for (const r of ROLES) {
    await prisma.role.create({ data: r });
  }
  for (const id of IDENTIFICATION_TYPES) {
    await prisma.identificationType.create({
      data: { ...id, requiresOriginal: true, requiresCopy: true },
    });
  }
  for (const ps of PROPERTY_STATUS_TYPES) {
    await prisma.propertyStatusType.create({ data: ps });
  }
  for (const pen of PENALTY_PARAMETERS) {
    await prisma.penaltyParameter.create({ data: pen });
  }
  for (const ev of CALENDAR_EVENTS) {
    await prisma.calendarEvent.create({ data: ev });
  }
  for (const cg of COMPLAINT_GROUNDS) {
    await prisma.complaintGroundType.create({ data: cg });
  }
  for (const cc of CITY_CONFIGS) {
    await prisma.cityConfig.create({ data: cc });
  }
  for (const pub of PUBLICATIONS) {
    const bureau = await prisma.orgUnit.findUnique({ where: { code: "AA-BUREAU" } });
    await prisma.publicationItem.create({
      data: { ...pub, publishedByOrgUnitId: bureau!.id },
    });
  }
  await seedDemoStaff();
  for (const res of LOCALIZATION_RESOURCES) {
    await prisma.localizationResource.create({
      data: {
        key: res.key, domain: res.domain,
        valueAm: res.am, valueEn: res.en, valueOm: res.om,
        certificationStatus: res.key === "lang.fallback_notice" ? "PENDING_CERTIFICATION" : "PENDING_CERTIFICATION",
      },
    });
  }
}

async function seedDemoStaff() {
  for (const s of DEMO_STAFF) {
    const org = await prisma.orgUnit.findUnique({ where: { code: s.orgUnitCode } });
    if (!org) throw new Error(`Demo staff org unit not found: ${s.orgUnitCode}`);
    await prisma.systemUser.create({
      data: { staffCode: s.staffCode, fullName: s.fullName, roleCode: s.roleCode, orgUnitId: org.id, language: s.language },
    });
  }
}

async function seedModelContract() {
  await prisma.modelContractSection.deleteMany({});
  await prisma.modelContract.deleteMany({});
  await prisma.modelContract.create({
    data: {
      version: MODEL_CONTRACT_V1.version,
      status: MODEL_CONTRACT_V1.status,
      issuedBy: MODEL_CONTRACT_V1.issuedBy,
      legalBasis: MODEL_CONTRACT_V1.legalBasis,
      canonicalLang: MODEL_CONTRACT_V1.canonicalLang,
      effectiveFrom: new Date(MODEL_CONTRACT_V1.effectiveFrom),
      sections: {
        create: CONTRACT_SECTIONS.map((s) => ({
          orderNo: s.orderNo, code: s.code,
          titleEn: s.titleEn, titleAm: s.titleAm, titleOm: s.titleOm,
          contentEn: s.contentEn, contentAm: s.contentAm, contentOm: s.contentOm,
          certificationStatus: "PENDING_LEGAL_REVIEW",
          legalBasis: s.legalBasis,
        })),
      },
    },
  });
}

async function seedEnvironments() {
  await prisma.environment.deleteMany({});
  for (const env of ENVIRONMENTS) {
    await prisma.environment.create({ data: env });
  }
}

// Operational tables reference the configuration tables (org tree, roles,
// catalogues). They are cleared FIRST so the configuration seed stays
// idempotent under foreign-key enforcement (Dir. Art. 13 data custody).
async function clearOperational() {
  // Phase 7 tables reference parties/properties/files and org units - clear
  // them before the operational entities they reference (Dir. Art. 13 custody).
  await prisma.migrationRecord.deleteMany({});
  await prisma.legacyBookEntry.deleteMany({});
  await prisma.reconciliationReport.deleteMany({});
  await prisma.traineeRecord.deleteMany({});
  await prisma.trainingSession.deleteMany({});
  await prisma.trainingCourse.deleteMany({});
  await prisma.pilotDayLog.deleteMany({});
  await prisma.pilotConfig.deleteMany({});
  await prisma.awarenessItem.deleteMany({});
  await prisma.replicationLog.deleteMany({});
  await prisma.backupRun.deleteMany({});
  await prisma.aggregationSnapshot.deleteMany({});
  await prisma.publicationItem.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.penaltyCase.deleteMany({});
  await prisma.controlVisit.deleteMany({});
  await prisma.controlTeam.deleteMany({});
  await prisma.deadlineTrack.deleteMany({});
  await prisma.appeal.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.complaintGroundType.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.rentAdjustment.deleteMany({});
  await prisma.registryBookEntry.deleteMany({});
  await prisma.fileAnnotation.deleteMany({});
  await prisma.contractWitness.deleteMany({});
  await prisma.registrationChecklistItem.deleteMany({});
  await prisma.registrationFile.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.partyDocument.deleteMany({});
  await prisma.party.deleteMany({});
  await prisma.systemUser.deleteMany({});
  await prisma.cityConfig.deleteMany({});
}

export async function runSeed(): Promise<{
  seededAt: Date;
  counts: Record<string, number>;
  phase7: { migratedTotal: number; reconciledWoredas: number; traineeCount: number; pilotDays: number; awareness: number };
}> {
  await clearOperational();
  await seedOrgTree();
  await seedCatalogs();
  await seedModelContract();
  await seedEnvironments();
  const counts = {
    orgUnits: await prisma.orgUnit.count(),
    subCities: await prisma.orgUnit.count({ where: { tier: "SUB_CITY" } }),
    woredas: await prisma.orgUnit.count({ where: { tier: "WOREDA" } }),
    roles: await prisma.role.count(),
    identificationTypes: await prisma.identificationType.count(),
    propertyStatusTypes: await prisma.propertyStatusType.count(),
    penaltyParameters: await prisma.penaltyParameter.count(),
    calendarEvents: await prisma.calendarEvent.count(),
    languages: await prisma.language.count(),
    localizationResources: await prisma.localizationResource.count(),
    modelContracts: await prisma.modelContract.count(),
    contractSections: await prisma.modelContractSection.count(),
    environments: await prisma.environment.count(),
    complaintGrounds: await prisma.complaintGroundType.count(),
    cityConfigs: await prisma.cityConfig.count(),
    staffUsers: await prisma.systemUser.count(),
    publications: await prisma.publicationItem.count(),
    legacyBookRows: await prisma.legacyBookEntry.count(),
    legacyMigrated: await prisma.migrationRecord.count(),
    reconciliationsBalanced: await prisma.reconciliationReport.count({ where: { balanced: true } }),
    trainingCourses: await prisma.trainingCourse.count(),
    trainees: await prisma.traineeRecord.count(),
    pilotDays: await prisma.pilotDayLog.count(),
    awarenessItems: await prisma.awarenessItem.count(),
  };
  const p7 = await seedPhase7();
  return { seededAt: new Date(), counts, phase7: p7 };
}

// ---------------------------------------------------------------------------
// Phase 7 seed: legacy books of the pilot woredas, migration executed at seed
// time through the service layer (so the platform ships reconciled), training
// curriculum with competence records, the active pilot with its day logs, and
// the trilingual awareness materials awaiting the owner's G7 approval.
// ---------------------------------------------------------------------------
async function seedPhase7() {
  const { migrateLegacyWoreda, reconcileAllMigrated, createTrainingSession, addTrainee, openPilot, logPilotDay, createAwarenessItem } = await import("../src/lib/domain/phase7");

  // 1. Legacy paper books of the pilot woredas (source register, Dir. Art. 8(2)).
  for (const [woredaCode, book] of Object.entries(LEGACY_BOOKS)) {
    const woreda = await prisma.orgUnit.findUnique({ where: { code: woredaCode } });
    if (!woreda) throw new Error(`Pilot woreda ${woredaCode} not found in the org tree seed`);
    for (const e of book.entries) {
      await prisma.legacyBookEntry.create({
        data: {
          woredaId: woreda.id, bookRef: book.bookRef, pageNo: e.pageNo, entryNo: e.entryNo,
          landlordName: e.landlordName, tenantName: e.tenantName, houseAddress: e.houseAddress,
          monthlyRent: e.monthlyRent, contractDate: new Date(e.contractDate),
          leaseStart: new Date(e.leaseStart), leaseYears: e.leaseYears,
          scanAttached: true, // source documents scanned before migration
        },
      });
    }
  }

  // 2. Migration executed by the woreda registrar (STF-0001), then reconciliation.
  let migratedTotal = 0;
  for (const woredaCode of Object.keys(LEGACY_BOOKS)) {
    const woreda = await prisma.orgUnit.findUnique({ where: { code: woredaCode } });
    const res = await migrateLegacyWoreda(woreda!.id, "STF-0001");
    migratedTotal += res.migrated;
  }
  const reports = await reconcileAllMigrated();
  if (!reports.every((r) => r.balanced)) {
    throw new Error("Phase 7 seed reconciliation failed: not all pilot woredas balanced");
  }

  // 3. Training curriculum and held sessions with competence records.
  for (const c of TRAINING_COURSES) {
    await prisma.trainingCourse.create({ data: { ...c } });
  }
  let traineeCount = 0;
  for (const s of TRAINING_SESSIONS) {
    const course = await prisma.trainingCourse.findUnique({ where: { code: s.courseCode } });
    const org = await prisma.orgUnit.findUnique({ where: { code: s.orgCode } });
    if (!course || !org) throw new Error(`Phase 7 seed: training course/org not found for ${s.courseCode}/${s.orgCode}`);
    const heldAt = new Date(); heldAt.setUTCDate(heldAt.getUTCDate() - s.daysAgo);
    const session = await createTrainingSession({ courseCode: s.courseCode, heldAt, trainer: s.trainer, orgUnitId: org.id, venue: s.venue });
    for (const t of s.trainees) {
      await addTrainee({
        sessionId: session.id, name: t.name, staffCode: t.staffCode ?? undefined,
        roleCode: t.roleCode, attendance: t.attendance as "PRESENT" | "ABSENT",
        assessmentScore: t.score,
      });
      traineeCount += 1;
    }
  }

  // 4. Active pilot over the three Bole woredas with its day logs.
  const subCity = await prisma.orgUnit.findUnique({ where: { code: PILOT_SPEC.subCityCode } });
  if (!subCity) throw new Error("Pilot sub-city not found");
  const startedAt = new Date(); startedAt.setUTCDate(startedAt.getUTCDate() - PILOT_SPEC.daysAgoStart);
  const pilot = await openPilot({
    subCityId: subCity.id, woredaCodes: PILOT_SPEC.woredaCodes,
    startedAt, plannedWeeks: PILOT_SPEC.plannedWeeks, ownerApprovalRef: PILOT_SPEC.ownerApprovalRef,
  });
  // Deterministic day logs: working days only, one row per woreda per day;
  // cycle time falls 95 -> 38 minutes, compliance rises 90 -> 100 percent.
  let dayCount = 0;
  const cursor = new Date(startedAt.getTime());
  while (dayCount < PILOT_SPEC.daysPerWoreda) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) continue; // working-day calendar
    dayCount += 1;
    const cycle = Math.max(38, 95 - (dayCount - 1) * 12);
    const compliance = Math.min(100, 90 + (dayCount - 1) * 2);
    for (const woredaCode of PILOT_SPEC.woredaCodes) {
      const opened = 4 + ((dayCount + woredaCode.length) % 4);
      await logPilotDay({
        date: new Date(cursor), woredaCode,
        filesOpened: opened,
        filesRegistered: opened - (dayCount % 2), // some filings carry to the next day
        avgCycleMinutes: cycle + (woredaCode.charCodeAt(woredaCode.length - 1) % 3),
        checklistCompliancePct: compliance,
        replicationCorrect: true,
        incidents: dayCount === 2 ? "Console slow under morning load; resolved same day (observation only)." : undefined,
        severity: dayCount === 2 ? "SEV4" : "NONE",
        supportNotes: dayCount === 1 ? "Front-desk coaching: checklist item order." : undefined,
      });
    }
  }

  // 5. Awareness materials await the owner's Gate G7 approval.
  for (const a of AWARENESS_ITEMS) {
    await createAwarenessItem(a);
  }

  return { migratedTotal, reconciledWoredas: reports.length, traineeCount, pilotDays: dayCount * PILOT_SPEC.woredaCodes.length, awareness: AWARENESS_ITEMS.length };
}

// Direct execution support
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  runSeed()
    .then(({ seededAt, counts }) => {
      console.log(`SEED OK at ${seededAt.toISOString()}`);
      for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("SEED FAILED:", err);
      process.exit(1);
    });
}
