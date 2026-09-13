// ============================================================================
// tenant-modules.ts — PURE, client-safe module catalogue (no server imports).
// Shared by the backend gates (tenant.ts) and the console shell (client).
// ============================================================================

export const TENANT_MODULES = [
  { code: "CITIZEN_SERVICES", label: "Citizen Services", gate: "/api/services" },
  { code: "SERVICE_REQUESTS", label: "Service Requests", gate: "/api/registration-files" },
  { code: "COMPLAINTS", label: "Complaints", gate: "/api/complaints" },
  { code: "APPOINTMENTS", label: "Appointments", gate: null },
  { code: "PERMITS", label: "Permits", gate: null },
  { code: "LICENSING", label: "Licensing", gate: null },
  { code: "PAYMENTS", label: "Payments", gate: "/api/payments" },
  { code: "NOTIFICATIONS", label: "Notifications", gate: null },
  { code: "DOCUMENTS", label: "Documents", gate: null },
  { code: "REPORTS", label: "Reports", gate: null },
  { code: "ANALYTICS", label: "Analytics", gate: "/api/analytics" },
  { code: "ANNOUNCEMENTS", label: "Announcements", gate: "/api/publications" },
] as const;

export type TenantModuleCode = (typeof TENANT_MODULES)[number]["code"];
export const TENANT_MODULE_CODES = TENANT_MODULES.map((m) => m.code) as TenantModuleCode[];

export function isTenantModuleCode(v: string): v is TenantModuleCode {
  return (TENANT_MODULE_CODES as string[]).includes(v);
}

/** Parsed module map for a tenant: missing key = enabled (safe default so
 *  existing tenants keep every capability they already had). */
export function parseModules(modulesJson: string | null | undefined): Record<string, boolean> {
  if (modulesJson && typeof modulesJson === "object" && !Array.isArray(modulesJson)) {
    // Already a parsed map (client payloads) — normalize it.
    const raw = modulesJson as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const m of TENANT_MODULES) {
      const v = raw[m.code];
      out[m.code] = v === undefined ? true : Boolean(v);
    }
    return out;
  }
  let raw: Record<string, unknown> = {};
  if (typeof modulesJson === "string" && modulesJson) {
    try {
      const parsed = JSON.parse(modulesJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
    } catch {
      // corrupted JSON → fall back to all-enabled (never lock a city out by accident)
    }
  }
  const out: Record<string, boolean> = {};
  for (const m of TENANT_MODULES) {
    const v = raw[m.code];
    out[m.code] = v === undefined ? true : Boolean(v);
  }
  return out;
}

export function moduleEnabled(modulesJson: string | null | undefined, code: TenantModuleCode): boolean {
  return parseModules(modulesJson)[code];
}

export function allModulesEnabledJson(): string {
  const all: Record<string, boolean> = {};
  for (const m of TENANT_MODULES) all[m.code] = true;
  return JSON.stringify(all);
}
