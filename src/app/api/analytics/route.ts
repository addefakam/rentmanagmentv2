// /api/analytics — M11 aggregation snapshots (Proc. Art. 18; Dir. Art. 13).
// CITY SCOPE: a city-bound analyst computes snapshots for their city's units
// only; cross-city org references are denied 403.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { computeSnapshot } from "@/lib/domain/service";
import { withGuard, cityContext, readScope } from "@/lib/security/authz";
import { requireModuleForRequest, requireModule } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // SaaS module gate — disabled module = API unavailable (not just hidden).
    await requireModuleForRequest(req, "ANALYTICS");
    const scope = await readScope(req);
    const snapshots = await db.aggregationSnapshot.findMany({
      where: scope ? { orgUnitId: { in: scope.unitIds } } : {},
      include: { orgUnit: true }, orderBy: { computedAt: "desc" }, take: 100,
    });
    return ok(snapshots);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "analytics:compute",
      { action: "SNAPSHOT_COMPUTE", entity: "AggregationSnapshot", ref: (d: { id: string }) => d.id },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.orgUnitId ?? ""), unitLabel: "aggregation unit",
        });
        await requireModule(ctx.cityCode, "ANALYTICS"); // SaaS module gate (target tenant resolved by the scope wall)
        return computeSnapshot(String(input.orgUnitId), String(input.period));
      });
  } catch (err) { return fail(err); }
}
