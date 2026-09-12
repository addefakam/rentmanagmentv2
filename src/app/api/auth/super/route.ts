// /api/auth/super — the DEDICATED super-user sign-in endpoint behind the
// separate /admin URL. Owner directive: the System Super User (STF-0008,
// SYSTEM_ADMIN) gets their own portal, bound to the Addis Ababa federal
// administration. The endpoint hardwires the AA context and refuses every
// other officer — including other national staff (ministry analyst) — with a
// generic 403 that does not reveal who attempted. Sessions issued here are
// identical to an Addis Ababa sign-in through /api/auth/login: same signed
// rc_officer cookie, same capabilities, same audit posture.
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
    // The separate URL serves exactly ONE account: the System Super User.
    // Other national officers (ministry analyst) and every city officer are
    // refused with the same generic message.
    if (user.roleCode !== "SYSTEM_ADMIN") {
      return Response.json(
        { ok: false, error: "This portal is reserved for the System Super User." },
        { status: 403 },
      );
    }
    const [units, configs] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
    ]);
    const cityCode = cityCodeForOrgUnit(units as never, configs as never, user.orgUnitId);
    const officer = {
      staffCode: user.staffCode,
      fullName: user.fullName,
      roleCode: user.roleCode,
      roleTier: user.role.tierScope,
      orgUnitId: user.orgUnitId,
      orgUnitCode: user.orgUnit.code,
      cityCode: cityCode ?? "AA", // the super-user portal IS the Addis Ababa administration
      national: isNationalRole(user.roleCode),
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
