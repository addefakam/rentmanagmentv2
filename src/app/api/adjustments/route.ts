// /api/adjustments — M5 annual rent adjustment engine (Proc. Arts. 8-11).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createAdjustment, publishAdjustment, effectAdjustment, validateIncrease } from "@/lib/domain/service";

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
      return ok(await validateIncrease(String(input.fileId), Number(input.proposedRent)));
    }
    const adj = await createAdjustment(
      Number(input.year), Number(input.percentage),
      input.basisStudy ? String(input.basisStudy) : undefined,
    );
    return ok(adj);
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const id = String(input.id);
    if (input.action === "publish") {
      return ok(await publishAdjustment(id, String(input.byOrgUnitId ?? "")));
    }
    if (input.action === "effect") {
      return ok(await effectAdjustment(id));
    }
    return fail(new Error("Unknown adjustment action"));
  } catch (err) { return fail(err); }
}
