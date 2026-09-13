// /api/org-units — org hierarchy editor (M13 / Dir. Arts. 2, 6).
// OWNER DIRECTIVE — SUB-CITY DELEGATION: the city bureau head FOUNDS sub-cities
// only, each founded together with its ONE responsible officer (a
// SUBCITY_MONITOR user issued with the unit); from then on the woredas and
// the staff of that sub-city are the sub-city officer's responsibility. The
// sub-city officer registers the WOREDAS of his own area. The city
// super-admin (CITY_ADMIN) and the system admin keep both tiers.
//   POST  : create a unit under a parent (SUB_CITY under a BUREAU — officer
//           required; WOREDA under a SUB_CITY); codes must stay unique
//   PATCH : rename / correct trilingual names of an existing unit
// SCOPE: creation/rename references must sit inside the acting officer's
// scope — the city wall for bureau roles, the sub-city wall for the
// sub-city officer. Capability: org:manage.
import { ok, fail, body } from "@/lib/api";
import { withGuard, cityContext } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Role -> unit tiers this role may create (owner directive split).
const ROLE_TIER_RULES: Record<string, string[]> = {
  BUREAU_HEAD: ["SUB_CITY"], // founds sub-cities; woredas belong to the sub-city officer
  SUBCITY_MONITOR: ["WOREDA"], // woredas of his own area only
};

export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "org:manage",
      { action: "ORG_UNIT_CREATE", entity: "OrgUnit", ref: (d: { code: string }) => d.code },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const parentId = String(input.parentId ?? "");
        const tier = String(input.tier ?? "");
        const code = String(input.code ?? "").trim().toUpperCase();
        const nameEn = String(input.nameEn ?? "").trim();
        const managerFullName = String(input.managerFullName ?? "").trim();
        if (!parentId || !nameEn || !code) throw new Error("parent, code and English name are required.");
        if (!["SUB_CITY", "WOREDA"].includes(tier)) throw new Error("Only SUB_CITY or WOREDA units can be created here.");
        const allowedTiers = ROLE_TIER_RULES[actor.roleCode];
        if (allowedTiers && !allowedTiers.includes(tier)) {
          throw new Error(
            tier === "WOREDA"
              ? "Woredas are registered by the sub-city rent-control officer of the area, not by the city bureau head."
              : "Sub-cities are founded by the city bureau head (or the city/system administrator).",
          );
        }
        // A sub-city is founded together with its ONE responsible officer —
        // the user who will manage its woredas and staff.
        if (tier === "SUB_CITY" && !managerFullName) {
          throw new Error("A sub-city is founded together with its rent-control officer — provide the officer's full name.");
        }
        const ctx = await cityContext(actor, {
          city: (input.cityCode as string | undefined) ?? req.headers.get("x-city-code"),
          unitId: parentId, unitLabel: "parent org unit",
        });
        const parent = await db.orgUnit.findUnique({ where: { id: parentId } });
        if (!parent) throw new Error("Unknown parent org unit.");
        if (tier === "SUB_CITY" && parent.tier !== "BUREAU") throw new Error("A sub-city must hang directly under a bureau.");
        if (tier === "WOREDA" && parent.tier !== "SUB_CITY") throw new Error("A woreda must hang under a sub-city.");
        const dup = await db.orgUnit.findUnique({ where: { code } });
        if (dup) throw new Error(`Org unit code ${code} is already registered.`);
        const unit = await db.orgUnit.create({
          data: {
            code, tier,
            nameEn,
            nameAm: String(input.nameAm ?? nameEn),
            nameOm: String(input.nameOm ?? nameEn),
            parentId: parent.id,
            confirmationStatus: "PENDING_OFFICIAL_REGISTER",
            sourceNote: `Registered from the console by ${actor.staffCode} (${ctx.cityCode}); confirm against the official establishment register (O-7).`,
          },
        });
        // Issue the responsible sub-city officer (SUBCITY_MONITOR) with the
        // new unit — his sign-in code is handed over by the founding officer.
        let manager: { staffCode: string; fullName: string; roleCode: string } | null = null;
        if (tier === "SUB_CITY") {
          const all = await db.systemUser.findMany({ select: { staffCode: true } });
          let next = 1;
          for (const u of all) {
            const m = /^STF-(\d+)$/.exec(u.staffCode);
            if (m) next = Math.max(next, Number(m[1]) + 1);
          }
          const user = await db.systemUser.create({
            data: {
              staffCode: `STF-${next}`, fullName: managerFullName, roleCode: "SUBCITY_MONITOR",
              orgUnitId: unit.id,
              language: ["am", "en", "om"].includes(String(input.managerLanguage)) ? String(input.managerLanguage) : "en",
              isActive: true,
            },
          });
          manager = { staffCode: user.staffCode, fullName: user.fullName, roleCode: user.roleCode };
        }
        return { ...unit, manager };
      },
    );
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    return await withGuard(
      req, "org:manage",
      { action: "ORG_UNIT_RENAME", entity: "OrgUnit", ref: (d: { code: string }) => d.code },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const id = String(input.id ?? "");
        const unit = await db.orgUnit.findUnique({ where: { id } });
        if (!unit) throw new Error("Unknown org unit.");
        await cityContext(actor, {
          city: (input.cityCode as string | undefined) ?? req.headers.get("x-city-code"),
          unitId: id, unitLabel: "org unit",
        });
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
