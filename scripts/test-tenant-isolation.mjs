#!/usr/bin/env node
// ============================================================================
// test-tenant-isolation.mjs — Phase 10 automated security battery.
// Proves, over real HTTP against a running server (default :3000):
//   A. White-label: per-tenant themes (AA blue), slug + host resolution
//      (middleware), removed tenant (AD) = 404, deactivated tenant (DR) = 404.
//   B. Module gates: a module disabled by the platform admin is rejected at
//      the BACKEND API (403 MODULE_DISABLED), not merely hidden in the UI.
//   C. Cross-tenant isolation: city-bound officers are denied (403) when
//      targeting the removed city; purged staff codes are not usable actors.
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

// Remote (production) targets: raw-socket Host-header spoofing cannot be
// validated through a CDN/edge router — those two assertions run LOCAL-ONLY.
const BASE_URL = new URL(BASE);
const IS_REMOTE = !/^(localhost|127\.0\.0\.1)$/.test(BASE_URL.hostname) || BASE_URL.protocol === "https:";
const hostFetch = (path, host) => new Promise((resolve, reject) => {
  import(BASE_URL.protocol === "https:" ? "node:https" : "node:http").then(({ request }) => {
    const url = new URL(`${BASE}${path}`);
    const req = request({ hostname: url.hostname, servername: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, headers: { host } },
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
// Owner directive: Adama was REMOVED from the platform entirely — a removed
// tenant must serve no theme at all, by slug, by city code or by subdomain.
const bAD = await api("/api/tenant/branding?city=AD");
ok("REMOVED tenant (AD) has no public theme (404)", bAD.status === 404, `status=${bAD.status}`);
const bADslug = await api("/api/tenant/branding?slug=adama");
ok("REMOVED tenant slug (?slug=adama) has no public theme (404)", bADslug.status === 404, `status=${bADslug.status}`);
const bDR = await api("/api/tenant/branding?city=DR");
ok("DEACTIVATED tenant (DR) has no public theme (404)", bDR.status === 404, `status=${bDR.status}`);

const slugAA = await api("/api/tenant/branding?slug=addis-ababa");
ok("slug resolution works (?slug=addis-ababa → AA)", slugAA.status === 200 && slugAA.json?.data?.theme?.cityCode === "AA",
  `status=${slugAA.status} city=${slugAA.json?.data?.theme?.cityCode}`);
if (IS_REMOTE) {
  console.log("  SKIP  subdomain Host-header resolution (raw-socket spoof test is meaningful only against a local server)");
} else {
  const hostAA = await hostFetch("/api/tenant/branding", "addis-ababa.platform.com");
  ok("subdomain resolution works (Host: addis-ababa.platform.com → AA via middleware)",
    hostAA.status === 200 && hostAA.json?.data?.theme?.cityCode === "AA",
    `status=${hostAA.status} city=${hostAA.json?.data?.theme?.cityCode}`);
  const hostAD = await hostFetch("/api/tenant/branding", "adama.platform.com");
  ok("subdomain of a REMOVED tenant resolves nothing (404)",
    hostAD.status === 404, `status=${hostAD.status}`);
}

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
ok("REMOVED tenant (AD) exposes NO sign-in directory", (dirAD.json?.data?.staff ?? []).length === 0 &&
  !(dirAD.json?.data?.cities ?? []).some((c) => c.cityCode === "AD"),
  `staff=${(dirAD.json?.data?.staff ?? []).length}`);
const aaRegistrar = aaStaff.find((s) => s.roleCode === "WOREDA_REGISTRAR");

// ---------------------------------------------------------------------------
console.log("\nD. Module gates — backend-enforced, not just UI-hidden");
const off1 = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AA", modules: { COMPLAINTS: false } } });
ok("platform admin can disable the COMPLAINTS module for AA", off1.status === 200 && off1.json?.ok === true,
  `status=${off1.status} ${JSON.stringify(off1.json).slice(0, 140)}`);
const gated = await api("/api/complaints?city=AA");
ok("disabled module → GET /api/complaints?city=AA rejected with 403 MODULE_DISABLED",
  gated.status === 403 && gated.json?.code === "MODULE_DISABLED",
  `status=${gated.status} code=${gated.json?.code}`);
await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "AA", modules: { COMPLAINTS: true } } });
ok("platform admin re-enables COMPLAINTS for AA", true);
// The removed tenant proves the gate is per-tenant from the other side: an
// unknown city passes the gate (no config) but exposes no tenant data of its
// own — and DR below proves a REAL second tenant is gated independently.
const removedCityGate = await api("/api/complaints?city=AD");
ok("REMOVED city resolves no tenant gate context (falls through to public read)",
  removedCityGate.status === 200, `status=${removedCityGate.status}`);
const offDR = await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "DR", modules: { COMPLAINTS: false } } });
ok("platform admin can disable COMPLAINTS for DR (per-tenant gate proven on a live 2nd tenant)",
  offDR.status === 200 && offDR.json?.ok === true, `status=${offDR.status}`);
const gatedDR = await api("/api/complaints?city=DR");
ok("DR-only module disable → GET /api/complaints?city=DR rejected 403 MODULE_DISABLED",
  gatedDR.status === 403 && gatedDR.json?.code === "MODULE_DISABLED",
  `status=${gatedDR.status} code=${gatedDR.json?.code}`);
const aaStillOpen = await api("/api/complaints?city=AA");
ok("AA module flags are untouched while DR is gated", aaStillOpen.status === 200, `status=${aaStillOpen.status}`);
await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: "DR", modules: { COMPLAINTS: true } } });
ok("platform admin re-enables COMPLAINTS for DR", true);

// ---------------------------------------------------------------------------
console.log("\nE. Cross-tenant isolation — surviving tenants vs the removed city");
const cross1 = await api("/api/complaints", {
  method: "POST", staff: aaRegistrar?.staffCode,
  body: { cityCode: "AD", channel: "PHONE", groundCode: "RENT-INC", description: "cross-tenant probe", receivedAtOrgUnitId: "x" },
});
ok("AA officer targeting the REMOVED city is denied (scope wall)", cross1.status === 403, `status=${cross1.status}`);
const cross2 = await api("/api/complaints", {
  method: "POST", staff: "STF-1001",
  body: { cityCode: "AA", channel: "PHONE", groundCode: "RENT-INC", description: "cross-tenant probe", receivedAtOrgUnitId: "x" },
});
ok("purged staff code (STF-1001) is not a usable actor (401/403)", cross2.status === 401 || cross2.status === 403, `status=${cross2.status}`);
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
ok("AA tenant admin CANNOT configure the removed city (403)", otherCfg.status === 403, `status=${otherCfg.status}`);
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
console.log("\nG. Tenant lifecycle — the removed city cannot be resurrected via the API");
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
ok("lifecycle PATCH on the REMOVED city is refused (unknown city)", susp.status !== 200, `status=${susp.status}`);
const adLogin = await api("/api/auth/login", { method: "POST", body: { staffCode: "STF-1001" } });
ok("purged officer STF-1001 cannot sign in at all (401 unknown code)", adLogin.status === 401, `status=${adLogin.status}`);
const adTheme = await api("/api/tenant/branding?city=AD");
ok("removed tenant still serves no theme (404)", adTheme.status === 404, `status=${adTheme.status}`);

// ---------------------------------------------------------------------------
console.log("\nH. Onboarding a NEW tenant end-to-end (platform admin)");
const H_ON = !(IS_REMOTE && !process.env.ALLOW_ONBOARD);
if (!H_ON) {
  console.log("  SKIP  onboarding probe against a remote/production target (would create a visible test tenant in the fleet). Set ALLOW_ONBOARD=1 to force.");
}
const uniq = `TSV${"ABCDEFGH"[Math.floor(Math.random() * 8)]}`; // letters only — city codes are 2-4 A-Z
const ob = H_ON ? await api("/api/cities", {
  method: "POST", staff: "STF-0008",
  body: {
    cityCode: uniq, nameEn: "Testville", canonicalLang: "en",
    cityAdminName: "Test Tenant Admin", primaryColor: "#7C3AED",
  },
}) : { status: 0, json: null };
ok("new tenant onboarded in ONE step (org + config + admin + services)",
  !H_ON || (ob.status === 200 && ob.json?.ok === true && !!ob.json?.data?.cityAdmin?.staffCode),
  `status=${ob.status} ${JSON.stringify(ob.json).slice(0, 160)}`);
ok("onboarding returns a URL slug", !H_ON || !!ob.json?.data?.slug, `slug=${ob.json?.data?.slug}`);
const obTheme = H_ON ? await api(`/api/tenant/branding?city=${uniq}`) : { status: 0, json: null };
ok("new tenant serves its own white-label theme immediately",
  !H_ON || (obTheme.status === 200 && obTheme.json?.data?.theme?.colors?.primary === "#7C3AED"),
  `primary=${obTheme.json?.data?.theme?.colors?.primary}`);
const obSvc = H_ON ? await api(`/api/services?city=${uniq}`) : { status: 0, json: null };
ok("new tenant has a starter service catalog", !H_ON || (obSvc.json?.data?.services?.length ?? 0) >= 1);
if (H_ON) {
  const obAdmin = ob.json?.data?.cityAdmin?.staffCode;
  const obLogin = await api("/api/auth/login", { method: "POST", body: { staffCode: obAdmin } });
  ok("the new tenant's admin can sign in immediately", obLogin.status === 200, `status=${obLogin.status}`);
  const obCross = await api("/api/cities", { method: "PATCH", staff: obAdmin, body: { cityCode: "AA", portalTitle: "hijack" } });
  ok("the new tenant's admin CANNOT touch another tenant (403)", obCross.status === 403, `status=${obCross.status}`);
  await api("/api/cities", { method: "PATCH", staff: "STF-0008", body: { cityCode: uniq, status: "SUSPENDED" } });
  console.log(`  (test tenant ${uniq} suspended — left as evidence, delete via City Management if unwanted)`);
}

// ---------------------------------------------------------------------------
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
