// /api/publications — M11 public data feed (Proc. Arts. 14, 16, 18).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publications = await db.publicationItem.findMany({
      include: { }, orderBy: { publishedAt: "desc" }, take: 100,
    });
    return ok(publications);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const bureau = await db.orgUnit.findUnique({ where: { code: "AA-BUREAU" } });
    return await withGuard(req, "publication:manage",
      { action: "PUBLICATION_CREATE", entity: "PublicationItem", ref: (d: { code: string }) => d.code },
      () => db.publicationItem.create({
        data: {
          code: String(input.code), category: String(input.category),
          titleEn: String(input.titleEn), titleAm: String(input.titleAm), titleOm: String(input.titleOm),
          contentEn: input.contentEn ? String(input.contentEn) : undefined,
          contentAm: input.contentAm ? String(input.contentAm) : undefined,
          contentOm: input.contentOm ? String(input.contentOm) : undefined,
          publishedByOrgUnitId: String(input.publishedByOrgUnitId ?? bureau!.id),
        },
      }));
  } catch (err) { return fail(err); }
}
