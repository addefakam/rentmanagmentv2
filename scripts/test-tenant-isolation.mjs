#!/usr/bin/env node
// ============================================================================
// test-tenant-isolation.mjs — Phase 10 automated security battery.
// Proves, over real HTTP against a running server (default :3000):
//   A. White-label: per-tenant themes (AA blue / AD green), slug + host
//      resolution (middleware), deactivated tenant = 404.
//   B. Module gates: a module disabled by the platform admin is rejected at
//      the BACKEND API (403 MODULE_DISABLED), not merely hidden in the UI.
//   C. Cross-tenant isolation: city-bound officers of BOTH tenants are
//      denied (403) when targeting another tenant, both directions.
//   D. Tenant admin authority: a tenant admin can configure ONLY their own
//      tenant; Ministry (national, non-admin) cannot configure any tenant.
//   E. Tenant lifecycle: suspended/deactivated tenants refuse officer sign-in.
//   F. Platform admin: full fleet authority (modules, lifecycle, onboarding).
// Usage: node scripts/test-tenant-isolation.mjs [base-url]
// Exits non-zero on the first unexpected result.
// ============================================================================
const BASE = process.argv[2] ?? "http://localhost:3000";
let pass = 0, fail = 0;

const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.error(`  FAIL  ${name} ${detail}`); }
};

async function api(path, { method = "GET", body, staff, cookie, host } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (staff) headers["x-staff-code"] = staff;
  if (cookie) headers["cookie"] = cookie;
  if (host) headers["host"] = host;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") };
}

const hostFetch = (path, host) => new Promise((resolve, reject) => {
  import("node:http").then(({ request }) => {
    const url = new URL(`${BASE}${path}`);
    const req = request({ hostname: "127.0.0.1", port: url.port || 80, path: url.pathname + url.search, headers: { host } },
      (res) => {
        let raw = "";
        res.on("data", (c) => { raw += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, json: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, json: null }); }
        });
      });
    req.on("error", reject);
    req.end();
  });
});

console.log(`\n=== Tenant isolation & module-gate battery against ${BASE} ===\n`);

// ---------------------------------------------------------------------------
console.log("A. White-label tenant themes");
const bAA = await api("/api/tenant/branding?city=AA");
ok("branding API is public", bAA.status === 200 && bAA.json?.ok === true, `status=${bAA.status}`);
ok("AA resolves with a theme", !!bAA.json?.data?.theme?.cityCode, JSON.stringify(bAA.json).slice(0, 120));
ok("AA theme carries 12 module flags", Object.keys(bAA.json?.data?.theme?.modules ?? {}).length === 12);
const bAD = await api("/api/tenant/branding?city=AD");
ok("AD resolves with a theme", bAD.status === 200 && !!bAD.json?.data?.theme);
const aaColors = bAA.json?.data?.theme?.colors ?? {}, adColors = bAD.json?.data?.theme?.colors ?? {};
ok("AA and AD carry DIFFERENT branding (City A blue vs City B green)",
  aaColors.primary !== adColors.primary, `${aaColors.primary} vs ${adColors.primary}`);
const bDR = await api("/api/tenant/branding?city=DR");
ok("DEACTIVATED tenant (DR) has no public theme (404)", bDR.status === 404, `status=${bDR.status}`);

const slugAA = await api("/api/tenant/branding?slug=addis-ababa");
ok("slug resolution works (?slug=addis-ababa → AA)", slugAA.status === 200 && slugAA.json?.data?.theme?.cityCode === "AA",
  `status=${slugAA.status} city=${slugAA.json?.data?.theme?.cityCode}`);
const hostAA = await hostFetch("/api/tenant/branding", "addis-ababa.platform.com");
ok("subdomain resolution works (Host: addis-ababa.platform.com → AA via middleware)",
  hostAA.status === 200 && hostAA.json?.data?.theme?.cityCode === "AA",
  `status=${hostAA.status} city=${hostAA.json?.data?.theme?.cityCode}`);
const hostAD = await hostFetch("/api/tenant/branding", "adama.platform.com");
ok("different subdomain → different tenant (adama.platform.com → AD)",
  hostAD.status === 200 && hostAD.json?.data?.theme?.cityCode === "AD",
  `city=${hostAD.json?.data?.theme?.cityCode}`);

// ---------------------------------------------------------------------------
console.log("\nB. Public service catalog (CITIZEN_SERVICES module)");
const svc = await api("/api/services?city=AA");
ok("public catalog lists AA services", svc.status === 200 && (svc.json?.data?.services?.length ?? 0) >= 1,
  `status=${svc.status} n=${svc.json?.data?.services?.length}`);

// ---------------------------------------------------------------------------
console.log("\nC. Platform admin sign-in (STF-0008) + fleet authority");
const sys = await api("/api/auth/login", { method: "POST", body: { staffCode: "STF-0008" } });
ok("SYSTEM_ADMIN signs in", sys.status === 200 && sys.json?.ok === true, `status=${sys.status}`);
const sysCookie = (sys.setCookie ?? "").split(";")[0];
ok("session cookie issued (rc_officer)", sysCookie.startsWith("rc_officer="));

// Find a city-bound admin for AA (CITY_ADMIN preferred, else BUREAU_HEAD)
const dirAA = await api("/api/auth/staff?city=AA");
const aaStaff = dirAA.json?.data?.staff ?? [];
const aaAdmin = aaStaff.find((s) => s.roleCode === "CITY_ADMIN") ?? aaStaff.find((s) => s.roleCode === "BUREAU_HEAD");
ok("AA has a tenant admin (CITY_ADMIN or BUREAU_HEAD)", !!aaAdmin, `roles=${aaStaff.map((s) => s.roleCode).join(",")}`);
const dirAD = await api("/api/auth/staff?city=AD");
const adAdmin = (dirAD.json?.data?.staff ?? []).find((s) => s.roleCode === "CITY_ADMIN" || s.roleCode === "BUREAU_HEAD");
ok("AD has a tenant admin", !!adAdmin);
const aaRegistrar = aaStaff.find((s) => s.roleCode === "WOREDA_REGISTRAR");
const adRegistrar = (dirAD.json?.data?.staff ?? []).find((s) => s.roleCode === "WOREDA_REGISTRAR");

// ---------------------------------------------------------------------------
console.log("\nD. Module gates — backend-enforced, not just UI-hidden");
const off1 = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AA", modules: { COMPLAINTS: false } } });
ok("platform admin can disable the COMPLAINTS module for AA", off1.status === 200 && off1.json?.ok === true,
  `status=${off1.status} ${JSON.stringify(off1.json).slice(0, 140)}`);
const gated = await api("/api/complaints?city=AA");
ok("disabled module → GET /api/complaints?city=AA rejected with 403 MODULE_DISABLED",
  gated.status === 403 && gated.json?.code === "MODULE_DISABLED",
  `status=${gated.status} code=${gated.json?.code}`);
const otherTenant = await api("/api/complaints?city=AD");
ok("same endpoint stays open for AD (module is per-tenant)", otherTenant.status === 200, `status=${otherTenant.status}`);
const on1 = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AA", modules: { COMPLAINTS: true } } });
ok("platform admin re-enables COMPLAINTS", on1.status === 200);
const restored = await api("/api/complaints?city=AA");
ok("AA complaints endpoint restored", restored.status === 200, `status=${restored.status}`);

// ---------------------------------------------------------------------------
console.log("\nE. Cross-tenant isolation — BOTH directions");
const cross1 = await api("/api/complaints", {
  method: "POST", staff: aaRegistrar?.staffCode,
  body: { cityCode: "AD", channel: "PHONE", groundCode: "RENT-INC", description: "cross-tenant probe", receivedAtOrgUnitId: "x" },
});
ok("AA officer targeting AD is denied 403", cross1.status === 403, `status=${cross1.status}`);
const cross2 = await api("/api/complaints", {
  method: "POST", staff: adRegistrar?.staffCode,
  body: { cityCode: "AA", channel: "PHONE", groundCode: "RENT-INC", description: "cross-tenant probe", receivedAtOrgUnitId: "x" },
});
ok("AD officer targeting AA is denied 403", cross2.status === 403, `status=${cross2.status}`);
const self1 = await api("/api/complaints", { method: "GET", staff: aaRegistrar?.staffCode });
ok("AA officer's own-city read works", self1.status === 200);
const fleetDeny = await api("/api/cities", { staff: aaRegistrar?.staffCode });
ok("tenant officer cannot read the fleet table (city:admin)", fleetDeny.status === 403, `status=${fleetDeny.status}`);

// ---------------------------------------------------------------------------
console.log("\nF. Tenant admin authority — own tenant only");
const ownCfg = await api("/api/cities", { method: "PATCH", staff: aaAdmin?.staffCode, body: { cityCode: "AA", portalTitle: "Addis Ababa Rent Control Portal" } });
ok("AA tenant admin can white-label their OWN tenant", ownCfg.status === 200 && ownCfg.json?.ok === true,
  `status=${ownCfg.status} ${JSON.stringify(ownCfg.json).slice(0, 140)}`);
const otherCfg = await api("/api/cities", { method: "PATCH", staff: aaAdmin?.staffCode, body: { cityCode: "AD", portalTitle: "hijack" } });
ok("AA tenant admin CANNOT configure AD (403)", otherCfg.status === 403, `status=${otherCfg.status}`);
const lifeDeny = await api("/api/cities", { method: "PATCH", staff: aaAdmin?.staffCode, body: { cityCode: "AA", isActive: false } });
ok("tenant admin CANNOT deactivate their own tenant (city:write is platform-only)", lifeDeny.status === 403, `status=${lifeDeny.status}`);
const minTry = await api("/api/cities", { method: "PATCH", staff: "STF-0007", body: { cityCode: "AA", portalTitle: "x" } });
ok("Ministry analyst (national, non-admin) CANNOT configure a tenant", minTry.status === 403, `status=${minTry.status}`);
const themeSet = await api("/api/tenant/branding?city=AA");
ok("portal title change is live on the public theme API",
  themeSet.json?.data?.theme?.portalTitle === "Addis Ababa Rent Control Portal",
  `portalTitle=${themeSet.json?.data?.theme?.portalTitle}`);
await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AA", portalTitle: "" } });

// ---------------------------------------------------------------------------
console.log("\nG. Tenant lifecycle — suspended tenants refuse sign-in");
const dirDR = await api("/api/auth/staff?city=DR");
// The directory appends NATIONAL officers (they sign in anywhere) — a real
// tenant officer of DR is required for the refusal test.
const drOfficer = (dirDR.json?.data?.staff ?? []).find((s) => s.cityCode !== "*" && !["MINISTRY_ANALYST", "SYSTEM_ADMIN"].includes(s.roleCode));
if (drOfficer) {
  const drLogin = await api("/api/auth/login", { method: "POST", body: { staffCode: drOfficer.staffCode } });
  ok("officer of a DEACTIVATED tenant cannot sign in (403)", drLogin.status === 403, `status=${drLogin.status}`);
} else {
  ok("officer of a DEACTIVATED tenant cannot sign in (403) — skipped: no tenant officer in DR", true);
}
const susp = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AD", status: "SUSPENDED" } });
ok("platform admin can SUSPEND a tenant", susp.status === 200 && susp.json?.data?.status === "SUSPENDED", `status=${susp.status}`);
const adLogin = await api("/api/auth/login", { method: "POST", body: { staffCode: adRegistrar?.staffCode ?? "STF-1001" } });
ok("officer of a SUSPENDED tenant cannot sign in (403)", adLogin.status === 403, `status=${adLogin.status}`);
const adTheme = await api("/api/tenant/branding?city=AD");
ok("suspended tenant still resolves a theme (login page can show the banner)", adTheme.status === 200 && adTheme.json?.data?.theme?.status === "SUSPENDED");
const react = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AD", status: "ACTIVE" } });
ok("platform admin reactivates the tenant", react.status === 200);
const adLogin2 = await api("/api/auth/login", { method: "POST", body: { staffCode: adRegistrar?.staffCode ?? "STF-1001" } });
ok("officer can sign in again after reactivation", adLogin2.status === 200, `status=${adLogin2.status}`);

// ---------------------------------------------------------------------------
console.log("\nH. Onboarding a NEW tenant end-to-end (platform admin)");
const uniq = `TSV${"ABCDEFGH"[Math.floor(Math.random() * 8)]}`; // letters only — city codes are 2-4 A-Z
const ob = await api("/api/cities", {
  method: "POST", staff: "STF-0008",
  body: {
    cityCode: uniq, nameEn: "Testville", canonicalLang: "en",
    cityAdminName: "Test Tenant Admin", primaryColor: "#7C3AED",
  },
});
ok("new tenant onboarded in ONE step (org + config + admin + services)",
  ob.status === 200 && ob.json?.ok === true && !!ob.json?.data?.cityAdmin?.staffCode,
  `status=${ob.status} ${JSON.stringify(ob.json).slice(0, 160)}`);
ok("onboarding returns a URL slug", !!ob.json?.data?.slug, `slug=${ob.json?.data?.slug}`);
const obTheme = await api(`/api/tenant/branding?city=${uniq}`);
ok("new tenant serves its own white-label theme immediately",
  obTheme.status === 200 && obTheme.json?.data?.theme?.colors?.primary === "#7C3AED",
  `primary=${obTheme.json?.data?.theme?.colors?.primary}`);
const obSvc = await api(`/api/services?city=${uniq}`);
ok("new tenant has a starter service catalog", (obSvc.json?.data?.services?.length ?? 0) >= 1);
const obAdmin = ob.json?.data?.cityAdmin?.staffCode;
const obLogin = await api("/api/auth/login", { method: "POST", body: { staffCode: obAdmin } });
ok("the new tenant's admin can sign in immediately", obLogin.status === 200, `status=${obLogin.status}`);
const obCross = await api("/api/cities", { method: "PATCH", staff: obAdmin, body: { cityCode: "AA", portalTitle: "hijack" } });
ok("the new tenant's admin CANNOT touch another tenant (403)", obCross.status === 403, `status=${obCross.status}`);
await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: uniq, status: "SUSPENDED" } });
console.log(`  (test tenant ${uniq} suspended — left as evidence, delete via City Management if unwanted)`);

// ---------------------------------------------------------------------------
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
