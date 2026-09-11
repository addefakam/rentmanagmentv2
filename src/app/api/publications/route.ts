// /api/publications — M11 public data feed (Proc. Arts. 14, 16, 18).
// CITY SCOPE: publications are issued by a city bureau; city-bound officers
// publish as their own bureau only. (Capability publication:manage stays with
// the Ministry; the bureau reference is validated against the city scope.)
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard, cityContext, readScope } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const publications = await db.publicationItem.findMany({
      where: scope ? { publishedByOrgUnitId: { in: scope.unitIds } } : {},
      orderBy: { publishedAt: "desc" }, take: 100,
    });
    return ok(publications);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "publication:manage",
      { action: "PUBLICATION_CREATE", entity: "PublicationItem", ref: (d: { code: string }) => d.code },
      async (actor) => {
        // Publishing bureau: the requested city's bureau (x-city-code header,
        // set by the console for the city in view), else the acting city.
        const ctx = await cityContext(actor, {
          city: req.headers.get("x-city-code") ?? input.cityCode ?? null,
          unitId: input.publishedByOrgUnitId ? String(input.publishedByOrgUnitId) : null,
          unitLabel: "publishing bureau",
        });
        const bureauId = input.publishedByOrgUnitId
          ? String(input.publishedByOrgUnitId)
          : ctx.bureauId ?? ctx.units.find((u) => u.tier === "BUREAU")?.id;
        if (!bureauId) throw new Error("No publishing bureau could be resolved for the city in view.");
        return db.publicationItem.create({
          data: {
            code: String(input.code), category: String(input.category),
            titleEn: String(input.titleEn), titleAm: String(input.titleAm), titleOm: String(input.titleOm),
            contentEn: input.contentEn ? String(input.contentEn) : undefined,
            contentAm: input.contentAm ? String(input.contentAm) : undefined,
            contentOm: input.contentOm ? String(input.contentOm) : undefined,
            publishedByOrgUnitId: bureauId,
          },
        });
      });
  } catch (err) { return fail(err); }
}
