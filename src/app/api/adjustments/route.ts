// /api/adjustments — M5 annual rent adjustment engine (Proc. Arts. 8-11).
// Phase 5 separation of duties: the Bureau analyst drafts and validates
// increases; only the Bureau Head publishes and puts rates into effect.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createAdjustment, publishAdjustment, effectAdjustment, validateIncrease } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adjustments = await db.rentAdjustment.findMany({ orderBy: { year: "desc" } });
    return ok(adjustments);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    if (input.action === "validate-increase") {
      return await withGuard(req, "adjustment:validate",
        { action: "INCREASE_VALIDATE", entity: "RegistrationFile", ref: () => String(input.fileId ?? "") },
        () => validateIncrease(String(input.fileId), Number(input.proposedRent)));
    }
    return await withGuard(req, "adjustment:draft",
      { action: "ADJUSTMENT_DRAFT", entity: "RentAdjustment", ref: (d) => d.year != null ? `Y${d.year}` : null },
      () => createAdjustment(
        String(input.cityCode ?? req.headers.get("x-city-code") ?? "AA"),
        Number(input.year), Number(input.percentage),
        input.basisStudy ? String(input.basisStudy) : undefined,
      ));
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const id = String(input.id);
    if (input.action === "publish") {
      return await withGuard(req, "adjustment:publish",
        { action: "ADJUSTMENT_PUBLISH", entity: "RentAdjustment", ref: () => id },
        () => publishAdjustment(id, String(input.byOrgUnitId ?? "")));
    }
    if (input.action === "effect") {
      return await withGuard(req, "adjustment:effect",
        { action: "ADJUSTMENT_EFFECT", entity: "RentAdjustment", ref: () => id },
        () => effectAdjustment(id));
    }
    return fail(new Error("Unknown adjustment action"));
  } catch (err) { return fail(err); }
}
