// ============================================================================
// /api/platform — boot payload for the Phase 4 platform console.
// One aggregated GET: catalogues, org tree, staff, publications, counts.
// ============================================================================

import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [orgUnits, roles, idTypes, statusTypes, grounds, cityConfigs, staff,
      activeContract, adjustments, publications, environments, deadlines, snapshots,
      parties, properties, files, payments, complaints, appeals, penalties,
      teams, visits, replications, backups] =
      await Promise.all([
        db.orgUnit.findMany({ orderBy: { code: "asc" } }),
        db.role.findMany({ orderBy: { code: "asc" } }),
        db.identificationType.findMany({ orderBy: { code: "asc" } }),
        db.propertyStatusType.findMany({ orderBy: { code: "asc" } }),
        db.complaintGroundType.findMany({ orderBy: { code: "asc" } }),
        db.cityConfig.findMany(),
        db.systemUser.findMany({ include: { role: true, orgUnit: true }, orderBy: { fullName: "asc" } }),
        db.modelContract.findFirst({ where: { status: "ACTIVE" }, include: { sections: { orderBy: { orderNo: "asc" } } } }),
        db.rentAdjustment.findMany({ orderBy: { year: "desc" } }),
        db.publicationItem.findMany({ where: { isActive: true }, orderBy: { publishedAt: "desc" } }),
        db.environment.findMany({ orderBy: { stage: "asc" } }),
        db.deadlineTrack.findMany({ orderBy: { dueAt: "asc" }, take: 100 }),
        db.aggregationSnapshot.findMany({ include: { orgUnit: true }, orderBy: { computedAt: "desc" }, take: 60 }),
        db.party.findMany({ include: { idType: true }, orderBy: { partyCode: "desc" }, take: 100 }),
        db.property.findMany({ include: { woreda: true, landlord: true, statusType: true }, orderBy: { propertyCode: "desc" }, take: 100 }),
        db.registrationFile.findMany({
          include: {
            woreda: true, property: true, landlord: true, tenant: true,
            witnesses: true, checklist: true, annotations: true,
            bookEntries: true, payments: true, modelContract: true,
          },
          orderBy: { createdAt: "desc" }, take: 100,
        }),
        db.payment.findMany({ include: { file: true }, orderBy: { createdAt: "desc" }, take: 100 }),
        db.complaint.findMany({ include: { ground: true, appeals: true }, orderBy: { receivedAt: "desc" }, take: 100 }),
        db.appeal.findMany({ include: { complaint: true }, orderBy: { filedAt: "desc" }, take: 100 }),
        db.penaltyCase.findMany({ include: { offense: true, referrals: true }, orderBy: { createdAt: "desc" }, take: 100 }),
        db.controlTeam.findMany({ include: { subCity: true } }),
        db.controlVisit.findMany({ include: { team: true, property: true }, orderBy: { visitedAt: "desc" }, take: 100 }),
        db.replicationLog.findMany({ orderBy: { propagatedAt: "desc" }, take: 100 }),
        db.backupRun.findMany({ include: { environment: true }, orderBy: { startedAt: "desc" }, take: 50 }),
      ]);

    const counts = {
      orgUnits: orgUnits.length, woredas: orgUnits.filter((o) => o.tier === "WOREDA").length,
      parties: parties.length, properties: properties.length,
      files: files.length, registeredFiles: files.filter((f) => f.status === "REGISTERED").length,
      payments: payments.length, complaints: complaints.length, appeals: appeals.length,
      penalties: penalties.length, deadlines: deadlines.length,
      overdueDeadlines: deadlines.filter((d) => d.status === "OVERDUE").length,
    };

    return ok({
      orgUnits, roles, idTypes, statusTypes, grounds, cityConfigs, staff,
      activeContract, adjustments, publications, environments, deadlines, snapshots,
      parties, properties, files, payments, complaints, appeals, penalties,
      teams, visits, replications, backups, counts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err);
  }
}
