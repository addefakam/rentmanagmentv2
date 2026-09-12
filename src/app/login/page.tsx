// /login — server wrapper. Resolves the tenant slug for this address (from
// the middleware's x-tenant-slug header or an explicit ?slug=/ ?city= param)
// so the client form can render the tenant's own white-label branding, and
// defaults the roster to THAT tenant's city (a ?slug=adama portal opens with
// the Adama officer list — not the first city's).
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const h = await headers();
  const url = new URL(h.get("x-invoke-url") ?? `http://${h.get("host") ?? "localhost"}/login`);
  const slug = h.get("x-tenant-slug") ?? url.searchParams.get("slug") ?? "";
  let city = url.searchParams.get("city") ?? "";
  if (!city && slug) {
    // Branded tenant portal: default the sign-in roster to the tenant's city.
    const cfg = await db.cityConfig.findUnique({ where: { slug } }).catch(() => null);
    if (cfg?.isActive) city = cfg.cityCode;
  }
  return <LoginForm initialSlug={slug} initialCity={city} />;
}
