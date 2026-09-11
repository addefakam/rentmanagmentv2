// /api/org-units — org hierarchy editor (M13 / Dir. Arts. 2, 6). Authorised
// officers add sub-cities or woredas under their bureau, or rename units —
// previously a seed-script-only operation.
//   POST  : create a unit under a parent (SUB_CITY under a BUREAU, WOREDA
//           under a SUB_CITY); codes must stay unique
//   PATCH : rename / correct trilingual names of an existing unit
// Capability: org:manage.
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "org:manage",
      { action: "ORG_UNIT_CREATE", entity: "OrgUnit", ref: (d: { code: string }) => d.code },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const parentId = String(input.parentId ?? "");
        const tier = String(input.tier ?? "");
        const code = String(input.code ?? "").trim().toUpperCase();
        const nameEn = String(input.nameEn ?? "").trim();
        if (!parentId || !nameEn || !code) throw new Error("parent, code and English name are required.");
        if (!["SUB_CITY", "WOREDA"].includes(tier)) throw new Error("Only SUB_CITY or WOREDA units can be created here.");
        const parent = await db.orgUnit.findUnique({ where: { id: parentId } });
        if (!parent) throw new Error("Unknown parent org unit.");
        if (tier === "SUB_CITY" && parent.tier !== "BUREAU") throw new Error("A sub-city must hang directly under a bureau.");
        if (tier === "WOREDA" && parent.tier !== "SUB_CITY") throw new Error("A woreda must hang under a sub-city.");
        const dup = await db.orgUnit.findUnique({ where: { code } });
        if (dup) throw new Error(`Org unit code ${code} is already registered.`);
        return db.orgUnit.create({
          data: {
            code, tier,
            nameEn,
            nameAm: String(input.nameAm ?? nameEn),
            nameOm: String(input.nameOm ?? nameEn),
            parentId: parent.id,
            confirmationStatus: "PENDING_OFFICIAL_REGISTER",
            sourceNote: `Registered from the console by ${"acting officer"}; confirm against the official establishment register (O-7).`,
          },
        });
      },
    );
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    return await withGuard(
      req, "org:manage",
      { action: "ORG_UNIT_RENAME", entity: "OrgUnit", ref: (d: { code: string }) => d.code },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const id = String(input.id ?? "");
        const unit = await db.orgUnit.findUnique({ where: { id } });
        if (!unit) throw new Error("Unknown org unit.");
        return db.orgUnit.update({
          where: { id },
          data: {
            nameEn: input.nameEn != null ? String(input.nameEn).slice(0, 160) : unit.nameEn,
            nameAm: input.nameAm != null ? String(input.nameAm).slice(0, 160) : unit.nameAm,
            nameOm: input.nameOm != null ? String(input.nameOm).slice(0, 160) : unit.nameOm,
          },
        });
      },
    );
  } catch (err) { return fail(err); }
}
