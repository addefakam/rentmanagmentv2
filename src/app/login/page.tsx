// /login — server wrapper. Resolves the tenant slug for this address (from
// the middleware's x-tenant-slug header or an explicit ?slug=/ ?city= param)
// so the client form can render the tenant's own white-label branding.
import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const h = await headers();
  const url = new URL(h.get("x-invoke-url") ?? `http://${h.get("host") ?? "localhost"}/login`);
  const slug = h.get("x-tenant-slug") ?? url.searchParams.get("slug") ?? "";
  const city = url.searchParams.get("city") ?? "";
  return <LoginForm initialSlug={slug} initialCity={city} />;
}
