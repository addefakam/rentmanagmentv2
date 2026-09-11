// /api/penalties — M9 penalty ladder, referrals and court recovery
// (Proc. Arts. 29-32; Dir. Art. 22).
// CITY SCOPE: penalty cases attach to a city's properties; a city-bound
// officer opens, progresses and lists cases of their own city only.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createPenaltyCase, progressPenaltyCase } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertPropertyInScope, CityScopeError } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const penalties = await db.penaltyCase.findMany({
      include: { offense: true, referrals: true, property: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    const filtered = scope
      ? penalties.filter((p) => p.propertyId && p.property && scope.woredaIds.includes(p.property.woredaId))
      : penalties;
    return ok(filtered);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "penalty:manage",
      { action: "PENALTY_OPEN", entity: "PenaltyCase", ref: (d: { caseNumber: string }) => d.caseNumber },
      async (actor) => {
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        if (input.propertyId) await assertPropertyInScope(ctx, String(input.propertyId));
        return createPenaltyCase({
          offenseCode: String(input.offenseCode), subjectType: String(input.subjectType),
          propertyId: input.propertyId ? String(input.propertyId) : undefined,
          subjectRef: input.subjectRef ? String(input.subjectRef) : undefined,
          monthlyRentRef: input.monthlyRentRef ? Number(input.monthlyRentRef) : undefined,
          vacancyYears: input.vacancyYears ? Number(input.vacancyYears) : undefined,
          basisRef: String(input.basisRef ?? "Dir. Art. 22"),
        });
      });
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "penalty:manage",
      { action: `PENALTY_${String(input.action).toUpperCase()}`, entity: "PenaltyCase", ref: (d: { caseNumber: string }) => d.caseNumber },
      async (actor) => {
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        const kase = await db.penaltyCase.findUnique({
          where: { id: String(input.id ?? "") }, select: { propertyId: true },
        });
        if (kase?.propertyId) await assertPropertyInScope(ctx, kase.propertyId);
        return progressPenaltyCase(String(input.id), String(input.action), {
          targetBody: input.targetBody ? String(input.targetBody) : undefined,
        });
      });
  } catch (err) { return fail(err); }
}
