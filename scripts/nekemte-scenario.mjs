// ============================================================================
// nekemte-scenario.mjs — Task 38: onboard Nekemte on PRODUCTION and run the
// full rental lifecycle of ONE house until closed, entirely through the
// public APIs (no DB access), exactly as the officers would:
//
//   A. STF-0008 (system admin)     → POST /api/cities        (onboard NEK)
//   B. NEK city admin (auto-made)  → boot payload, parties, verification,
//                                    property, registration file, 9-point
//                                    checklist, certification, staff register
//                                    (adds the stamping desk officer), then
//                                    registration + payments + termination
//   C. WOREDA_STAMPER (added in B) → the stamping act (Dir. Art. 9 wall:
//                                    the city admin is NOT allowed to stamp)
//   D. Cash payment auto-opens the Dir. Art. 22 10% referral case → notify →
//      paid; lease closed with a TERMINATION annotation.
//
// Resumable: every completed step is stored in nekemte-state.json and skipped
// on re-run, so a failure never double-creates records.
// ============================================================================

const BASE = "https://rentmanagmentv2-ndhb.vercel.app";
const STATE_PATH = "/home/z/my-project/scripts/nekemte-state.json";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf8")) : {};
const save = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
const log = (m) => console.log(m);

async function api(path, { method = "GET", body, staff, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-staff-code": staff, // the API capability layer authenticates by staff code
      ...(cookie ? { Cookie: cookie } : {}), // /api/platform reads the console session cookie
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || (json && json.ok === false)) {
    const err = json?.error ?? res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${err}`);
  }
  // Unwrap the {ok, data} envelope (login returns {ok, officer} at top level).
  const data = json && json.data !== undefined ? json.data : json;
  return { data, setCookie };
}

async function login(staffCode) {
  // Sign in like the console does and keep the session cookie — /api/platform
  // reads the cookie; every other API accepts the x-staff-code header.
  const { data, setCookie } = await api("/api/auth/login", { method: "POST", body: { staffCode } });
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error(`login ${staffCode}: no session cookie issued`);
  return { officer: data?.officer ?? data, cookie };
}

async function step(name, fn) {
  if (state[name] !== undefined) { log(`↷ skip ${name} (done)`); return state[name]; }
  const out = await fn();
  state[name] = out; save();
  log(`✓ ${name}`);
  return out;
}

// ---------------------------------------------------------------------------
// A. SYSTEM ADMIN — onboard Nekemte
// ---------------------------------------------------------------------------
await login("STF-0008");
log("signed in as STF-0008 (system admin)");

const fleet0 = (await api("/api/cities", { staff: "STF-0008" })).data;
const bish = fleet0.cities.find((c) => c.cityCode === "BISH");
const canonicalLang = bish?.canonicalLang ?? "am";
log(`existing cities: ${fleet0.cities.map((c) => c.cityCode).join(", ")} · canonicalLang mirrored from BISH: ${canonicalLang}`);

const onboard = await step("onboard", () =>
  api("/api/cities", {
    method: "POST", staff: "STF-0008",
    body: {
      cityCode: "NEK", nameEn: "Nekemte", nameAm: "ነቀምቴ", nameOm: "Niqimt",
      region: "Oromia", canonicalLang,
      cityAdminName: "Nekemte City Administrator",
    },
  }).then((r) => r.data),
);
log(`   ${onboard.message}`);
log(`   city admin: ${onboard.cityAdmin.staffCode} · bureau ${onboard.bureauCode} · contract ${onboard.contractVersion} · slug ${onboard.slug}`);

// ---------------------------------------------------------------------------
// B. NEK CITY ADMIN — boot payload (catalogs, units, contract)
// ---------------------------------------------------------------------------
const adminCode = onboard.cityAdmin.staffCode;
const adminSess = await login(adminCode);
log(`signed in as ${adminCode} (NEK city super-admin)`);

const boot = await step("boot", () =>
  api("/api/platform?city=NEK", { staff: adminCode, cookie: adminSess.cookie }).then((r) => {
    const d = r.data;
    return ({
    idTypes: d.idTypes.map((t) => ({ id: t.id, code: t.code })),
    statusTypes: d.statusTypes.map((t) => ({ id: t.id, code: t.code, exemptionMonths: t.exemptionMonths })),
    orgUnits: d.orgUnits.map((u) => ({ id: u.id, code: u.code, tier: u.tier })),
    activeContract: { id: d.activeContract.id, version: d.activeContract.version, cityCode: d.activeContract.cityCode },
    counts: d.counts,
  });
  }),
);
const idType = Object.fromEntries(boot.idTypes.map((t) => [t.code, t.id]));
const statusType = Object.fromEntries(boot.statusTypes.map((t) => [t.code, t.id]));
const woreda = boot.orgUnits.find((u) => u.tier === "WOREDA");
log(`   woreda ${woreda.code} · contract ${boot.activeContract.version} · idTypes ${boot.idTypes.map((t) => t.code).join("/")}`);

// ---------------------------------------------------------------------------
// M1 — parties: landlord + tenant, then registrar verification
// ---------------------------------------------------------------------------
const mkParty = (name, type, idTypeId, idNumber, phone, address) =>
  api("/api/parties", {
    method: "POST", staff: adminCode,
    body: {
      type, fullName: name, idTypeId, idNumber,
      idOriginalSeen: true, idCopyAttached: true, // Dir. Art. 7 original-and-copy
      phone, address, registeredAtOrgUnitId: woreda.id,
    },
  });

const landlord = await step("landlord", async () => {
  const p = await mkParty("Bekele Negeri", "LANDLORD", idType["ID-FAYDA"], "FAY-4451-8890", "+251-91-077-2210", "Bekele Bulti kebele 04, Nekemte");
  await api(`/api/parties/${p.id}`, { method: "PATCH", staff: adminCode, body: { decision: "VERIFIED" } });
  return { id: p.id, partyCode: p.partyCode };
});
log(`   landlord ${landlord.partyCode} VERIFIED`);

const tenant = await step("tenant", async () => {
  const p = await mkParty("Chaltu Guta", "TENANT", idType["ID-KEBELE"], "NEK-KB-04-1123", "+251-92-318-4475", "Bekele Bulti kebele 04, Nekemte");
  await api(`/api/parties/${p.id}`, { method: "PATCH", staff: adminCode, body: { decision: "VERIFIED" } });
  return { id: p.id, partyCode: p.partyCode };
});
log(`   tenant   ${tenant.partyCode} VERIFIED`);

// ---------------------------------------------------------------------------
// M2 — property (newly completed construction → 4-year exemption clock)
// ---------------------------------------------------------------------------
const property = await step("property", () =>
  api("/api/properties", {
    method: "POST", staff: adminCode,
    body: {
      woredaId: woreda.id, landlordId: landlord.id,
      kebele: "04 Bekele Bulti", houseNo: "NEK/04/123",
      addressNote: "G+1 detached house behind Nekemte College of Teachers Education",
      ownershipEvidence: "HOLDING_CERTIFICATE", evidenceRef: "HC-14-5521",
      statusTypeId: statusType["PS-NEW"], rooms: 3, areaSqm: 120,
      statusSetAt: "2026-08-20T00:00:00.000Z",
    },
  }).then((p) => ({ id: p.id, propertyCode: p.propertyCode, exemptionEndsAt: p.exemptionEndsAt })),
);
log(`   property ${property.propertyCode} · exemption ends ${property.exemptionEndsAt?.slice(0, 10) ?? "n/a"}`);

// ---------------------------------------------------------------------------
// M4 — registration file (3-year lease, 1 month prepay, CBE electronic)
// ---------------------------------------------------------------------------
const file = await step("file", () =>
  api("/api/registration-files", {
    method: "POST", staff: adminCode,
    body: {
      woredaId: woreda.id, propertyId: property.id,
      landlordId: landlord.id, tenantId: tenant.id,
      modelContractId: boot.activeContract.id,
      monthlyRent: 9000, leaseStart: "2026-09-05T00:00:00.000Z", leaseEnd: "2029-09-05T00:00:00.000Z",
      prepaymentMonths: 1, paymentMethod: "CBE_BIRR", paymentMethodConfirmed: true,
      interpreterUsed: false, isLegacy: false,
      witnesses: [
        { fullName: "Tsegaye Ararsa", idTypeId: idType["ID-KEBELE"], idNumber: "NEK-KB-04-0917" },
        { fullName: "Mekdes Fikadu", idTypeId: idType["ID-FAYDA"], idNumber: "FAY-7730-2214" },
        { fullName: "Hunduma Bekele", idTypeId: idType["ID-KEBELE"], idNumber: "NEK-KB-04-0865" },
      ],
    },
  }).then((f) => ({ id: f.id, fileNumber: f.fileNumber, status: f.status })),
);
log(`   file ${file.fileNumber} (${file.status})`);

const checklist = await step("checklist", () =>
  api(`/api/registration-files/${file.id}`, {
    method: "PATCH", staff: adminCode,
    body: {
      action: "check",
      items: Array.from({ length: 9 }, (_, i) => ({ orderNo: i + 1, passed: true, note: "Verified at the woreda desk" })),
    },
  }).then((f) => f.status),
);
log(`   nine-point checklist → ${checklist}`);

const certify = await step("certify", () =>
  api(`/api/registration-files/${file.id}`, {
    method: "PATCH", staff: adminCode,
    body: { action: "certify", registrarName: "Nekemte City Administrator" },
  }).then((f) => ({ status: f.status, certificateNumber: f.certificateNumber })),
);
log(`   certified → ${certify.certificateNumber}`);

// ---------------------------------------------------------------------------
// Dir. Art. 9 — stamping is a SEPARATE desk: the city admin adds the stamper
// through its own staff register, then the stamper signs in and stamps.
// ---------------------------------------------------------------------------
const stamper = await step("stamper", () =>
  api("/api/staff", {
    method: "POST", staff: adminCode,
    body: { fullName: "Dereje Wolde", roleCode: "WOREDA_STAMPER", orgUnitId: woreda.id, language: canonicalLang },
  }),
);
log(`   staff register → ${stamper.message}`);

const stamped = await step("stamp", async () => {
  await login(stamper.staffCode);
  return api(`/api/registration-files/${file.id}`, {
    method: "PATCH", staff: stamper.staffCode, body: { action: "stamp" },
  }).then((f) => f.status);
});
log(`   stamper ${stamper.staffCode} stamped → ${stamped}`);

const registered = await step("register", () =>
  api(`/api/registration-files/${file.id}`, {
    method: "PATCH", staff: adminCode,
    body: { action: "register", registrarName: "Nekemte City Administrator" },
  }).then((r) => ({ status: r.file.status, entry: r.entry })),
);
log(`   REGISTERED · registry book page ${registered.entry.pageNumber} entry ${registered.entry.entryNumber}`);

// ---------------------------------------------------------------------------
// M6 — payments: electronic prepayment, then one CASH month (auto penalty)
// ---------------------------------------------------------------------------
const prepay = await step("prepay", () =>
  api("/api/payments", {
    method: "POST", staff: adminCode,
    body: {
      fileId: file.id, amount: 9000, kind: "PREPAYMENT", monthsCovered: 1,
      method: "CBE_BIRR", isCash: false, paidAt: "2026-09-04T09:00:00.000Z",
      recordedByOrgUnitId: woreda.id,
    },
  }).then((p) => ({ receiptNumber: p.receiptNumber, providerRef: p.providerRef })),
);
log(`   prepayment ${prepay.receiptNumber} settled ${prepay.providerRef}`);

const cash = await step("cashRent", () =>
  api("/api/payments", {
    method: "POST", staff: adminCode,
    body: {
      fileId: file.id, amount: 9000, kind: "RENT", monthsCovered: 1,
      method: "CASH", isCash: true, paidAt: "2026-09-12T14:30:00.000Z",
      recordedByOrgUnitId: woreda.id,
    },
  }).then((p) => ({ receiptNumber: p.receiptNumber, providerRef: p.providerRef })),
);
log(`   cash month ${cash.receiptNumber} recorded (cash channel)`);

// ---------------------------------------------------------------------------
// M9 — the cash channel auto-opened the 10% referral case; notify + paid
// ---------------------------------------------------------------------------
const penaltyCase = await step("penaltyCase", async () => {
  const list = await api("/api/penalties", { staff: adminCode });
  const k = list.find((p) => p.subjectRef === cash.receiptNumber);
  if (!k) throw new Error(`auto penalty case for ${cash.receiptNumber} not found`);
  await api("/api/penalties", { method: "PATCH", staff: adminCode, body: { id: k.id, action: "notify" } });
  await api("/api/penalties", { method: "PATCH", staff: adminCode, body: { id: k.id, action: "pay" } });
  return { caseNumber: k.caseNumber, amount: k.computedAmount, offense: k.offenseCode };
});
log(`   penalty ${penaltyCase.caseNumber} (${penaltyCase.offense}) ${penaltyCase.amount} ETB → notified → PAID`);

// ---------------------------------------------------------------------------
// Closure — TERMINATION annotation (Dir. Art. 8(2))
// ---------------------------------------------------------------------------
const termination = await step("termination", () =>
  api(`/api/registration-files/${file.id}`, {
    method: "PATCH", staff: adminCode,
    body: {
      action: "annotate", code: "TERMINATION",
      text: "Lease ended early by mutual written agreement effective 2026-09-30: tenant Chaltu Guta relocating for work. House to be handed over vacant with no rent arrears; deposit settlement recorded at the woreda. Annotated per Dir. Art. 8(2).",
      byOrgUnitId: woreda.id,
    },
  }).then((a) => ({ code: a.code })),
);
log(`   TERMINATION annotation recorded → lease closed`);

// ---------------------------------------------------------------------------
// Final verification — city view + fleet view
// ---------------------------------------------------------------------------
const finalCity = await step("finalCity", () =>
  api("/api/platform?city=NEK", { staff: adminCode }).then((d) => {
    const f = d.files.find((x) => x.id === file.id);
    return {
      counts: d.counts,
      fileStatus: f?.status,
      certificateNumber: f?.certificateNumber,
      annotations: f?.annotations?.map((a) => a.code),
      bookEntry: f?.bookEntries?.[0] ? `p.${f.bookEntries[0].pageNumber}/e.${f.bookEntries[0].entryNumber}` : null,
    };
  }),
);
log(`   NEK counts: ${JSON.stringify(finalCity.counts)}`);

const finalFleet = await step("finalFleet", () =>
  api("/api/cities", { staff: "STF-0008" }).then((d) => {
    const c = d.cities.find((x) => x.cityCode === "NEK");
    return {
      cityCode: c.cityCode, nameEn: c.nameEn, bureauCode: c.bureauCode, slug: c.slug,
      serviceCount: c.serviceCount, woredas: c.woredas, staff: c.staff,
      properties: c.properties, files: c.files, paymentsCount: c.paymentsCount, paymentsAmount: c.paymentsAmount,
    };
  }),
);
log(`   fleet row: ${JSON.stringify(finalFleet)}`);

log("\n=== NEKEMTE SCENARIO COMPLETE ===");
log(`city admin: ${adminCode} · stamper: ${stamper.staffCode}`);
log(`landlord ${landlord.partyCode} · tenant ${tenant.partyCode} · property ${property.propertyCode}`);
log(`file ${file.fileNumber} · certificate ${certify.certificateNumber} · book ${registered.entry.pageNumber}/${registered.entry.entryNumber}`);
log(`receipts ${prepay.receiptNumber} (e-Prepay) + ${cash.receiptNumber} (cash) · penalty ${penaltyCase.caseNumber} PAID`);
log(`closed with TERMINATION annotation · fleet row + city counts verified`);
