// /api/org-units/manager — OWNER DIRECTIVE (Task 44): "manage sub city".
// The city Rent Control Bureau head manages his sub-cities. Founding a
// sub-city (POST /api/org-units) already issues its ONE responsible officer;
// this endpoint completes sub-city management for EXISTING units:
//   - a sub-city left WITHOUT a responsible officer (seeded before the
//     delegation model, or whose officer was deactivated) gets one appointed;
//   - a departing officer is REPLACED: pass his sign-in code as
//     `replaceStaffCode` — the incumbent is deactivated and the successor
//     issued with a fresh auto-generated STF sign-in code.
// Woreda registration and woreda-desk staffing remain the sub-city
// officer's own duties (Task 43 split) — this endpoint touches ONLY the
// one SUBCITY_MONITOR seat of the named sub-city.
// Every sub-city console and every bureau report reflects the change
// immediately: appointments made here are visible to all sub-cities.
// Capability: org:manage (BUREAU_HEAD city-walled; CITY_ADMIN / SYSTEM_ADMIN
// keep the wider register). Cross-scope references are denied 403.

import { ok, fail, body } from "@/lib/api";
import { withGuard, cityContext, CityScopeError } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "org:manage",
      { action: "ORG_MANAGER_APPOINT", entity: "SystemUser", ref: (d: { staffCode: string }) => d.staffCode },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const orgUnitId = String(input.orgUnitId ?? "");
        const fullName = String(input.fullName ?? "").trim();
        const language = ["am", "en", "om"].includes(String(input.language)) ? String(input.language) : "en";
        const replaceStaffCode = String(input.replaceStaffCode ?? "").trim();
        if (!orgUnitId) throw new Error("Sub-city org unit is required.");
        if (!fullName) throw new Error("The responsible officer's full name is required.");

        const ctx = await cityContext(actor, {
          city: (input.cityCode as string | undefined) ?? req.headers.get("x-city-code"),
          unitId: orgUnitId, unitLabel: "sub-city",
        });
        const unit = ctx.units.find((u) => u.id === orgUnitId);
        if (!unit) throw new CityScopeError("The selected org unit does not belong to the acting city.");
        if (unit.tier !== "SUB_CITY") throw new Error("A responsible officer is appointed to a sub-city, not to this unit.");
        if (actor.roleCode === "SUBCITY_MONITOR") {
          throw new CityScopeError("A sub-city officer cannot appoint sub-city officers — that is the city bureau head's duty.");
        }

        const sitting = await db.systemUser.findFirst({
          where: { roleCode: "SUBCITY_MONITOR", orgUnitId, isActive: true },
        });
        if (sitting && !replaceStaffCode) {
          throw new Error(
            `${sitting.fullName} (${sitting.staffCode}) is the responsible officer of ${unit.code}. ` +
            `To replace them, send their sign-in code as replaceStaffCode.`,
          );
        }
        if (sitting && replaceStaffCode && sitting.staffCode !== replaceStaffCode) {
          throw new Error(`replaceStaffCode does not match the sitting officer of ${unit.code} (${sitting.staffCode}).`);
        }

        // Sign-in codes auto-issue after the highest registered number.
        const all = await db.systemUser.findMany({ select: { staffCode: true } });
        let next = 1;
        for (const u of all) {
          const m = /^STF-(\d+)$/.exec(u.staffCode);
          if (m) next = Math.max(next, Number(m[1]) + 1);
        }
        const user = await db.systemUser.create({
          data: { staffCode: `STF-${next}`, fullName, roleCode: "SUBCITY_MONITOR", orgUnitId, language, isActive: true },
        });
        if (sitting) {
          await db.systemUser.update({ where: { id: sitting.id }, data: { isActive: false } });
        }
        return {
          staffCode: user.staffCode, fullName: user.fullName, orgUnitCode: unit.code,
          replaced: sitting ? sitting.staffCode : null,
          message:
            `${user.fullName} appointed responsible officer of ${unit.code} — sign-in code ${user.staffCode}` +
            (sitting ? ` (replaces ${sitting.fullName}, ${sitting.staffCode}, deactivated).` : "."),
        };
      },
    );
  } catch (err) { return fail(err); }
}
