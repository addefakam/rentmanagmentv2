// /api/adjustments — M5 annual rent adjustment engine (Proc. Arts. 8-11).
// Phase 5 separation of duties: the Bureau analyst drafts and validates
// increases; only the Bureau Head publishes and puts rates into effect.
// CITY SCOPE: every action is executed inside the acting officer's city
// (cityContext); city-bound officers cannot draft for, publish, or validate
// another city's adjustments — cross-city references are denied 403.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createAdjustment, publishAdjustment, effectAdjustment, validateIncrease } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertFileInScope, CityScopeError } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const adjustments = await db.rentAdjustment.findMany({
      where: scope ? { cityCode: scope.cityCode } : {},
      orderBy: { year: "desc" },
    });
    return ok(adjustments);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    if (input.action === "validate-increase") {
      return await withGuard(req, "adjustment:validate",
        { action: "INCREASE_VALIDATE", entity: "RegistrationFile", ref: () => String(input.fileId ?? "") },
        async (actor) => {
          const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
          await assertFileInScope(ctx, String(input.fileId ?? ""));
          return validateIncrease(String(input.fileId), Number(input.proposedRent));
        });
    }
    return await withGuard(req, "adjustment:draft",
      { action: "ADJUSTMENT_DRAFT", entity: "RentAdjustment", ref: (d) => d.year != null ? `Y${d.year}` : null },
      async (actor) => {
        // The adjustment is created for the acting city — a city-bound officer
        // naming another city is denied by the scope wall.
        const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
        return createAdjustment(
          ctx.cityCode,
          Number(input.year), Number(input.percentage),
          input.basisStudy ? String(input.basisStudy) : undefined,
        );
      });
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const id = String(input.id);
    if (input.action === "publish") {
      return await withGuard(req, "adjustment:publish",
        { action: "ADJUSTMENT_PUBLISH", entity: "RentAdjustment", ref: () => id },
        async (actor) => {
          const ctx = await cityContext(actor, {
            city: input.cityCode ?? req.headers.get("x-city-code"),
            unitId: input.byOrgUnitId ? String(input.byOrgUnitId) : null,
            unitLabel: "publishing bureau",
          });
          const adj = await db.rentAdjustment.findUnique({ where: { id } });
          if (adj && adj.cityCode !== ctx.cityCode) {
            throw new CityScopeError(`Cross-city access denied: adjustment ${id} belongs to ${adj.cityCode}.`);
          }
          return publishAdjustment(id, String(input.byOrgUnitId ?? ctx.bureauId ?? ""));
        });
    }
    if (input.action === "effect") {
      return await withGuard(req, "adjustment:effect",
        { action: "ADJUSTMENT_EFFECT", entity: "RentAdjustment", ref: () => id },
        async (actor) => {
          const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
          const adj = await db.rentAdjustment.findUnique({ where: { id } });
          if (adj && adj.cityCode !== ctx.cityCode) {
            throw new CityScopeError(`Cross-city access denied: adjustment ${id} belongs to ${adj.cityCode}.`);
          }
          return effectAdjustment(id);
        });
    }
    return fail(new Error("Unknown adjustment action"));
  } catch (err) { return fail(err); }
}
