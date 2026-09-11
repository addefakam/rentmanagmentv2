// /api/auth/staff — login directory: the city list plus, for one city, the
// officers who may sign in. Public (pre-authentication); exposes only
// directory fields, never credentials. Demo sign-in uses the staff code as
// the password (Phase 5 RBAC acting-officer register).
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { cityScope } from "@/lib/city";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cityCode = new URL(req.url).searchParams.get("city");
    const [units, configs] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ where: { isActive: true }, orderBy: { cityCode: "asc" } }),
    ]);
    const cities = configs.map((c) => {
      const bureau = units.find((u) => u.id === c.bureauId);
      return {
        cityCode: c.cityCode, nameEn: c.nameEn, nameAm: c.nameAm, nameOm: c.nameOm,
        bureauCode: bureau?.code ?? "—",
      };
    });
    let staff: Array<{
      staffCode: string; fullName: string; roleCode: string; roleName: string;
      orgUnitCode: string; cityCode: string;
    }> = [];
    if (cityCode) {
      const scope = cityScope(units as never, configs as never, cityCode);
      const rows = await db.systemUser.findMany({
        where: { isActive: true, orgUnitId: { in: scope.unitIds } },
        include: { role: true, orgUnit: true },
        orderBy: { staffCode: "asc" },
      });
      staff = rows.map((s) => ({
        staffCode: s.staffCode, fullName: s.fullName, roleCode: s.roleCode,
        roleName: s.role.nameEn, orgUnitCode: s.orgUnit.code, cityCode,
      }));
      // National officers (Ministry / System admin) can sign in to any city view.
      const national = await db.systemUser.findMany({
        where: { isActive: true, roleCode: { in: ["MINISTRY_ANALYST", "SYSTEM_ADMIN"] } },
        include: { role: true, orgUnit: true },
        orderBy: { staffCode: "asc" },
      });
      staff.push(...national.map((s) => ({
        staffCode: s.staffCode, fullName: s.fullName, roleCode: s.roleCode,
        roleName: s.role.nameEn, orgUnitCode: s.orgUnit.code, cityCode: "*",
      })));
    }
    return ok({ cities, staff });
  } catch (err) {
    return fail(err);
  }
}
