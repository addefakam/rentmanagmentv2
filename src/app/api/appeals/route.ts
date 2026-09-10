// /api/appeals — M8 committee appeals and court escalation (Proc. Arts. 24-26).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { fileAppeal, progressAppeal } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const appeals = await db.appeal.findMany({
      include: { complaint: { include: { ground: true } } }, orderBy: { filedAt: "desc" }, take: 200,
    });
    return ok(appeals);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "appeal:file",
      { action: "APPEAL_FILE", entity: "Appeal", ref: (d: { appealNumber: string }) => d.appealNumber },
      () => fileAppeal({
        complaintId: String(input.complaintId), appellantName: String(input.appellantName),
        filedAt: new Date(String(input.filedAt ?? new Date().toISOString())),
      }));
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "appeal:progress",
      { action: `APPEAL_${String(input.action).toUpperCase()}`, entity: "Appeal", ref: (d: { appealNumber: string }) => d.appealNumber },
      () => progressAppeal(String(input.id), String(input.action), {
        hearingAt: input.hearingAt ? new Date(String(input.hearingAt)) : undefined,
        decision: input.decision ? String(input.decision) : undefined,
        courtFiledAt: input.courtFiledAt ? new Date(String(input.courtFiledAt)) : undefined,
      }));
  } catch (err) { return fail(err); }
}
