// /api/appeals — M8 committee appeals and court escalation (Proc. Arts. 24-26).
// CITY SCOPE: appeals ride on complaints; a city-bound officer can only file
// and progress appeals of complaints received inside their own city.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { fileAppeal, progressAppeal } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertComplaintInScope, CityScopeError } from "@/lib/security/authz";
import { requireModuleForRequest, requireModule } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // SaaS module gate — disabled module = API unavailable (not just hidden).
    await requireModuleForRequest(req, "COMPLAINTS");
    const scope = await readScope(req);
    const appeals = await db.appeal.findMany({
      include: { complaint: { include: { ground: true } } }, orderBy: { filedAt: "desc" }, take: 200,
    });
    const filtered = scope
      ? appeals.filter((a) => scope.unitIds.includes(a.complaint.receivedAtOrgUnitId))
      : appeals;
    return ok(filtered);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "appeal:file",
      { action: "APPEAL_FILE", entity: "Appeal", ref: (d: { appealNumber: string }) => d.appealNumber },
      async (actor) => {
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        await requireModule(ctx.cityCode, "COMPLAINTS"); // SaaS module gate (target tenant resolved by the scope wall)
        await assertComplaintInScope(ctx, String(input.complaintId ?? ""));
        return fileAppeal({
          complaintId: String(input.complaintId), appellantName: String(input.appellantName),
          filedAt: new Date(String(input.filedAt ?? new Date().toISOString())),
        });
      });
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "appeal:progress",
      { action: `APPEAL_${String(input.action).toUpperCase()}`, entity: "Appeal", ref: (d: { appealNumber: string }) => d.appealNumber },
      async (actor) => {
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        await requireModule(ctx.cityCode, "COMPLAINTS"); // SaaS module gate (target tenant resolved by the scope wall)
        const appeal = await db.appeal.findUnique({
          where: { id: String(input.id ?? "") }, select: { complaintId: true },
        });
        if (appeal) await assertComplaintInScope(ctx, appeal.complaintId);
        return progressAppeal(String(input.id), String(input.action), {
          hearingAt: input.hearingAt ? new Date(String(input.hearingAt)) : undefined,
          decision: input.decision ? String(input.decision) : undefined,
          courtFiledAt: input.courtFiledAt ? new Date(String(input.courtFiledAt)) : undefined,
        });
      });
  } catch (err) { return fail(err); }
}
