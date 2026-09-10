// /api/properties — M2 property registry with exemption clocks (Proc. Art. 10).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createProperty } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const properties = await db.property.findMany({
      include: { woreda: true, landlord: true, statusType: true },
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(properties);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const property = await createProperty({
      woredaId: String(input.woredaId), landlordId: String(input.landlordId),
      kebele: input.kebele ? String(input.kebele) : undefined,
      houseNo: input.houseNo ? String(input.houseNo) : undefined,
      addressNote: input.addressNote ? String(input.addressNote) : undefined,
      ownershipEvidence: String(input.ownershipEvidence),
      evidenceRef: String(input.evidenceRef),
      statusTypeId: String(input.statusTypeId),
      rooms: Number(input.rooms ?? 1), areaSqm: input.areaSqm ? Number(input.areaSqm) : undefined,
      statusSetAt: new Date(String(input.statusSetAt)),
    });
    return ok(property);
  } catch (err) { return fail(err); }
}
