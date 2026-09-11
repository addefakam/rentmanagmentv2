// /api/properties — M2 property registry with exemption clocks (Proc. Art. 10).
// CITY SCOPE: properties live in a woreda; a city-bound officer registers and
// lists properties of their own city only (403 on cross-city woreda refs).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createProperty } from "@/lib/domain/service";
import { withGuard, cityContext, readScope } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const properties = await db.property.findMany({
      where: scope ? { woredaId: { in: scope.woredaIds } } : {},
      include: { woreda: true, landlord: true, statusType: true },
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(properties);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "property:write",
      { action: "PROPERTY_CREATE", entity: "Property", ref: (d: { propertyCode: string }) => d.propertyCode },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.woredaId ?? ""), unitLabel: "woreda",
        });
        return createProperty({
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
      });
  } catch (err) { return fail(err); }
}
