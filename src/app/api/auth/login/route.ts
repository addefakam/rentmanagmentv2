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
    // Owner directive (single-admin policy, extended): NATIONAL officers —
    // System Admin AND ministry analyst — sign in ONLY from the federal
    // capital's portal, Addis Ababa (AA). The login page passes the city
    // whose roster the officer used; any other city context is refused.
    // Contextual only: API callers that omit `city` are untouched.
    const requestedCity = String(input.city ?? "").trim().toUpperCase();
    if (isNationalRole(user.roleCode) && requestedCity && requestedCity !== "AA") {
      return Response.json(
        { ok: false, error: "National officers (System Admin / Ministry) sign in only from the Addis Ababa administration portal." },
        { status: 403 },
      );
    }
    const [units, configs] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
    ]);
    const cityCode = cityCodeForOrgUnit(units as never, configs as never, user.orgUnitId);
    const national = isNationalRole(user.roleCode);
    // City fleet administration: a deactivated or suspended tenant refuses
    // sign-in for its own officers (soft suspension — data is untouched,
    // reactivation restores access). National officers are never city-bound,
    // so they pass through. `status` is the SaaS lifecycle (ACTIVE |
    // SUSPENDED | DEACTIVATED) and is kept in sync with the legacy isActive.
    if (!national && cityCode) {
      const cfg = configs.find((c) => c.cityCode === cityCode);
      if (cfg && (!cfg.isActive || (cfg as { status?: string }).status === "SUSPENDED")) {
        const suspended = (cfg as { status?: string }).status === "SUSPENDED";
        return Response.json(
          { ok: false, error: suspended
            ? `${cfg.nameEn} is currently suspended by the platform administrator. Contact the Ministry help desk.`
            : `${cfg.nameEn} is currently deactivated by the system administrator. Contact the Ministry help desk.` },
          { status: 403 },
        );
      }
    }
    const officer = {
      staffCode: user.staffCode,
      fullName: user.fullName,
      roleCode: user.roleCode,
      roleTier: user.role.tierScope,
      orgUnitId: user.orgUnitId,
      orgUnitCode: user.orgUnit.code,
      cityCode: cityCode ?? "AA",
      national,
      tenantSlug: (configs.find((c) => c.cityCode === (cityCode ?? "AA")) as { slug?: string | null } | undefined)?.slug ?? null,
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
