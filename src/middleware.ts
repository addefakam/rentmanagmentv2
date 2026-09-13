// ============================================================================
// middleware.ts — SaaS tenant routing (Edge, zero DB access).
// Resolves the tenant signal from the hostname ONCE per request and forwards
// it to every server surface (login page, branding API, service catalog) via
// the `x-tenant-slug` request header:
//
//     addis-ababa.platform.com  → x-tenant-slug: addis-ababa
//     services.aa.gov.et        → custom domain — resolved server-side against
//                                 CityConfig.customDomainsJson (branding API)
//     localhost / apex / IP /
//     *.vercel.app              → no slug; platform default tenant applies
//
// This header is a RESOLUTION HINT only. It is never an authorization
// decision: tenant data access still requires an authenticated session whose
// city pinning is enforced server-side (authz.ts). Custom domains cannot be
// resolved at the Edge (no DB there), so the branding API performs the exact
// host lookup against the tenant registry when no slug matched.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

const SKIP_SUBDOMAINS = new Set(["www", "app", "api", "admin", "platform"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  let slug: string | null = null;

  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  const isDeployHost = host.endsWith(".vercel.app");
  const labels = host.split(".");

  if (!isIp && !isLocal && !isDeployHost && labels.length >= 3) {
    const first = labels[0];
    if (first && !SKIP_SUBDOMAINS.has(first)) slug = first;
  }

  const headers = new Headers(req.headers);
  if (slug) headers.set("x-tenant-slug", slug);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except static assets — cheap pass-through for matched files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
