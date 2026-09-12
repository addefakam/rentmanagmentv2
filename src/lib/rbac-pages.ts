// ============================================================================
// rbac-pages.ts — Which role codes may open which console page. The sidebar
// filters by this map and the console shell (ModuleFrame) enforces it; API
// mutations stay guarded separately by authz.ts capabilities.
//
// Owner directive — SINGLE-ADMIN CITY MANAGEMENT: exactly one administrator
// (STF-0008, SYSTEM_ADMIN) manages cities, with power over every other user.
// City Management lives at its own dedicated URL /platform/cities; the legacy
// /cities and /platform URLs survive as redirect shims for old bookmarks. The
// ministry analyst (STF-0007) keeps ministry analytics/publications duties
// but has NO city-management page or capability anymore.
// ============================================================================

const ALL_ROLES = [
  "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
  "BUREAU_HEAD", "COMMITTEE_MEMBER", "MINISTRY_ANALYST", "SYSTEM_ADMIN", "CITY_ADMIN",
];

const REGISTRY_ROLES = ALL_ROLES; // every officer may read the registry pages
const OPERATIONS_ROLES = ALL_ROLES.filter((r) => r !== "COMMITTEE_MEMBER");
const INSIGHT_ROLES = ["SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "CITY_ADMIN", "MINISTRY_ANALYST", "SYSTEM_ADMIN"];
const SETTINGS_ROLES = ["BUREAU_HEAD", "CITY_ADMIN", "SYSTEM_ADMIN"]; // city self-administration — ministry analyst is oversight-only
const SERVICES_ROLES = ["WOREDA_REGISTRAR", "BUREAU_ANALYST", "BUREAU_HEAD", "CITY_ADMIN", "MINISTRY_ANALYST", "SYSTEM_ADMIN"];
const PLATFORM_ADMIN_ROLES = ["SYSTEM_ADMIN"]; // the ONE high-power platform administrator — sole manager of cities
const PROJECT_ROLES = ["BUREAU_ANALYST", "BUREAU_HEAD", "CITY_ADMIN", "MINISTRY_ANALYST", "SYSTEM_ADMIN"];

export const PAGE_ACCESS: Record<string, string[]> = {
  "/": ALL_ROLES,
  "/parties": REGISTRY_ROLES,
  "/properties": REGISTRY_ROLES,
  "/registration": REGISTRY_ROLES,
  "/rent": REGISTRY_ROLES,
  "/complaints": OPERATIONS_ROLES,
  "/enforcement": OPERATIONS_ROLES,
  "/reports": INSIGHT_ROLES,
  "/settings": SETTINGS_ROLES,
  "/services": SERVICES_ROLES,
  "/platform/cities": PLATFORM_ADMIN_ROLES, // City Management — the dedicated URL of the one supreme admin
  "/cities": PLATFORM_ADMIN_ROLES, // legacy URL — redirect shim to /platform/cities
  "/platform": PLATFORM_ADMIN_ROLES, // legacy URL — redirect shim to /platform/cities
  "/project": PROJECT_ROLES,
  "/project/evidence": PROJECT_ROLES,
  "/project/testing": PROJECT_ROLES,
  "/project/uat": PROJECT_ROLES,
  "/project/pilot": PROJECT_ROLES,
  "/project/golive": PROJECT_ROLES,
};

export function canAccess(pathname: string, roleCode: string): boolean {
  const allowed = PAGE_ACCESS[pathname];
  if (!allowed) return true; // unknown paths default open (public shell)
  return allowed.includes(roleCode);
}

export type NavItem = {
  href: string;
  labelKey: string;
  labelEn: string;
  group: "overview" | "registry" | "operations" | "insights" | "admin" | "project";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", labelEn: "Dashboard", group: "overview" },
  { href: "/parties", labelKey: "nav.parties", labelEn: "Parties (M1)", group: "registry" },
  { href: "/properties", labelKey: "nav.assets", labelEn: "Properties & Contract (M2, M3)", group: "registry" },
  { href: "/registration", labelKey: "nav.registration", labelEn: "Registration (M4)", group: "registry" },
  { href: "/rent", labelKey: "nav.rent", labelEn: "Rent & Payments (M5, M6)", group: "operations" },
  { href: "/complaints", labelKey: "nav.disputes", labelEn: "Complaints (M8, M12)", group: "operations" },
  { href: "/enforcement", labelKey: "nav.enforcement", labelEn: "Control & Penalties (M7, M9)", group: "operations" },
  { href: "/reports", labelKey: "nav.data", labelEn: "Data & Reports (M10, M11)", group: "insights" },
  { href: "/settings", labelKey: "nav.settings", labelEn: "City Settings", group: "admin" },
  { href: "/services", labelKey: "nav.services", labelEn: "Service Catalog", group: "admin" },
  { href: "/platform/cities", labelKey: "nav.cities", labelEn: "City Management", group: "admin" },
  { href: "/project", labelKey: "nav.evidence", labelEn: "Evidence & Gates", group: "project" },
  { href: "/project/testing", labelKey: "nav.p5", labelEn: "Testing & Compliance", group: "project" },
  { href: "/project/uat", labelKey: "nav.p6", labelEn: "UAT & Legal Validation", group: "project" },
  { href: "/project/pilot", labelKey: "nav.p7", labelEn: "Migration, Training & Pilot", group: "project" },
  { href: "/project/golive", labelKey: "nav.p8", labelEn: "Go-Live & Operations", group: "project" },
];

export const NAV_GROUPS: Array<{ key: NavItem["group"]; labelEn: string }> = [
  { key: "overview", labelEn: "Overview" },
  { key: "registry", labelEn: "Registry" },
  { key: "operations", labelEn: "Operations" },
  { key: "insights", labelEn: "Insights" },
  { key: "admin", labelEn: "Administration" },
  { key: "project", labelEn: "Project tools" },
];
