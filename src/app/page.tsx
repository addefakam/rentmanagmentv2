// ============================================================================
// page.tsx — Phase 3 console (server component). Reads the seeded
// configuration from the database and hands serialized data to the console.
// ============================================================================

import { db } from "@/lib/db";
import Console, { type ConsoleData } from "@/components/console/console";
import type { ReleaseRow, Stats, SubCityRow } from "@/components/console/types";
import { OFFICIAL_WOREDA_TOTAL } from "@/lib/seed-data/orgTree";

export const dynamic = "force-dynamic";

export default async function Phase3Console() {
  const [
    tierCounts, environments, subCityRows, roles, idTypes, statuses,
    penalties, events, contract, languages, resources, latestReleaseRow,
  ] = await Promise.all([
    db.orgUnit.groupBy({ by: ["tier"], _count: { _all: true } }),
    db.environment.findMany({ orderBy: { stage: "asc" } }),
    db.orgUnit.findMany({
      where: { tier: "SUB_CITY" },
      orderBy: { code: "asc" },
      include: { children: { orderBy: { code: "asc" } } },
    }),
    db.role.findMany({ orderBy: { code: "asc" } }),
    db.identificationType.findMany({ orderBy: { code: "asc" } }),
    db.propertyStatusType.findMany({ orderBy: { code: "asc" } }),
    db.penaltyParameter.findMany({ orderBy: { code: "asc" } }),
    db.calendarEvent.findMany({ orderBy: { code: "asc" } }),
    db.modelContract.findFirst({
      where: { version: "1.0" },
      include: { sections: { orderBy: { orderNo: "asc" } } },
    }),
    db.language.findMany({ orderBy: { code: "asc" } }),
    db.localizationResource.findMany({ orderBy: { key: "asc" } }),
    db.release.findFirst({
      orderBy: { startedAt: "desc" },
      include: {
        steps: { orderBy: { orderNo: "asc" }, include: { checks: { orderBy: { name: "asc" } } } },
      },
    }),
  ]);

  const count = (tier: string) => tierCounts.find((t) => t.tier === tier)?._count._all ?? 0;

  // Attach the documented basis of each sub-city's woreda count from the seed spec
  const { SUB_CITIES } = await import("@/lib/seed-data/orgTree");
  const specByCode = new Map(SUB_CITIES.map((s) => [s.code, s]));

  const subCities: SubCityRow[] = subCityRows.map((sc) => {
    const spec = specByCode.get(sc.code);
    return {
      code: sc.code,
      nameEn: sc.nameEn, nameAm: sc.nameAm, nameOm: sc.nameOm,
      woredaCount: sc.children.length,
      basis: spec?.woredas.basis ?? "PROVISIONAL",
      note: spec?.woredas.note ?? sc.sourceNote ?? "",
      woredaCodes: sc.children.map((w) => w.code),
    };
  });

  const stats: Stats = {
    ministries: count("MINISTRY"),
    bureaus: count("BUREAU"),
    subCities: count("SUB_CITY"),
    woredas: count("WOREDA"),
    roles: roles.length,
    idTypes: idTypes.length,
    statuses: statuses.length,
    penalties: penalties.length,
    events: events.length,
    languages: languages.length,
    resources: resources.length,
    sections: contract?.sections.length ?? 0,
    environments: environments.length,
  };

  const latestRelease: ReleaseRow | null = latestReleaseRow
    ? {
        tag: latestReleaseRow.tag,
        status: latestReleaseRow.status,
        startedAt: latestReleaseRow.startedAt.toISOString(),
        completedAt: latestReleaseRow.completedAt?.toISOString() ?? null,
        notes: latestReleaseRow.notes,
        steps: latestReleaseRow.steps.map((s) => ({
          orderNo: s.orderNo,
          stage: s.stage,
          name: s.name,
          status: s.status,
          detail: s.detail,
          durationMs: s.durationMs,
          checks: s.checks.map((c) => ({
            name: c.name, passed: c.passed, severity: c.severity,
            expected: c.expected, actual: c.actual,
          })),
        })),
      }
    : null;

  const data: ConsoleData = {
    stats,
    environments: environments.map((e) => ({
      name: e.name, stage: e.stage, purpose: e.purpose, database: e.database,
      appUrl: e.appUrl, backupScheme: e.backupScheme, replicationTarget: e.replicationTarget,
      rpoMinutes: e.rpoMinutes, rtoHours: e.rtoHours, restoreDrill: e.restoreDrill, notes: e.notes,
    })),
    subCities,
    roles: roles.map((r) => ({ code: r.code, nameEn: r.nameEn, nameAm: r.nameAm, nameOm: r.nameOm, extra: r.tierScope })),
    idTypes: idTypes.map((i) => ({ code: i.code, nameEn: i.nameEn, nameAm: i.nameAm, nameOm: i.nameOm, extra: null })),
    statuses: statuses.map((s) => ({
      code: s.code, nameEn: s.nameEn, nameAm: s.nameAm, nameOm: s.nameOm,
      extra: s.exemptionMonths != null ? `${s.exemptionMonths} months exemption` : "no exemption clock",
    })),
    penalties: penalties.map((p) => ({
      code: p.code, category: p.category,
      offenseEn: p.offenseEn, offenseAm: p.offenseAm, offenseOm: p.offenseOm,
      rangeLabelEn: p.rangeLabelEn, basisRef: p.basisRef, confirmationStatus: p.confirmationStatus,
    })),
    events: events.map((e) => ({
      code: e.code, nameEn: e.nameEn, nameAm: e.nameAm, nameOm: e.nameOm,
      month: e.month, day: e.day, windowDays: e.windowDays, legalBasis: e.legalBasis, description: e.description,
    })),
    sections: (contract?.sections ?? []).map((s) => ({
      orderNo: s.orderNo, code: s.code,
      titleEn: s.titleEn, titleAm: s.titleAm, titleOm: s.titleOm,
      contentEn: s.contentEn, contentAm: s.contentAm, contentOm: s.contentOm,
      legalBasis: s.legalBasis, certificationStatus: s.certificationStatus,
    })),
    resources: resources.map((r) => ({
      key: r.key, domain: r.domain, valueAm: r.valueAm, valueEn: r.valueEn, valueOm: r.valueOm,
      certificationStatus: r.certificationStatus,
    })),
    languages: languages.map((l) => ({
      code: l.code, nameNative: l.nameNative, nameEn: l.nameEn,
      isDefault: l.isDefault, status: l.status, legalNote: l.legalNote,
    })),
    officialWoredaTotal: OFFICIAL_WOREDA_TOTAL,
    latestRelease,
  };

  return <Console data={data} />;
}
