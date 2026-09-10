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
      data: { fullName: s.fullName, roleCode: s.roleCode, orgUnitId: org.id, language: s.language },
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

export async function runSeed(): Promise<{ seededAt: Date; counts: Record<string, number> }> {
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
  };
  return { seededAt: new Date(), counts };
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
