// /api/auth/login — console sign-in. Verifies the staff code against the
// active SystemUser register, resolves the officer's home city from the org
// tree, and issues the signed rc_officer cookie.
import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { cityCodeForOrgUnit } from "@/lib/city";
import { OFFICER_COOKIE, encodeOfficer, cookieOptions, isNationalRole } from "@/lib/auth/officer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const staffCode = String(input.staffCode ?? "").trim();
    if (!staffCode) {
      return Response.json({ ok: false, error: "Staff code is required." }, { status: 400 });
    }
    const user = await db.systemUser.findUnique({
      where: { staffCode }, include: { role: true, orgUnit: true },
    });
    if (!user || !user.isActive) {
      return Response.json({ ok: false, error: "Unknown or inactive staff code." }, { status: 401 });
    }
    const [units, configs] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ where: { isActive: true } }),
    ]);
    const cityCode = cityCodeForOrgUnit(units as never, configs as never, user.orgUnitId);
    const national = isNationalRole(user.roleCode);
    const officer = {
      staffCode: user.staffCode,
      fullName: user.fullName,
      roleCode: user.roleCode,
      roleTier: user.role.tierScope,
      orgUnitId: user.orgUnitId,
      orgUnitCode: user.orgUnit.code,
      cityCode: cityCode ?? "AA",
      national,
    };
    const res = Response.json({ ok: true, officer });
    const opt = cookieOptions();
    res.headers.append(
      "Set-Cookie",
      `${OFFICER_COOKIE}=${encodeOfficer(officer)}; HttpOnly; Path=/; Max-Age=${opt.maxAge}; SameSite=Lax${opt.secure ? "; Secure" : ""}`,
    );
    return res;
  } catch (err) {
    return fail(err);
  }
}
