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

export async function runSeed(): Promise<{ seededAt: Date; counts: Record<string, number> }> {
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
