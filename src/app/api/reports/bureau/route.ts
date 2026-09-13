// /api/reports/bureau — OWNER DIRECTIVE (Task 44): the city Rent Control
// Bureau head "generates different types of report at city level up to
// woreda level". One endpoint returns the whole management report suite of
// the acting officer's city; every figure aggregates the FULL city and
// breaks down per sub-city and per woreda:
//
//   staffing     — sub-city structure: the ONE responsible officer, woreda
//                  count, active woreda desks by role (who runs what)
//   registration — registration files by lifecycle status per woreda
//                  (PRESENTED → CHECKLIST_PASSED → CERTIFIED → STAMPED →
//                  REGISTERED, plus REJECTED) — Dir. Arts. 6-9
//   properties   — property registry per woreda (M2)
//   payments     — electronic payment ledger per woreda: receipts, ETB
//                  total, cash flags (Proc. Art. 13; Dir. Art. 22 referral)
//   complaints   — complaints & appeals per receiving unit (M8/M12)
//   penalties    — penalty cases per woreda: imposed ETB, cap applied,
//                  open cases (Proc. Arts. 29-32; Dir. Art. 22)
//
// The UI (Data & Reports → Bureau reports) renders each type and exports
// CSV. Scope: cityContext — city-bound roles are walled to their own city;
// national officers may name a city with ?city=CODE.
// Capability: reports:bureau (BUREAU_HEAD / CITY_ADMIN / SYSTEM_ADMIN).

import { ok, fail } from "@/lib/api";
import { requireCapability, cityContext } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const FILE_STATUSES = ["PRESENTED", "CHECKLIST_PASSED", "CERTIFIED", "STAMPED", "REGISTERED", "REJECTED"];

export async function GET(req: Request) {
  try {
    const actor = await requireCapability(req, "reports:bureau");
    const url = new URL(req.url);
    const ctx = await cityContext(actor, {
      city: url.searchParams.get("city") ?? req.headers.get("x-city-code"),
    });
    type UnitLite = { id: string; code: string; tier: string; parentId: string | null; nameEn: string };
    const units = ctx.units as unknown as UnitLite[];
    const unitById = new Map(units.map((u) => [u.id, u]));
    const subCities = ctx.subCityIds
      .map((id) => unitById.get(id))
      .filter((u): u is UnitLite => !!u)
      .sort((a, b) => a.code.localeCompare(b.code));
    const woredas = ctx.woredaIds
      .map((id) => unitById.get(id))
      .filter((u): u is UnitLite => !!u)
      .sort((a, b) => a.code.localeCompare(b.code));
    const woredaIds = ctx.woredaIds;
    const unitIds = ctx.unitIds;

    const [files, properties, paymentsRaw, complaints, penalties, staff] = await Promise.all([
      db.registrationFile.findMany({
        where: { woredaId: { in: woredaIds } },
        select: { woredaId: true, status: true },
      }),
      db.property.findMany({
        where: { woredaId: { in: woredaIds } },
        select: { woredaId: true },
      }),
      db.payment.findMany({
        where: { file: { woredaId: { in: woredaIds } } },
        select: { amount: true, cashFlag: true, file: { select: { woredaId: true } } },
      }),
      db.complaint.findMany({
        where: { receivedAtOrgUnitId: { in: unitIds } },
        select: {
          receivedAtOrgUnitId: true, status: true,
          appeals: { select: { status: true } },
        },
      }),
      db.penaltyCase.findMany({
        where: { property: { woredaId: { in: woredaIds } } },
        select: {
          computedAmount: true, capApplied: true, status: true,
          property: { select: { woredaId: true } },
        },
      }),
      db.systemUser.findMany({
        where: { orgUnitId: { in: unitIds } },
        select: { staffCode: true, fullName: true, roleCode: true, isActive: true, orgUnitId: true },
      }),
    ]);

    // --- per-woreda operational rows (registration / properties / payments /
    //     penalties share the woreda grain; the UI joins them per type) ----
    const woredaRows = woredas.map((w) => {
      const wf = files.filter((f) => f.woredaId === w.id);
      const pays = paymentsRaw.filter((p) => p.file.woredaId === w.id);
      const pens = penalties.filter((p) => p.property?.woredaId === w.id);
      const byStatus = Object.fromEntries(
        FILE_STATUSES.map((s) => [s, wf.filter((f) => f.status === s).length]),
      );
      return {
        subCityCode: w.parentId ? unitById.get(w.parentId)?.code ?? "—" : "—",
        subCityName: w.parentId ? unitById.get(w.parentId)?.nameEn ?? "—" : "—",
        woredaCode: w.code,
        woredaName: w.nameEn,
        properties: properties.filter((p) => p.woredaId === w.id).length,
        files: { total: wf.length, ...byStatus },
        payments: {
          receipts: pays.length,
          totalEtb: Math.round(pays.reduce((s, p) => s + p.amount, 0) * 100) / 100,
          cashFlags: pays.filter((p) => p.cashFlag).length,
        },
        penalties: {
          cases: pens.length,
          imposedEtb: Math.round(pens.reduce((s, p) => s + p.computedAmount, 0) * 100) / 100,
          capped: pens.filter((p) => p.capApplied).length,
          open: pens.filter((p) => !["PAID", "CLOSED"].includes(p.status)).length,
        },
      };
    });

    // --- complaints per receiving unit (woreda desks, sub-city or bureau) --
    const complaintGroups = new Map<string, typeof complaints>();
    for (const c of complaints) {
      const list = complaintGroups.get(c.receivedAtOrgUnitId) ?? [];
      list.push(c);
      complaintGroups.set(c.receivedAtOrgUnitId, list);
    }
    const complaintRows = [...complaintGroups.entries()]
      .map(([unitId, list]) => {
        const u = unitById.get(unitId);
        return {
          unitCode: u?.code ?? unitId,
          unitName: u?.nameEn ?? "—",
          tier: u?.tier ?? "—",
          received: list.length,
          open: list.filter((c) => !["DECIDED", "CLOSED", "REJECTED_INCOMPLETE"].includes(c.status)).length,
          decided: list.filter((c) => ["DECIDED", "CLOSED"].includes(c.status)).length,
          appeals: list.reduce((s, c) => s + c.appeals.length, 0),
          appealsOpen: list.reduce(
            (s, c) => s + c.appeals.filter((a) => !["DECIDED", "ESCALATED_TO_COURT"].includes(a.status)).length,
            0,
          ),
        };
      })
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode));

    // --- staffing & structure per sub-city ("manage sub city") ------------
    const staffing = subCities.map((sc) => {
      const officer = staff.find((s) => s.roleCode === "SUBCITY_MONITOR" && s.orgUnitId === sc.id && s.isActive);
      const woredasOf = woredas.filter((w) => w.parentId === sc.id);
      const desks = staff.filter(
        (s) => s.isActive && woredasOf.some((w) => w.id === s.orgUnitId),
      );
      return {
        subCityCode: sc.code,
        subCityName: sc.nameEn,
        officer: officer ? { staffCode: officer.staffCode, fullName: officer.fullName } : null,
        woredaCount: woredasOf.length,
        deskCount: desks.length,
        registrars: desks.filter((d) => d.roleCode === "WOREDA_REGISTRAR").length,
        stampers: desks.filter((d) => d.roleCode === "WOREDA_STAMPER").length,
        committee: desks.filter((d) => d.roleCode === "COMMITTEE_MEMBER").length,
      };
    });

    const openComplaints = complaints.filter(
      (c) => !["DECIDED", "CLOSED", "REJECTED_INCOMPLETE"].includes(c.status),
    ).length;

    return ok({
      cityCode: ctx.cityCode,
      generatedAt: new Date().toISOString(),
      generatedBy: { staffCode: actor.staffCode, fullName: actor.fullName, roleCode: actor.roleCode },
      fileStatuses: FILE_STATUSES,
      totals: {
        subCities: subCities.length,
        woredas: woredas.length,
        subCitiesWithoutOfficer: staffing.filter((s) => !s.officer).length,
        properties: properties.length,
        files: files.length,
        registeredFiles: files.filter((f) => f.status === "REGISTERED").length,
        paymentReceipts: paymentsRaw.length,
        paymentsEtb: Math.round(paymentsRaw.reduce((s, p) => s + p.amount, 0) * 100) / 100,
        complaints: complaints.length,
        openComplaints,
        penaltyCases: penalties.length,
        penaltiesEtb: Math.round(penalties.reduce((s, p) => s + p.computedAmount, 0) * 100) / 100,
      },
      staffing,
      woredaRows,
      complaintRows,
    });
  } catch (err) { return fail(err); }
}
