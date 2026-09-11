// /api/complaints — M8 complaint intake and dispute pipeline (Proc. Arts. 20-26).
// CITY SCOPE: complaints are received by a city org unit; a city-bound officer
// intakes, progresses and lists complaints of their own city only.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createComplaint, progressComplaint } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertPropertyInScope, CityScopeError } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const complaints = await db.complaint.findMany({
      where: scope ? { receivedAtOrgUnitId: { in: scope.unitIds } } : {},
      include: { ground: true, appeals: true }, orderBy: { receivedAt: "desc" }, take: 200,
    });
    return ok(complaints);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "complaint:intake",
      { action: "COMPLAINT_INTAKE", entity: "Complaint", ref: (d: { refNumber: string }) => d.refNumber },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.receivedAtOrgUnitId ?? ""), unitLabel: "receiving office",
        });
        if (input.propertyId) await assertPropertyInScope(ctx, String(input.propertyId));
        return createComplaint({
          channel: String(input.channel), groundCode: String(input.groundCode),
          complainantName: input.complainantName ? String(input.complainantName) : undefined,
          complainantPhone: input.complainantPhone ? String(input.complainantPhone) : undefined,
          propertyId: input.propertyId ? String(input.propertyId) : undefined,
          targetFileNumber: input.targetFileNumber ? String(input.targetFileNumber) : undefined,
          description: String(input.description),
          receivedAt: new Date(String(input.receivedAt ?? new Date().toISOString())),
          receivedAtOrgUnitId: String(input.receivedAtOrgUnitId),
        });
      });
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "complaint:progress",
      { action: `COMPLAINT_${String(input.action).toUpperCase()}`, entity: "Complaint", ref: (d: { refNumber: string }) => d.refNumber },
      async (actor) => {
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        const complaint = await db.complaint.findUnique({
          where: { id: String(input.id ?? "") }, select: { receivedAtOrgUnitId: true },
        });
        if (complaint && !ctx.unitIds.includes(complaint.receivedAtOrgUnitId)) {
          throw new CityScopeError("Cross-city access denied: this complaint was received by another city.");
        }
        return progressComplaint(String(input.id), String(input.action), {
          note: input.note ? String(input.note) : undefined,
          decision: input.decision ? String(input.decision) : undefined,
          summary: input.summary ? String(input.summary) : undefined,
        });
      });
  } catch (err) { return fail(err); }
}
