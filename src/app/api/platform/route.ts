// ============================================================================
// /api/platform — boot payload for the console, scoped to ONE city.
// ?city=CODE selects the city (defaults to the first active CityConfig).
// A city = one BUREAU org unit subtree; every operational list below is
// filtered to that subtree (Dir. Arts. 2, 6, 13). `cities` carries the
// switcher list for national officers.
// ============================================================================

import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { cityScope } from "@/lib/city";
import { currentOfficer } from "@/lib/auth/officer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const requested = new URL(req.url).searchParams.get("city");
    const officer = await currentOfficer();

    // --- scope resolution -------------------------------------------------
    const allUnits = await db.orgUnit.findMany({ orderBy: { code: "asc" } });
    const allConfigs = await db.cityConfig.findMany({ orderBy: { cityCode: "asc" } });
    // A deactivated city stays browsable only for national officers (ministry
    // / system admin oversight); a city-scoped officer gets a 403, which the
    // console shell translates into a fresh sign-in.
    const requestedCity = requested ?? officer?.cityCode ?? null;
    const requestedCfg = allConfigs.find((c) => c.cityCode === requestedCity);
    if (requestedCfg && !requestedCfg.isActive && !officer?.national) {
      return Response.json(
        { ok: false, error: `${requestedCfg.nameEn} is deactivated. Sign in again or contact the system administrator.` },
        { status: 403 },
      );
    }
    const configs = officer?.national ? allConfigs : allConfigs.filter((c) => c.isActive);
    const activeCity =
      configs.find((c) => c.cityCode === requestedCity)?.cityCode ?? configs[0]?.cityCode ?? "AA";
    const scope = cityScope(allUnits as never, configs as never, activeCity);
    const { woredaIds, subCityIds, unitIds } = scope;

    // Deadline clocks are keyed by subject refs; keep the city's refs only.
    const refFilter = (rows: Array<{ refNumber?: string; fileNumber?: string; appealNumber?: string }>) =>
      new Set(
        rows.flatMap((r) => [r.refNumber, r.fileNumber, r.appealNumber].filter(Boolean) as string[]),
      );

    const [
      roles, idTypes, statusTypes, grounds, staff, penaltyParams,
      activeContract, adjustments, publications, environments, snapshotsRaw,
      parties, properties, files, paymentsRaw, complaints, appeals, penaltiesRaw,
      teams, visitsRaw, replicationsRaw, backups,
      deadlinesAll,
    ] = await Promise.all([
      db.role.findMany({ orderBy: { code: "asc" } }),
      db.identificationType.findMany({ orderBy: { code: "asc" } }),
      db.propertyStatusType.findMany({ orderBy: { code: "asc" } }),
      db.complaintGroundType.findMany({ orderBy: { code: "asc" } }),
      db.systemUser.findMany({
        where: { orgUnitId: { in: unitIds } },
        include: { role: true, orgUnit: true }, orderBy: { fullName: "asc" },
      }),
      db.penaltyParameter.findMany({ orderBy: { code: "asc" } }),
      db.modelContract.findFirst({
        where: { status: "ACTIVE", cityCode: activeCity },
        include: { sections: { orderBy: { orderNo: "asc" } } },
      }),
      db.rentAdjustment.findMany({ where: { cityCode: activeCity }, orderBy: { year: "desc" } }),
      db.publicationItem.findMany({
        where: { isActive: true, publishedByOrgUnitId: { in: unitIds } },
        orderBy: { publishedAt: "desc" },
      }),
      db.environment.findMany({ orderBy: { stage: "asc" } }),
      db.aggregationSnapshot.findMany({
        where: { orgUnitId: { in: unitIds } },
        include: { orgUnit: true }, orderBy: { computedAt: "desc" }, take: 60,
      }),
      db.party.findMany({
        where: { registeredAtOrgUnitId: { in: unitIds } },
        include: { idType: true }, orderBy: { partyCode: "desc" }, take: 100,
      }),
      db.property.findMany({
        where: { woredaId: { in: woredaIds } },
        include: { woreda: true, landlord: true, statusType: true },
        orderBy: { propertyCode: "desc" }, take: 100,
      }),
      db.registrationFile.findMany({
        where: { woredaId: { in: woredaIds } },
        include: {
          woreda: true, property: true, landlord: true, tenant: true,
          witnesses: true, checklist: true, annotations: true,
          bookEntries: true, payments: true, modelContract: true,
        },
        orderBy: { createdAt: "desc" }, take: 100,
      }),
      db.payment.findMany({ include: { file: { include: { woreda: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.complaint.findMany({
        where: { receivedAtOrgUnitId: { in: unitIds } },
        include: { ground: true, appeals: true }, orderBy: { receivedAt: "desc" }, take: 100,
      }),
      db.appeal.findMany({ include: { complaint: true }, orderBy: { filedAt: "desc" }, take: 200 }),
      db.penaltyCase.findMany({
        where: { property: { woredaId: { in: woredaIds } } },
        include: { offense: true, referrals: true, property: true },
        orderBy: { createdAt: "desc" }, take: 100,
      }),
      db.controlTeam.findMany({ where: { subCityId: { in: subCityIds } }, include: { subCity: true } }),
      db.controlVisit.findMany({
        where: { property: { woredaId: { in: woredaIds } } },
        include: { team: true, property: true }, orderBy: { visitedAt: "desc" }, take: 100,
      }),
      db.replicationLog.findMany({
        where: { fromOrgUnitId: { in: unitIds } },
        orderBy: { propagatedAt: "desc" }, take: 100,
      }),
      db.backupRun.findMany({ include: { environment: true }, orderBy: { startedAt: "desc" }, take: 50 }),
      db.deadlineTrack.findMany({ orderBy: { dueAt: "asc" }, take: 300 }),
    ]);

    // Payments without a woreda-scoped file stay out of the city view; files
    // deleted since the fetch are skipped defensively.
    const fileIdWoreda = new Map(files.map((f) => [f.id, f.woredaId]));
    const payments = paymentsRaw.filter((p) => {
      const wid = p.fileId ? fileIdWoreda.get(p.fileId) : undefined;
      return wid != null && woredaIds.includes(wid);
    });
    // Appeals of this city's complaints only.
    const complaintIds = new Set(complaints.map((c) => c.id));
    const appealsScoped = appeals.filter((a) => complaintIds.has(a.complaintId));
    const deadlines = deadlinesAll.filter((d) => {
      if (!d.subjectRef) return false;
      return refFilter([...complaints, ...files, ...appealsScoped, ...adjustments.map((a) => ({ refNumber: String(a.year) }))]).has(d.subjectRef);
    });

    const cities = configs.map((c) => {
      const bureau = allUnits.find((u) => u.id === c.bureauId);
      return {
        cityCode: c.cityCode, nameEn: c.nameEn, nameAm: c.nameAm, nameOm: c.nameOm,
        bureauCode: bureau?.code ?? "—", currency: c.currency,
        canonicalLang: c.canonicalLang, isActive: c.isActive,
      };
    });

    const counts = {
      orgUnits: unitIds.length, woredas: woredaIds.length,
      parties: parties.length, properties: properties.length,
      files: files.length, registeredFiles: files.filter((f) => f.status === "REGISTERED").length,
      payments: payments.length, complaints: complaints.length, appeals: appealsScoped.length,
      penalties: penaltiesRaw.length, deadlines: deadlines.length,
      overdueDeadlines: deadlines.filter((d) => d.status === "OVERDUE").length,
      replications: replicationsRaw.length,
    };

    return ok({
      cityCode: activeCity, cities, cityConfig: scope.config,
      orgUnits: allUnits, roles, idTypes, statusTypes, grounds, staff, penaltyParams,
      activeContract, adjustments, publications, environments, deadlines, snapshots: snapshotsRaw,
      parties, properties, files, payments, complaints, appeals: appealsScoped, penalties: penaltiesRaw,
      teams, visits: visitsRaw, replications: replicationsRaw, backups, counts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err);
  }
}
