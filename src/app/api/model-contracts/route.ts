// /api/model-contracts — M3 model contract studio (Proc. Art. 5; Dir. Art. 4):
// list versions; POST amends the active version into a new version.
// CITY SCOPE: amendments execute in the base contract's city; a city-bound
// officer can only amend their own city's contract (403 otherwise).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { amendModelContract } from "@/lib/domain/service";
import { withGuard, cityContext, readScope } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const contracts = await db.modelContract.findMany({
      where: scope ? { cityCode: scope.cityCode } : {},
      include: { sections: { orderBy: { orderNo: "asc" } } },
      orderBy: { effectiveFrom: "desc" },
    });
    return ok(contracts);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const changes = Array.isArray(input.changes)
      ? (input.changes as { sectionCode: string; contentEn?: string; contentAm?: string; contentOm?: string }[])
      : [];
    return await withGuard(req, "modelcontract:amend",
      { action: "MODEL_CONTRACT_AMEND", entity: "ModelContract", ref: (d: { version: string }) => d.version },
      async (actor) => {
        const base = await db.modelContract.findUnique({ where: { id: String(input.baseContractId ?? "") } });
        if (!base) throw new Error("Unknown base contract.");
        // City-bound: pinned to own city (mismatch -> 403). National: scoped
        // to the contract's own city.
        await cityContext(actor, { city: base.cityCode ?? null });
        return amendModelContract({
          baseContractId: String(input.baseContractId), newVersion: String(input.newVersion),
          note: String(input.note ?? ""), changes,
        });
      });
  } catch (err) { return fail(err); }
}
