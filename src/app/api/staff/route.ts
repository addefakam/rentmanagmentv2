// ============================================================================
// /api/staff — city staff register (Dir. Art. 6; Dir. Art. 14 administration).
// The CITY super-admin (role CITY_ADMIN, created automatically at city
// onboarding) runs the staff register of ONE city:
//   POST  : add an officer to the acting city — staff code auto-issued from
//           the register sequence (STF-####), role must be a city-level role
//           (national roles cannot be created from a city desk), org unit
//           must sit inside the acting city's bureau subtree;
//   PATCH : activate / deactivate an officer, move them to another unit of
//           the same city, or correct their role — every referenced id is
//           re-validated against the city scope, and an officer cannot
//           deactivate their own account.
// The SYSTEM_ADMIN (national) uses the same route for any city it views.
// Capability: staff:manage (CITY_ADMIN, SYSTEM_ADMIN). City isolation is
// enforced by cityContext() — cross-city references are denied 403.
// ============================================================================

import { fail, body, ok } from "@/lib/api";
import { withGuard, cityContext, requireCapability, CityScopeError } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Roles a city desk may assign. National roles (MINISTRY_ANALYST,
// SYSTEM_ADMIN) are federal appointments — never creatable from a city.
const CITY_ROLE_CODES = [
  "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
  "BUREAU_HEAD", "COMMITTEE_MEMBER", "CITY_ADMIN",
];

export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "staff:manage",
      { action: "STAFF_CREATE", entity: "SystemUser", ref: (d: { staffCode: string }) => d.staffCode },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const fullName = String(input.fullName ?? "").trim();
        const roleCode = String(input.roleCode ?? "").trim();
        const orgUnitId = String(input.orgUnitId ?? "").trim();
        const language = ["am", "en", "om"].includes(String(input.language)) ? String(input.language) : "en";
        if (!fullName) throw new Error("Officer full name is required.");
        if (!CITY_ROLE_CODES.includes(roleCode)) {
          throw new Error(`Role ${roleCode || "(none)"} cannot be assigned from a city desk. Allowed: ${CITY_ROLE_CODES.join(", ")}.`);
        }
        if (!orgUnitId) throw new Error("Home org unit is required.");

        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: orgUnitId, unitLabel: "home org unit",
        });
        const role = await db.role.findUnique({ where: { code: roleCode } });
        if (!role || !role.isActive) throw new Error(`Unknown or inactive role: ${roleCode}`);
        const unit = ctx.units.find((u) => u.id === orgUnitId);
        if (!unit) throw new CityScopeError("The selected org unit does not belong to the acting city.");

        // Staff codes auto-issue after the highest registered number so they
        // never collide with seeded or onboarded registers.
        const all = await db.systemUser.findMany({ select: { staffCode: true } });
        let next = 1;
        for (const u of all) {
          const m = /^STF-(\d+)$/.exec(u.staffCode);
          if (m) next = Math.max(next, Number(m[1]) + 1);
        }
        const user = await db.systemUser.create({
          data: { staffCode: `STF-${next}`, fullName, roleCode, orgUnitId, language, isActive: true },
        });
        return {
          staffCode: user.staffCode, fullName: user.fullName, roleCode: user.roleCode,
          orgUnitCode: unit.code, cityCode: ctx.cityCode,
          message: `${user.fullName} registered as ${role.nameEn} (${unit.code}) — sign-in code ${user.staffCode}.`,
        };
      },
    );
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    return await withGuard(
      req, "staff:manage",
      { action: "STAFF_UPDATE", entity: "SystemUser", ref: (d: { staffCode: string }) => d.staffCode },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const id = String(input.id ?? "");
        const user = await db.systemUser.findUnique({ where: { id }, include: { role: true, orgUnit: true } });
        if (!user) throw new Error("Unknown officer.");
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: user.orgUnitId, unitLabel: "officer's current org unit",
        });

        if (user.staffCode === actor.staffCode && input.isActive === false) {
          throw new Error("You cannot deactivate your own account while signed in.");
        }
        if (user.roleCode === "CITY_ADMIN" && input.isActive === false) {
          const cityAdmins = await db.systemUser.findMany({
            where: { isActive: true, roleCode: "CITY_ADMIN", orgUnitId: { in: ctx.unitIds } },
          });
          if (cityAdmins.length <= 1) {
            throw new Error("Each city must keep at least one active city administrator. Add another CITY_ADMIN first.");
          }
        }

        // Moving an officer: the target unit must sit inside the same city.
        let orgUnitId = user.orgUnitId;
        if (input.orgUnitId && String(input.orgUnitId) !== user.orgUnitId) {
          const target = String(input.orgUnitId);
          if (!ctx.unitIds.includes(target)) {
            throw new CityScopeError("Cross-city move denied: the target org unit is outside the acting city.");
          }
          orgUnitId = target;
        }
        const roleCode = input.roleCode != null ? String(input.roleCode) : user.roleCode;
        if (roleCode !== user.roleCode && !CITY_ROLE_CODES.includes(roleCode)) {
          throw new Error(`Role ${roleCode} cannot be assigned from a city desk.`);
        }
        const updated = await db.systemUser.update({
          where: { id },
          data: {
            fullName: input.fullName != null ? String(input.fullName).slice(0, 160) : user.fullName,
            isActive: input.isActive != null ? Boolean(input.isActive) : user.isActive,
            orgUnitId, roleCode,
            language: ["am", "en", "om"].includes(String(input.language)) ? String(input.language) : user.language,
          },
          include: { role: true, orgUnit: true },
        });
        return {
          staffCode: updated.staffCode, fullName: updated.fullName, roleCode: updated.roleCode,
          isActive: updated.isActive, orgUnitCode: updated.orgUnit.code,
          message: `${updated.fullName} updated — ${updated.isActive ? "active" : "deactivated"} at ${updated.orgUnit.code}.`,
        };
      },
    );
  } catch (err) { return fail(err); }
}

// GET — the acting city's staff register (the boot payload carries the same
// list; this endpoint exists for the fleet admin to inspect one city).
export async function GET(req: Request) {
  try {
    const actor = await requireCapability(req, "staff:manage");
    const ctx = await cityContext(actor, {
      city: new URL(req.url).searchParams.get("city") ?? req.headers.get("x-city-code"),
    });
    const staff = await db.systemUser.findMany({
      where: { orgUnitId: { in: ctx.unitIds } },
      include: { role: true, orgUnit: true },
      orderBy: { staffCode: "asc" },
    });
    return ok({
      cityCode: ctx.cityCode,
      staff: staff.map((s) => ({
        id: s.id, staffCode: s.staffCode, fullName: s.fullName, roleCode: s.roleCode,
        roleName: s.role.nameEn, orgUnitCode: s.orgUnit.code, isActive: s.isActive, language: s.language,
      })),
    });
  } catch (err) { return fail(err); }
}
