// /api/parties — M1 party onboarding. POST creates (with Dir. Art. 7
// original-and-copy and proxy rules), GET lists.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createParty } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const parties = await db.party.findMany({
      include: { idType: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(parties);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const party = await createParty({
      type: String(input.type), fullName: String(input.fullName),
      idTypeId: String(input.idTypeId), idNumber: String(input.idNumber),
      idOriginalSeen: Boolean(input.idOriginalSeen), idCopyAttached: Boolean(input.idCopyAttached),
      phone: input.phone ? String(input.phone) : undefined,
      address: input.address ? String(input.address) : undefined,
      isDeaf: Boolean(input.isDeaf), usesSignLanguage: Boolean(input.usesSignLanguage),
      proxyName: input.proxyName ? String(input.proxyName) : undefined,
      proxyIdNumber: input.proxyIdNumber ? String(input.proxyIdNumber) : undefined,
      proxyWitness1Name: input.proxyWitness1Name ? String(input.proxyWitness1Name) : undefined,
      proxyWitness2Name: input.proxyWitness2Name ? String(input.proxyWitness2Name) : undefined,
      registeredAtOrgUnitId: String(input.registeredAtOrgUnitId),
    });
    return ok(party);
  } catch (err) { return fail(err); }
}
