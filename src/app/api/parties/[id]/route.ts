// /api/parties/[id] — M1 registrar verification act (Dir. Art. 7).
import { fail, body } from "@/lib/api";
import { verifyParty } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { decision } = await body<{ decision: "VERIFIED" | "REJECTED" }>(req);
    return await withGuard(req, "party:write",
      { action: `PARTY_${decision}`, entity: "Party", ref: (d) => d.partyCode },
      () => verifyParty(id, decision));
  } catch (err) { return fail(err); }
}
