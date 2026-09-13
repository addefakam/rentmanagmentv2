// ============================================================================
// /api/tenant/branding — PUBLIC white-label tenant theme endpoint.
// Resolves the tenant exactly like the platform resolves any public request:
//   1. ?city=CITYCODE            (explicit, platform-admin / dev use)
//   2. ?slug=city-a              (explicit slug)
//   3. x-tenant-slug header      (set by src/middleware.ts from the hostname)
//   4. Host header               (subdomain city-a.platform.com OR a custom
//                                 domain registered on the tenant)
//   5. fallback                  (platform default tenant — first active)
// The tenant identity is NEVER taken from a client-declared tenant id field;
// for authenticated surfaces the session's pinned city decides (authz.ts).
// Deactivated tenants return 404 (no theme, no data); suspended tenants get
// their theme with status=SUSPENDED so the login page can show the banner.
// ============================================================================
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { findTenantForRequest, themeOf } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cfg = await findTenantForRequest(req);
    if (!cfg) {
      return Response.json({ ok: false, error: "Tenant not found for this address." }, { status: 404 });
    }
    // Deactivated tenants vanish entirely (404). SUSPENDED tenants keep a
    // public theme carrying status=SUSPENDED so the login page can explain
    // the suspension instead of showing a mystery outage.
    if (!cfg.isActive && cfg.status !== "SUSPENDED") {
      return Response.json({ ok: false, error: `Tenant ${cfg.nameEn} is deactivated.` }, { status: 404 });
    }
    return ok({ theme: themeOf(cfg) });
  } catch (err) {
    return fail(err);
  }
}
