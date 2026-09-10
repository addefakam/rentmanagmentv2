// /api/model-contracts — M3 model contract studio (Proc. Art. 5; Dir. Art. 4):
// list versions; POST amends the active version into a new version.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { amendModelContract } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contracts = await db.modelContract.findMany({
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
    const next = await amendModelContract({
      baseContractId: String(input.baseContractId), newVersion: String(input.newVersion),
      note: String(input.note ?? ""), changes,
    });
    return ok(next);
  } catch (err) { return fail(err); }
}
