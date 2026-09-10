// /api/replication — M10 tier replication (Dir. Art. 13 upward propagation).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { enqueueReplication } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const replications = await db.replicationLog.findMany({
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
      () => enqueueReplication(
        `REP-${Date.now()}`,
        String(input.fromOrgUnitId), String(input.recordType), String(input.recordRef),
        input.summary ? String(input.summary) : undefined,
      ));
  } catch (err) { return fail(err); }
}
