// /api/complaints — M8 complaint intake and dispute pipeline (Proc. Arts. 20-26).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createComplaint, progressComplaint } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const complaints = await db.complaint.findMany({
      include: { ground: true, appeals: true }, orderBy: { receivedAt: "desc" }, take: 200,
    });
    return ok(complaints);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const complaint = await createComplaint({
      channel: String(input.channel), groundCode: String(input.groundCode),
      complainantName: input.complainantName ? String(input.complainantName) : undefined,
      complainantPhone: input.complainantPhone ? String(input.complainantPhone) : undefined,
      propertyId: input.propertyId ? String(input.propertyId) : undefined,
      targetFileNumber: input.targetFileNumber ? String(input.targetFileNumber) : undefined,
      description: String(input.description),
      receivedAt: new Date(String(input.receivedAt ?? new Date().toISOString())),
      receivedAtOrgUnitId: String(input.receivedAtOrgUnitId),
    });
    return ok(complaint);
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const complaint = await progressComplaint(String(input.id), String(input.action), {
      note: input.note ? String(input.note) : undefined,
      decision: input.decision ? String(input.decision) : undefined,
      summary: input.summary ? String(input.summary) : undefined,
    });
    return ok(complaint);
  } catch (err) { return fail(err); }
}
