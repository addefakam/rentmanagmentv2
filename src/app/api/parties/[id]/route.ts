// /api/parties/[id] — M1 registrar verification act (Dir. Art. 7).
import { ok, fail, body } from "@/lib/api";
import { verifyParty } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { decision } = await body<{ decision: "VERIFIED" | "REJECTED" }>(req);
    const party = await verifyParty(id, decision);
    return ok(party);
  } catch (err) { return fail(err); }
}
