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
import {
  G6_APPROVAL_REF, G7_APPROVAL_REF, PLATFORM_SETTINGS_P8, AWARENESS_DISTRIBUTION_REF,
  SUPPORT_ROSTER_P8, HYPERCARE_PLAN_P8,
} from "../src/lib/seed-data/catalogs-p8";
import {
  G8_APPROVAL_REF, ANNUAL_CYCLE_2026, ENFORCEMENT_SEED, MINISTRY_FEED_SCHEDULE,
  HYPERCARE_PLAN_WAVE2, OPERATIONS_HANDOVER_P8B, PIR_FINDINGS, CLOSURE_MINUTE_P8B,
} from "../src/lib/seed-data/catalogs-ops";

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
  // Phase 8 Part B tables (operations under the order) - cleared first; the
  // enforcement referrals reference penalty cases (Dir. Art. 13 custody).
  await prisma.closureMinute.deleteMany({});
  await prisma.pirFinding.deleteMany({});
  await prisma.pirRecord.deleteMany({});
  await prisma.operationsHandover.deleteMany({});
  await prisma.ministryFeedPublication.deleteMany({});
  await prisma.enforcementReferral.deleteMany({});
  await prisma.annualCycleStep.deleteMany({});
  await prisma.hypercareReport.deleteMany({});
  // Phase 8 tables reference waves/org config - clear them first (Dir. Art. 13 custody).
  await prisma.productionSession.deleteMany({});
  await prisma.platformSetting.deleteMany({});
  await prisma.drillRun.deleteMany({});
  await prisma.cutoverItem.deleteMany({});
  await prisma.goLiveWave.deleteMany({});
  await prisma.supportRosterEntry.deleteMany({});
  await prisma.hypercarePlan.deleteMany({});
  await prisma.o7Confirmation.deleteMany({});
  await prisma.configFreeze.deleteMany({});
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
  phase8: { o7Confirmed: number; waves: number; checklistGreen: number; drillsPassed: number; wave1Status: string };
  phase8b: {
    wave1OrderRef: string; hypercareDays: number; sev1: number; slaPct: number;
    cycleYear: number; referrals: number; concludedReferrals: number; feeds: number;
    handover: string; pirFindings: number; minute: string; g9Ready: boolean;
  };
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
  const p8 = await seedPhase8();
  const p8b = await seedPhase8B();
  return { seededAt: new Date(), counts, phase7: p7, phase8: p8, phase8b: p8b };
}

// ---------------------------------------------------------------------------
// Phase 8 seed (plan 5.9): the platform ships go-live READY — the owner's G7
// approval recorded on the wave plan and awareness materials, O-7 official
// register confirmation closed, configuration frozen and hash-verified,
// rollback/restore/hardening drills executed through real platform
// operations, support roster staffed, hypercare schedule signed, and the
// Wave 1 cutover checklist executed GREEN. The go-live order itself is NOT
// executed: it is the owner's Gate G8 decision.
// ---------------------------------------------------------------------------
async function seedPhase8() {
  const fs = await import("fs");
  const {
    confirmO7Register, freezeConfiguration, runRestoreDrill, runRollbackDrill,
    recordSessionDrill, recordPerfDrill, upsertRoster, signHypercarePlan,
    distributeAwareness, prepareWaves, ensureCutoverItems, executeCutoverChecklist,
  } = await import("../src/lib/domain/phase8");

  // 0. Platform settings (auth_mode; switched to production with the go-live order).
  for (const s of PLATFORM_SETTINGS_P8) {
    await prisma.platformSetting.create({ data: { key: s.key, value: s.value, updatedBy: "STF-0008" } });
  }

  // 1. Owner approvals carried from the gates: awareness materials approved at
  //    G7, then distributed through the campaign channels (Proc. Arts. 14, 16).
  await prisma.awarenessItem.updateMany({
    where: { status: "PENDING_OWNER_APPROVAL" },
    data: { status: "APPROVED", ownerApprovalRef: G7_APPROVAL_REF },
  });
  await distributeAwareness(AWARENESS_DISTRIBUTION_REF, "STF-0007");

  // 2. O-7 official register confirmation session (closes the carried item).
  const o7 = await confirmO7Register({});
  if (o7.confirmed !== o7.total) {
    throw new Error("Phase 8 seed: O-7 confirmation did not close");
  }

  // 3. Wave plan authorized at G7; pilot wave carries the authorization ref.
  const waves = await prepareWaves();
  const pilotStart = await prisma.pilotConfig.findFirst({ orderBy: { startedAt: "desc" } });
  await prisma.goLiveWave.update({
    where: { code: "WAVE-0" },
    data: { status: "LIVE", goLiveOrderRef: G7_APPROVAL_REF, cutoverAt: pilotStart?.startedAt ?? new Date() },
  });

  // 4. Support arrangements: roster, escalation tree, signed hypercare schedule.
  await upsertRoster(SUPPORT_ROSTER_P8);
  await signHypercarePlan({
    waveCode: HYPERCARE_PLAN_P8.waveCode, days: HYPERCARE_PLAN_P8.days,
    dailyReportTime: HYPERCARE_PLAN_P8.dailyReportTime, sla: HYPERCARE_PLAN_P8.sla,
    signedBy: HYPERCARE_PLAN_P8.signedBy, reference: HYPERCARE_PLAN_P8.reference,
  });

  // 5. Drills executed through real platform operations (restore + rollback),
  //    the hardening drill transcript, and the persisted staging perf re-run.
  await runRestoreDrill("STF-0008");
  await runRollbackDrill("STF-0008");
  await recordSessionDrill("STF-0008", {
    result: "PASS",
    unitSuite: "tests/phase8.test.ts (session issue/verify/expiry/revoke, production-mode 401/403, sensitive-read audit)",
    e2e: "scripts/e2e-p8.ts (live API production-mode drill, auth mode restored to demo after the drill)",
    finding: "DEF-06-01 / Phase 5 finding F-1",
  });
  let perfSource = "scripts/load/perf-output-p8.json";
  let perfRecorded = false;
  try {
    const raw = fs.readFileSync("/home/z/my-project/scripts/load/perf-output-p8.json", "utf-8");
    const perf = JSON.parse(raw);
    await recordPerfDrill("STF-0008", perf);
    perfRecorded = true;
  } catch {
    perfSource = "(staging perf output not yet recorded)";
  }

  // 6. Configuration freeze (hash over the governed configuration set).
  await freezeConfiguration("STF-0008");

  // 7. Wave 1 cutover checklist executed against live state.
  await ensureCutoverItems("WAVE-1");
  const checklist = await executeCutoverChecklist("WAVE-1", { staffCode: "STF-0008" });
  if (!checklist.allGreen) {
    const red = checklist.items.filter((i) => i.status !== "GREEN");
    throw new Error(`Phase 8 seed: cutover checklist not green - ${red.map((r) => r.seq).join(", ")}`);
  }

  const drillsPassed = await prisma.drillRun.count({ where: { result: "PASS" } });
  const checklistGreen = await prisma.cutoverItem.count({ where: { waveCode: "WAVE-1", status: "GREEN" } });
  return {
    o7Confirmed: o7.confirmed,
    waves: waves.length,
    checklistGreen,
    drillsPassed,
    wave1Status: (await prisma.goLiveWave.findUnique({ where: { code: "WAVE-1" } }))?.status ?? "UNKNOWN",
    g6Ref: G6_APPROVAL_REF,
    g7Ref: G7_APPROVAL_REF,
    perfRecorded,
    perfSource,
  };
}

// ---------------------------------------------------------------------------
// Phase 8 Part B seed (plan activities A-42..A-48): operations under the
// owner's go-live order. The Gate G8 decision (G8_APPROVAL_REF) executes on
// Wave 1 with the production authentication switch, hypercare runs its 28
// signed daily reports (zero severity-one), the first annual adjustment
// cycle is operated through the real Proc. Art. 8 services, penalty
// referrals and court recovery track with the competent bodies, the Ministry
// feed publishes monthly, hypercare closes with the signed handover, the
// ninety-day PIR records its findings, and the closure minute is drafted
// with lessons — signature reserved for the owner's Gate G9 decision.
// The demonstrator records the full operational arc; relative dates follow
// the same compressed-timeline convention as the Phase 7 pilot logs.
// ---------------------------------------------------------------------------
async function seedPhase8B() {
  const {
    executeGoLiveOrder, logHypercareDay, closeHypercare, operateAnnualCycle,
    createEnforcementReferral, recordReferralOutcome, publishMinistryFeed,
    runPostImplementationReview, addPirFinding, draftClosureMinute, g9Check,
  } = await import("../src/lib/domain/operations");
  const {
    prepareWaves, ensureCutoverItems, executeCutoverChecklist, signHypercarePlan,
  } = await import("../src/lib/domain/phase8");
  const { setAuthMode } = await import("../src/lib/security/session");

  await prepareWaves();

  // 0. Wave 2 preparation under its sequencing gates: signed preparation
  //    hypercare schedule and a fully executed checklist (order pending).
  await ensureCutoverItems("WAVE-2");
  await signHypercarePlan(HYPERCARE_PLAN_WAVE2);
  const w2 = await executeCutoverChecklist("WAVE-2", { staffCode: "STF-0008" });
  if (!w2.allGreen) {
    throw new Error(`Phase 8B seed: Wave 2 preparation checklist not green - ${w2.items.filter((i) => i.status !== "GREEN").map((i) => i.key).join(", ")}`);
  }

  // 1. The Gate G8 decision executes: Wave 1 cuts over under the owner's
  //    written order and authentication switches to production. The review
  //    surface is then restored to demo mode for the gate review (the switch
  //    discipline at physical cutover is a runbook item; DEF-06-01).
  const wave = await executeGoLiveOrder("WAVE-1", G8_APPROVAL_REF, { staffCode: "STF-0005" });
  await setAuthMode("demo", "STF-0008");
  const cutoverAt = wave.cutoverAt ?? new Date();

  // 2. Hypercare: 28 deterministic daily reports under HC-SCHED-P8-01.
  //    Zero severity-one across the arc; one honest SLA breach (day 9,
  //    month-end surge) feeds the improvement backlog BL-01.
  const story = (day: number): {
    opened: number; closed: number; sev2: number; sev3: number; sev4: number;
    slaMet: boolean; breaches?: string; notes?: string;
  } => {
    if (day === 1) return { opened: 9, closed: 7, sev2: 0, sev3: 1, sev4: 0, slaMet: true, notes: "Go-live day: front-desk queue coaching at all three desks; checklist item order (DESK-101)." };
    if (day === 3) return { opened: 7, closed: 7, sev2: 1, sev3: 0, sev4: 0, slaMet: true, notes: "Payment ledger display lag for same-day receipts (DESK-118); resolved same day within the SEV-2 window." };
    if (day === 9) return { opened: 6, closed: 5, sev2: 0, sev3: 1, sev4: 0, slaMet: false, breaches: "SEV-3 response missed the next-business-day target (month-end payment surge; level-1 staffing gap).", notes: "Friday weekly summary: month-end surge; improvement backlog BL-01 opened." };
    if (day === 17) return { opened: 4, closed: 4, sev2: 0, sev3: 1, sev4: 0, slaMet: true, notes: "Replication retry after a network blip; second hop completed within the hour (Dir. Art. 13)." };
    if (day === 28) return { opened: 2, closed: 2, sev2: 0, sev3: 0, sev4: 1, slaMet: true, notes: "Handover day: manual v1.1 amendments folded in; hypercare closes." };
    const opened = Math.max(2, 7 - Math.floor(day / 5));
    const closed = opened - (day % 7 === 0 ? 1 : 0);
    const sev4 = day % 6 === 0 ? 1 : 0;
    return {
      opened, closed, sev2: 0, sev3: 0, sev4, slaMet: true,
      notes: sev4 ? "Improvement suggestion recorded to the backlog (BL-03 related)." : undefined,
    };
  };
  for (let day = 1; day <= 28; day++) {
    const s = story(day);
    const d = new Date(cutoverAt.getTime());
    d.setUTCDate(d.getUTCDate() + day);
    await logHypercareDay({
      waveCode: "WAVE-1", dayNumber: day, reportDate: d,
      ticketsOpened: s.opened, ticketsClosed: s.closed,
      sev1: 0, sev2: s.sev2, sev3: s.sev3, sev4: s.sev4,
      slaMet: s.slaMet, breaches: s.breaches, notes: s.notes, staffCode: "STF-0008",
    });
  }

  // 3. First annual adjustment cycle through the real Proc. Art. 8 services.
  const cycle = await operateAnnualCycle({ ...ANNUAL_CYCLE_2026, staffCode: "STF-0004" });

  // 4. Penalty referrals and court recovery with the competent bodies.
  let concluded = 0;
  for (const seed of ENFORCEMENT_SEED) {
    const { outcomes, ...refInput } = seed;
    const ref = await createEnforcementReferral({ ...refInput, staffCode: "STF-0005" });
    for (const o of outcomes) {
      await recordReferralOutcome(ref.reference, o, "STF-0005");
    }
    const last = outcomes[outcomes.length - 1]?.status ?? "REFERRED";
    if (["RESOLVED", "RECOVERED", "CLOSED"].includes(last)) concluded += 1;
  }

  // 5. Ministry feed: monthly periods across the 90-day window (plan A-45).
  const periodAt = (monthOffset: number): string => {
    const d = new Date(cutoverAt.getTime());
    d.setUTCMonth(d.getUTCMonth() + monthOffset);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  for (const f of MINISTRY_FEED_SCHEDULE) {
    await publishMinistryFeed(periodAt(f.monthOffset), "STF-0007");
  }

  // 6. Hypercare closure with the signed operations handover (plan A-46).
  await closeHypercare({ ...OPERATIONS_HANDOVER_P8B, staffCode: "STF-0008" });

  // 7. The ninety-day post-implementation review with its findings (A-47).
  await runPostImplementationReview({ reference: "PIR-P8-90D", conductedBy: "STF-0005" });
  for (const f of PIR_FINDINGS) {
    await addPirFinding({ pirReference: "PIR-P8-90D", ...f });
  }

  // 8. The closure minute is drafted; signature awaits the owner's G9 decision.
  await draftClosureMinute({ ...CLOSURE_MINUTE_P8B, staffCode: "STF-0005" });

  // Self-check: the platform ships Gate G9 READY.
  const g9 = await g9Check();
  if (!g9.ready) {
    const failing = g9.checks.filter((c) => !c.pass).map((c) => c.criterion);
    throw new Error(`Phase 8B seed: Gate G9 check failing - ${failing.join("; ")}`);
  }
  const hs = await import("../src/lib/domain/operations").then((m) => m.hypercareSummary("WAVE-1"));
  return {
    wave1OrderRef: G8_APPROVAL_REF,
    hypercareDays: hs.daysLogged,
    sev1: hs.sev1,
    slaPct: hs.slaPct,
    cycleYear: cycle.cycleYear,
    referrals: ENFORCEMENT_SEED.length,
    concludedReferrals: concluded,
    feeds: MINISTRY_FEED_SCHEDULE.length,
    handover: OPERATIONS_HANDOVER_P8B.reference,
    pirFindings: PIR_FINDINGS.length,
    minute: CLOSURE_MINUTE_P8B.reference,
    g9Ready: g9.ready,
  };
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
