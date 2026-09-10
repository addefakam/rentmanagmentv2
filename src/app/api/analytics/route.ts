// /api/analytics — M11 aggregation snapshots (Proc. Art. 18; Dir. Art. 13).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { computeSnapshot } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await db.aggregationSnapshot.findMany({
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
      () => computeSnapshot(String(input.orgUnitId), String(input.period)));
  } catch (err) { return fail(err); }
}
