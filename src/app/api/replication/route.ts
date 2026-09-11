// /api/replication — M10 tier replication (Dir. Art. 13 upward propagation).
// CITY SCOPE: replication propagates from a city's own org units only.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { enqueueReplication } from "@/lib/domain/service";
import { withGuard, cityContext, readScope } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const replications = await db.replicationLog.findMany({
      where: scope ? { fromOrgUnitId: { in: scope.unitIds } } : {},
      orderBy: { propagatedAt: "desc" }, take: 200,
    });
    return ok(replications);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "replication:run",
      { action: "REPLICATION_ENQUEUE", entity: "ReplicationLog", ref: () => String(input.recordRef ?? "") },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.fromOrgUnitId ?? ""), unitLabel: "origin org unit",
        });
        return enqueueReplication(
          `REP-${Date.now()}`,
          String(input.fromOrgUnitId), String(input.recordType), String(input.recordRef),
          input.summary ? String(input.summary) : undefined,
        );
      });
  } catch (err) { return fail(err); }
}
