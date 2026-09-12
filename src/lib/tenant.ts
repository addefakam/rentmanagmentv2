// ============================================================================
// tenant.ts — Multi-tenant SaaS core. One row of CityConfig IS one tenant
// (one city). This module is the SINGLE authority for:
//
//   1. MODULE CATALOGUE  — the platform modules a tenant may enable/disable.
//   2. MODULE GATES      — disabled modules are unavailable at the BACKEND
//                          API layer (403 MODULE_DISABLED), not merely hidden
//                          in the UI. The tenant is resolved server-side from
//                          the acting officer or an explicit ?city= — never
//                          from client-controlled tenant ids on the honor
//                          system; cross-tenant references still go through
//                          cityContext()'s scope wall in authz.ts.
//   3. PLATFORM LEVELS   — PLATFORM (Ministry/System: fleet-wide) vs TENANT
//                          (city-bound: strictly one city).
//   4. THEME PAYLOAD     — the white-label branding payload served to login
//                          and the console, with precomputed color variants
//                          so the UI never hardcodes a city's identity.
//
// ISOLATION ANCHOR (why there is no tenant_id column on every table): every
// operational entity hangs under the city's BUREAU org-unit subtree
// (woreda → sub-city → bureau). The tenant relationship is therefore
// structural and enforced at the service layer by cityContext() /
// readScope() / assert*InScope() in authz.ts — verified by the automated
// cross-tenant test battery (scripts/test-tenant-isolation.mjs). The
// tenant-scoped entities added by the SaaS phase carry the explicit anchor:
//   - ServiceDefinition.cityCode  → CityConfig.cityCode (FK)
//   - ModelContract.cityCode      → per-city workflow / contract versions
// ============================================================================

import { db } from "@/lib/db";
import { resolveActor, SecurityError, type Actor } from "@/lib/security/authz";
import {
  TENANT_MODULES, TENANT_MODULE_CODES, isTenantModuleCode,
  parseModules, moduleEnabled, allModulesEnabledJson, type TenantModuleCode,
} from "@/lib/tenant-modules";

// Re-export the pure catalogue so server code has a single import surface.
export { TENANT_MODULES, TENANT_MODULE_CODES, isTenantModuleCode, parseModules, moduleEnabled, allModulesEnabledJson };
export type { TenantModuleCode };

export class ModuleDisabledError extends SecurityError {
  constructor(module: TenantModuleCode, cityCode: string) {
    super(
      `Module "${module}" is not enabled for tenant ${cityCode} by the platform administrator.`,
      "MODULE_DISABLED",
    );
    this.name = "ModuleDisabledError";
  }
}

// ---------------------------------------------------------------------------
// Backend module gate. `requireModule(cityCode, module)` is the primitive the
// handlers call once the acting city is known (after cityContext resolution
// for mutations, or via requireModuleForRequest for reads).
// ---------------------------------------------------------------------------
export async function requireModule(cityCode: string | null | undefined, module: TenantModuleCode): Promise<void> {
  if (!cityCode) return; // no tenant context resolved — scope wall still applies downstream
  const cfg = await db.cityConfig.findUnique({
    where: { cityCode },
    select: { modulesJson: true, isActive: true, status: true },
  });
  if (!cfg) return; // unknown city fails later in cityContext
  if (!moduleEnabled(cfg.modulesJson, module)) throw new ModuleDisabledError(module, cityCode);
}

function tenantCodeFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null; // IPv4
  if (hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel-inspector.build")) return null; // deployment hosts
  const labels = hostname.split(".");
  if (labels.length < 3) return null; // apex/single-level host → platform root
  const first = labels[0];
  if (!first || first === "www" || first === "app" || first === "api") return null;
  return first;
}

export type GateCityResolution =
  | { kind: "city"; cityCode: string }
  | { kind: "all-active" } // unauthenticated fleet read — fail closed unless enabled EVERYWHERE
  | { kind: "platform" }; // national officer fleet view — per-city gate applies when a city is named

async function resolveGateCity(req: Request): Promise<GateCityResolution> {
  const url = new URL(req.url);
  const explicit = url.searchParams.get("city");
  if (explicit) return { kind: "city", cityCode: explicit.toUpperCase() };
  const actor: Actor | null = await resolveActor(req);
  if (actor) {
    if (actor.national) return { kind: "platform" };
    if (actor.cityCode) return { kind: "city", cityCode: actor.cityCode };
  }
  // Body-declared cityCode is NOT trusted for the gate: it is validated by
  // cityContext() against the actor's pinned city, so the gate cannot be
  // bypassed by a client-supplied tenant id.
  if (!actor) return { kind: "all-active" };
  return { kind: "platform" };
}

/** Read-path module gate for GET endpoints. Resolves the target tenant from
 *  the ?city= query param or the acting officer's pinned city (never from a
 *  client-declared tenant id in the body). Unauthenticated fleet reads fail
 *  closed: they require the module enabled in EVERY active tenant. */
export async function requireModuleForRequest(req: Request, module: TenantModuleCode): Promise<void> {
  const resolution = await resolveGateCity(req);
  if (resolution.kind === "platform") return;
  if (resolution.kind === "city") {
    await requireModule(resolution.cityCode, module);
    return;
  }
  // all-active: unauthenticated fleet read — allow only if enabled everywhere
  const actives = await db.cityConfig.findMany({
    where: { isActive: true },
    select: { cityCode: true, modulesJson: true },
  });
  for (const t of actives) {
    if (!moduleEnabled(t.modulesJson, module)) throw new ModuleDisabledError(module, t.cityCode);
  }
}

// ---------------------------------------------------------------------------
// Platform levels — PLATFORM = fleet-wide (System admin / Ministry analyst),
// TENANT = city-bound. The authenticated session decides; the client cannot
// elevate itself.
// ---------------------------------------------------------------------------
export type PlatformLevel = "PLATFORM" | "TENANT";

export function platformLevelOf(actor: { roleCode: string; national: boolean }): PlatformLevel {
  return actor.national && ["SYSTEM_ADMIN", "MINISTRY_ANALYST"].includes(actor.roleCode)
    ? "PLATFORM"
    : "TENANT";
}

export class PlatformAdminRequiredError extends SecurityError {
  constructor(action: string) {
    super(
      `Platform administrator authority is required to ${action}. Tenant administrators can only manage their own city.`,
      "PLATFORM_ADMIN_REQUIRED",
    );
    this.name = "PlatformAdminRequiredError";
  }
}

export function requirePlatformAdmin(actor: Actor, action: string): void {
  if (platformLevelOf(actor) !== "PLATFORM" || actor.roleCode !== "SYSTEM_ADMIN") {
    throw new PlatformAdminRequiredError(action);
  }
}

// ---------------------------------------------------------------------------
// White-label theme payload (public — safe fields only).
// ---------------------------------------------------------------------------
export type TenantTheme = {
  cityCode: string;
  slug: string | null;
  status: string;
  nameEn: string;
  nameAm: string;
  nameOm: string;
  portalTitle: string | null;
  welcomeMessage: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: { primary: string; secondary: string; accent: string; accentSoft: string; accentBright: string };
  contact: { email: string | null; phone: string | null; address: string | null };
  locale: { canonicalLang: string; timezone: string; country: string; region: string | null };
  modules: Record<string, boolean>;
  customDomains: string[];
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Precomputed color variants so client CSS never needs a color library. */
export function themeColors(primary: string, secondary: string, accent: string) {
  const rgb = hexToRgb(accent) ?? [212, 135, 90];
  const bright = rgb.map((c) => Math.min(255, Math.round(c + (255 - c) * 0.35)));
  return {
    primary,
    secondary,
    accent,
    accentSoft: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`,
    accentBright: `#${bright.map((c) => c.toString(16).padStart(2, "0")).join("")}`,
  };
}

export function themeOf(cfg: {
  cityCode: string; slug: string | null; status: string;
  nameEn: string; nameAm: string; nameOm: string;
  portalTitle: string | null; welcomeMessage: string | null;
  logoUrl: string | null; faviconUrl: string | null;
  primaryColor: string; secondaryColor: string; accentColor: string;
  contactEmail: string | null; contactPhone: string | null; contactAddress: string | null;
  canonicalLang: string; timezone: string; country: string; region: string | null;
  modulesJson: string | null; customDomainsJson: string | null;
}): TenantTheme {
  let domains: string[] = [];
  if (cfg.customDomainsJson) {
    try {
      const parsed = JSON.parse(cfg.customDomainsJson);
      if (Array.isArray(parsed)) domains = parsed.map(String).filter(Boolean);
    } catch { /* ignore */ }
  }
  return {
    cityCode: cfg.cityCode,
    slug: cfg.slug,
    status: cfg.status,
    nameEn: cfg.nameEn, nameAm: cfg.nameAm, nameOm: cfg.nameOm,
    portalTitle: cfg.portalTitle,
    welcomeMessage: cfg.welcomeMessage,
    logoUrl: cfg.logoUrl,
    faviconUrl: cfg.faviconUrl,
    colors: themeColors(cfg.primaryColor, cfg.secondaryColor, cfg.accentColor),
    contact: { email: cfg.contactEmail, phone: cfg.contactPhone, address: cfg.contactAddress },
    locale: { canonicalLang: cfg.canonicalLang, timezone: cfg.timezone, country: cfg.country, region: cfg.region },
    modules: parseModules(cfg.modulesJson),
    customDomains: domains,
  };
}

export async function findTenantForRequest(req: Request) {
  const url = new URL(req.url);
  const explicitCity = url.searchParams.get("city");
  const explicitSlug = url.searchParams.get("slug");
  const slugHeader = req.headers.get("x-tenant-slug");
  const host = req.headers.get("host");
  if (explicitCity) {
    return db.cityConfig.findUnique({ where: { cityCode: explicitCity.toUpperCase() } });
  }
  if (explicitSlug) {
    return db.cityConfig.findUnique({ where: { slug: explicitSlug.toLowerCase() } });
  }
  const hostSlug = slugHeader ?? tenantCodeFromHost(host);
  if (hostSlug) {
    const bySlug = await db.cityConfig.findUnique({ where: { slug: hostSlug.toLowerCase() } });
    if (bySlug) return bySlug;
    // custom domain: exact host match across tenants
    const hostname = (host ?? "").split(":")[0].toLowerCase();
    if (hostname) {
      const all = await db.cityConfig.findMany({ where: { customDomainsJson: { not: null } } });
      for (const t of all) {
        let domains: string[] = [];
        try { domains = JSON.parse(t.customDomainsJson ?? "[]"); } catch { /* ignore */ }
        if (domains.map((d) => String(d).toLowerCase()).includes(hostname)) return t;
      }
    }
    return null;
  }
  // No tenant signals → the platform default tenant (first active).
  return db.cityConfig.findFirst({ where: { isActive: true }, orderBy: { cityCode: "asc" } });
}
