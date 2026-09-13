// /api/national — the System Super User's NATIONAL MANAGEMENT surface
// (owner directive). One endpoint, three powers:
//
//   GET  (SYSTEM_ADMIN)  → fleet statistics, management duties, per-city
//                          rows, the national regulation register and the
//                          model-contract parity view.
//   GET  (any officer)   → the national regulation register ONLY: regulations
//                          and model changes added by the super user are
//                          REFLECTED TO EVERY CITY automatically (federal law
//                          is one register — each city console reads it here).
//   POST (SYSTEM_ADMIN)  → action-based mutations:
//        ADD_REGULATION          — add a regulation / modification / model
//                                  change to the national register (fleet-wide).
//        ARCHIVE_REGULATION      — retire a register entry (kept for history).
//        PROPAGATE_MODEL_CONTRACT— amend EVERY active city's model contract
//                                  into a new version with the given section
//                                  changes (Proc. Art. 5; Dir. Art. 4).
//
// Mutations are capability-guarded ("regulation:manage" /
// "modelcontract:propagate" — SYSTEM_ADMIN only) and audit-logged.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard, resolveActor, SecurityError } from "@/lib/security/authz";
import { getAuthMode } from "@/lib/security/session";
import { cityCodeForOrgUnit } from "@/lib/city";
import { amendModelContract } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

const REG_KEY = "NATIONAL_REGULATIONS";

type Regulation = {
  id: string; code: string; titleEn: string; titleAm?: string; titleOm?: string;
  type: string; year: number; note?: string;
  status: "ACTIVE" | "ARCHIVED"; addedBy: string; addedAt: string;
};

async function readRegulations(): Promise<Regulation[]> {
  const row = await db.platformSetting.findUnique({ where: { key: REG_KEY } });
  if (!row?.value) return [];
  try { return JSON.parse(row.value) as Regulation[]; } catch { return []; }
}

async function writeRegulations(list: Regulation[], by: string): Promise<void> {
  const value = JSON.stringify(list);
  await db.platformSetting.upsert({
    where: { key: REG_KEY },
    update: { value, updatedBy: by },
    create: { key: REG_KEY, value, updatedBy: by },
  });
}

export async function GET(req: Request) {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      throw new SecurityError("No acting officer identified. Present a valid x-staff-code header.", "AUTH_MISSING");
    }
    const regulations = await readRegulations();

    // Every officer (every city console) sees the national regulation register
    // — that IS the "reflected for all cities" surface. Only the super user
    // gets the fleet statistics and management duties on top.
    if (actor.roleCode !== "SYSTEM_ADMIN") {
      return ok({ scope: "OFFICER", regulations: regulations.filter((r) => r.status === "ACTIVE") });
    }

    // ---- Fleet statistics -------------------------------------------------
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [configs, units, officerCount, partyCount, propertyCount, fileStatus, payAgg,
      complaintStatus, adjustmentStatus, publicationCount, audits30, lastBackup,
      deadlineOpen, deadlineOverdue, activeContracts] = await Promise.all([
      db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.systemUser.count({ where: { isActive: true } }),
      db.party.count(),
      db.property.count(),
      db.registrationFile.groupBy({ by: ["status"], _count: { _all: true } }),
      db.payment.aggregate({ _count: { _all: true }, _sum: { amount: true } }),
      db.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
      db.rentAdjustment.groupBy({ by: ["status"], _count: { _all: true } }),
      db.publicationItem.count(),
      db.auditEvent.count({ where: { at: { gte: since } } }),
      db.backupRun.findFirst({ orderBy: { startedAt: "desc" } }),
      db.deadlineTrack.count({ where: { status: "OPEN" } }),
      db.deadlineTrack.count({ where: { status: "OPEN", dueAt: { lt: new Date() } } }),
      db.modelContract.findMany({ where: { status: "ACTIVE" }, select: { cityCode: true, version: true, effectiveFrom: true } }),
    ]);

    const byStatus = (rows: Array<{ status: string; _count: { _all: number } }>) =>
      Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
    const files = byStatus(fileStatus);
    const complaints = byStatus(complaintStatus);
    const adjustments = byStatus(adjustmentStatus);
    const complaintsOpen = (complaints.INTAKE ?? 0) + (complaints.COMPLETENESS_VERIFIED ?? 0) + (complaints.UNDER_INVESTIGATION ?? 0);
    const filesActive = (files.PRESENTED ?? 0) + (files.CHECKLIST_PASSED ?? 0) + (files.CERTIFIED ?? 0) + (files.STAMPED ?? 0);

    const cityRows = configs.map((c) => ({ cityCode: c.cityCode, nameEn: c.nameEn, isActive: c.isActive, status: (c as { status?: string }).status ?? (c.isActive ? "ACTIVE" : "DEACTIVATED") }));

    const stats = {
      cities: {
        total: configs.length,
        active: configs.filter((c) => c.isActive).length,
        suspended: configs.filter((c) => (c as { status?: string }).status === "SUSPENDED").length,
        deactivated: configs.filter((c) => !c.isActive).length,
      },
      officers: officerCount,
      parties: partyCount,
      properties: propertyCount,
      files: { total: Object.values(files).reduce((a, b) => a + b, 0), inProgress: filesActive, registered: files.REGISTERED ?? 0, rejected: files.REJECTED ?? 0 },
      payments: { count: payAgg._count._all, amount: payAgg._sum.amount ?? 0 },
      complaints: { total: Object.values(complaints).reduce((a, b) => a + b, 0), open: complaintsOpen, decided: (complaints.DECIDED ?? 0) + (complaints.CLOSED ?? 0) },
      adjustments: { published: (adjustments.PUBLISHED ?? 0) + (adjustments.EFFECTIVE ?? 0), draft: adjustments.DRAFT ?? 0 },
      publications: publicationCount,
      auditEvents30d: audits30,
      deadlines: { open: deadlineOpen, overdue: deadlineOverdue },
    };

    // ---- Per-city management rows -----------------------------------------
    const [cityUsers, cityFiles, cityComplaints] = await Promise.all([
      db.systemUser.findMany({ where: { isActive: true }, select: { orgUnitId: true } }),
      db.registrationFile.findMany({ select: { woredaId: true, status: true } }),
      db.complaint.findMany({ select: { receivedAtOrgUnitId: true, status: true } }),
    ]);
    const cityOfUnit = new Map<string, string>();
    for (const u of units) {
      const cc = cityCodeForOrgUnit(units as never, configs as never, u.id);
      if (cc) cityOfUnit.set(u.id, cc);
    }
    const rows = cityRows.map((c) => ({
      ...c,
      officers: cityUsers.filter((u) => cityOfUnit.get(u.orgUnitId) === c.cityCode).length,
      files: cityFiles.filter((f) => cityOfUnit.get(f.woredaId) === c.cityCode).length,
      complaintsOpen: cityComplaints.filter((k) => cityOfUnit.get(k.receivedAtOrgUnitId) === c.cityCode &&
        ["INTAKE", "COMPLETENESS_VERIFIED", "UNDER_INVESTIGATION"].includes(k.status)).length,
      contractVersion: activeContracts.find((m) => m.cityCode === c.cityCode)?.version ?? null,
    }));

    // ---- Management duties -------------------------------------------------
    const authMode = await getAuthMode();
    const aaVersion = activeContracts.find((m) => m.cityCode === "AA")?.version ?? null;
    const norm = (v: string | null) => (v ? v.replace(/^[A-Z]+-/, "") : null);
    const parityOff = rows.filter((r) => r.isActive && norm(r.contractVersion) !== norm(aaVersion)).map((r) => r.cityCode);
    const activeRegs = regulations.filter((r) => r.status === "ACTIVE");
    const tasks = [
      { key: "backup", label: "Database backup (duty: backup:run)", status: lastBackup && lastBackup.status === "SUCCEEDED" ? "OK" : "ATTENTION",
        detail: lastBackup ? `Last run ${new Date(lastBackup.startedAt).toISOString().slice(0, 10)} — ${lastBackup.status}` : "No backup has ever been recorded." },
      { key: "deadlines", label: "Statutory deadline sweep (Dir. Art. 19)", status: deadlineOverdue > 0 ? "ATTENTION" : "OK",
        detail: deadlineOverdue > 0 ? `${deadlineOverdue} open deadline(s) past due — run the sweep.` : `${deadlineOpen} open clock(s), none overdue.` },
      { key: "tenants", label: "Tenant lifecycle watch", status: stats.cities.suspended > 0 ? "ATTENTION" : "OK",
        detail: stats.cities.suspended > 0 ? `${stats.cities.suspended} suspended tenant(s) need review.` : "No suspended tenants." },
      { key: "parity", label: "Model contract parity across cities", status: parityOff.length > 0 ? "ATTENTION" : "OK",
        detail: parityOff.length > 0 ? `Not on the federal version: ${parityOff.join(", ")} — use Propagate.` : `All active cities on version ${norm(aaVersion) ?? "n/a"}.` },
      { key: "auth", label: "Authentication posture", status: authMode === "production" ? "OK" : "ATTENTION",
        detail: `auth_mode = ${authMode}${authMode === "demo" ? " (console reads open — switch at cutover)" : ""}.` },
      { key: "regulations", label: "National regulation register", status: "OK",
        detail: `${activeRegs.length} active entr${activeRegs.length === 1 ? "y" : "ies"} — reflected in EVERY city console automatically.` },
    ];

    // ---- Model contract sections (federal template for propagation) --------
    const aaActive = await db.modelContract.findFirst({
      where: { status: "ACTIVE", cityCode: "AA" },
      include: { sections: { orderBy: { orderNo: "asc" } } },
    });

    return ok({
      scope: "SYSTEM_ADMIN", stats, tasks, rows,
      regulations,
      sections: aaActive?.sections.map((s) => ({ code: s.code, titleEn: s.titleEn })) ?? [],
      federalVersion: aaActive?.version ?? null,
    });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const action = String(input.action ?? "");

    if (action === "ADD_REGULATION") {
      return await withGuard(req, "regulation:manage",
        { action: "REGULATION_ADD", entity: "NationalRegulation", ref: (d: Regulation) => d.code, summary: (d: Regulation) => `${d.type} ${d.code} — reflected to all cities` },
        async (actor) => {
          const list = await readRegulations();
          const reg: Regulation = {
            id: `REG-${Date.now().toString(36).toUpperCase()}`,
            code: String(input.code ?? "").trim(),
            titleEn: String(input.titleEn ?? "").trim(),
            titleAm: input.titleAm ? String(input.titleAm) : undefined,
            titleOm: input.titleOm ? String(input.titleOm) : undefined,
            type: String(input.type ?? "REGULATION"),
            year: Number(input.year ?? new Date().getFullYear()),
            note: input.note ? String(input.note) : undefined,
            status: "ACTIVE", addedBy: actor.staffCode, addedAt: new Date().toISOString(),
          };
          if (!reg.code || !reg.titleEn) throw new SecurityError("Regulation code and English title are required.", "VALIDATION");
          if (list.some((r) => r.code.toLowerCase() === reg.code.toLowerCase() && r.status === "ACTIVE")) {
            throw new SecurityError(`An active regulation with code ${reg.code} already exists.`, "VALIDATION");
          }
          const next = [reg, ...list];
          await writeRegulations(next, actor.staffCode);
          return reg;
        });
    }

    if (action === "ARCHIVE_REGULATION") {
      return await withGuard(req, "regulation:manage",
        { action: "REGULATION_ARCHIVE", entity: "NationalRegulation", ref: () => String(input.id ?? "") },
        async (actor) => {
          const list = await readRegulations();
          const hit = list.find((r) => r.id === String(input.id ?? ""));
          if (!hit) throw new SecurityError("Unknown regulation entry.", "VALIDATION");
          hit.status = "ARCHIVED";
          await writeRegulations(list, actor.staffCode);
          return hit;
        });
    }

    if (action === "PROPAGATE_MODEL_CONTRACT") {
      return await withGuard(req, "modelcontract:propagate",
        { action: "MODEL_CONTRACT_PROPAGATE", entity: "ModelContract", ref: () => String(input.suffix ?? ""), summary: (d: { results: Array<{ cityCode: string; created: boolean }> }) => `fleet propagation: ${d.results.filter((r) => r.created).length} city(ies) updated` },
        async (actor) => {
          const suffix = String(input.suffix ?? "").trim();
          const note = String(input.note ?? "");
          const changes = Array.isArray(input.changes)
            ? (input.changes as { sectionCode: string; contentEn?: string; contentAm?: string; contentOm?: string }[])
            : [];
          const only = Array.isArray(input.cities) ? (input.cities as string[]) : null;
          if (!/^[A-Za-z0-9.\-]+$/.test(suffix)) throw new SecurityError("Version suffix is required (letters, digits, dots).", "VALIDATION");
          if (changes.length === 0) throw new SecurityError("An amendment must change at least one section (Dir. Art. 4).", "VALIDATION");

          const configs = await db.cityConfig.findMany({ orderBy: { cityCode: "asc" } });
          const targets = configs.filter((c) => c.isActive && (!only || only.includes(c.cityCode)));
          const results: Array<{ cityCode: string; created: boolean; version?: string; detail?: string }> = [];
          for (const c of targets) {
            const version = `${c.cityCode}-${suffix}`;
            try {
              const base = await db.modelContract.findFirst({
                where: { status: "ACTIVE", cityCode: c.cityCode }, orderBy: { effectiveFrom: "desc" },
              });
              if (!base) { results.push({ cityCode: c.cityCode, created: false, detail: "no active contract to amend" }); continue; }
              const next = await amendModelContract({ baseContractId: base.id, newVersion: version, note, changes });
              results.push({ cityCode: c.cityCode, created: true, version: next.version });
            } catch (e) {
              results.push({ cityCode: c.cityCode, created: false, detail: e instanceof Error ? e.message : "amendment failed" });
            }
          }
          return { suffix, actor: actor.staffCode, results, updatedAt: new Date().toISOString() };
        });
    }

    throw new SecurityError(`Unknown action: ${action}`, "VALIDATION");
  } catch (err) { return fail(err); }
}
