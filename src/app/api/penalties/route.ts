// /api/penalties — M9 penalty ladder, referrals and court recovery
// (Proc. Arts. 29-32; Dir. Art. 22).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createPenaltyCase, progressPenaltyCase } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const penalties = await db.penaltyCase.findMany({
      include: { offense: true, referrals: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(penalties);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "penalty:manage",
      { action: "PENALTY_OPEN", entity: "PenaltyCase", ref: (d: { caseNumber: string }) => d.caseNumber },
      () => createPenaltyCase({
        offenseCode: String(input.offenseCode), subjectType: String(input.subjectType),
        propertyId: input.propertyId ? String(input.propertyId) : undefined,
        subjectRef: input.subjectRef ? String(input.subjectRef) : undefined,
        monthlyRentRef: input.monthlyRentRef ? Number(input.monthlyRentRef) : undefined,
        vacancyYears: input.vacancyYears ? Number(input.vacancyYears) : undefined,
        basisRef: String(input.basisRef ?? "Dir. Art. 22"),
      }));
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "penalty:manage",
      { action: `PENALTY_${String(input.action).toUpperCase()}`, entity: "PenaltyCase", ref: (d: { caseNumber: string }) => d.caseNumber },
      () => progressPenaltyCase(String(input.id), String(input.action), {
        targetBody: input.targetBody ? String(input.targetBody) : undefined,
      }));
  } catch (err) { return fail(err); }
}
