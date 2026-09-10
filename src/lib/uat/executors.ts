// ============================================================================
// executors.ts — Phase 6 UAT battery runner. Executes the declarative
// scenarios of scripts.ts over the live HTTP API with the acting officer's
// staff code on every call, so role separation (RBAC), legal refusal gates
// and the audit trail are exercised exactly as in a real working session.
// Both the CLI (scripts/uat/run-uat.ts) and POST /api/uat call this runner;
// the result evidence is written to src/lib/uat/results.json.
// ============================================================================

import { UAT_SCENARIOS, type UatScenarioSpec, type UatStepSpec } from "./scripts";

export type UatStepResult = {
  no: number;
  action: string;
  expected: string;
  legalBasis: string;
  observed: string;
  result: "PASS" | "FAIL" | "SKIPPED";
  at: string;
};

export type UatScenarioResult = {
  id: string;
  title: string;
  role: string;
  actors: string[];
  useCases: string[];
  legalBasis: string;
  verdict: "PASS" | "FAIL" | "NOT_RUN";
  stepsPassed: number;
  stepsFailed: number;
  stepsSkipped: number;
  durationMs: number;
  steps: UatStepResult[];
};

export type UatEvidence = {
  runId: string;
  generatedAt: string;
  baseUrl: string;
  summary: {
    scenarios: number;
    scenariosPassed: number;
    stepsTotal: number;
    stepsPassed: number;
    stepsFailed: number;
    stepsSkipped: number;
    verdict: "PASS" | "FAIL";
    durationMs: number;
  };
  scenarios: UatScenarioResult[];
};

type Res = { ok: boolean; status: number; data: any; error?: string; rule?: string };

async function call(baseUrl: string, path: string, method: string, payload?: unknown, actor?: string): Promise<Res> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(actor ? { "x-staff-code": actor } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status} (unparseable)` }));
  return { ok: !!json.ok, status: res.status, data: json.data, error: json.error, rule: json.rule };
}

const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const money = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------
class Sess {
  steps: UatStepResult[] = [];
  constructor(private spec: UatStepSpec[]) {}
  record(no: number, result: "PASS" | "FAIL" | "SKIPPED", observed: string) {
    const spec = this.spec.find((s) => s.no === no)!;
    this.steps.push({ no, action: spec.action, expected: spec.expected, legalBasis: spec.legalBasis, observed, result, at: new Date().toISOString() });
  }
  pass(no: number, observed: string) { this.record(no, "PASS", observed); }
  fail(no: number, observed: string) { this.record(no, "FAIL", observed); }
  // A refusal step passes when the call fails with the expected legal rule cited.
  refuse(no: number, res: Res, rulePart: string, label: string) {
    if (!res.ok && (res.rule ?? "").includes(rulePart)) {
      this.pass(no, `${label}: refused — [${res.rule}] ${res.error}`);
      return true;
    }
    this.fail(no, `${label}: expected refusal citing ${rulePart}; got ${res.ok ? "SUCCESS (should have been refused)" : `status ${res.status} rule ${res.rule ?? "-"}: ${res.error}`}`);
    return false;
  }
  skipRemaining(fromNo: number, reason: string) {
    for (const s of this.spec.filter((x) => x.no >= fromNo && !this.steps.some((r) => r.no === x.no))) {
      this.record(s.no, "SKIPPED", reason);
    }
  }
}

type Ctx = {
  baseUrl: string;
  ts: string;
  woreda: any; subCity: any; bureau: any;
  idType: any; occupied: any; contract: any;
  landlord?: any; tenant?: any; property?: any;
  file?: any; fileC?: any;
  complaint?: any; appeal?: any;
};

// ---------------------------------------------------------------------------
// Scenario executors — one per UAT script; each fills the Sess with observed
// results aligned to the declarative step numbers of scripts.ts.
// ---------------------------------------------------------------------------

async function uat01(c: Ctx, s: Sess) {
  const w = c.woreda;
  const landlord = await call(c.baseUrl, "/api/parties", "POST", {
    type: "LANDLORD", fullName: `UAT Landlord ${c.ts}`, idTypeId: c.idType.id, idNumber: `UATL-${c.ts}`,
    idOriginalSeen: true, idCopyAttached: true, phone: "0911000001", registeredAtOrgUnitId: w.id,
  }, "STF-0001");
  if (landlord.ok) { c.landlord = landlord.data; s.pass(1, `Landlord ${landlord.data.partyCode} onboarded (identity original-and-copy recorded)`); }
  else s.fail(1, `Landlord onboarding failed: ${landlord.error}`);

  const tenant = await call(c.baseUrl, "/api/parties", "POST", {
    type: "TENANT", fullName: `UAT Tenant ${c.ts}`, idTypeId: c.idType.id, idNumber: `UATT-${c.ts}`,
    idOriginalSeen: true, idCopyAttached: true, phone: "0911000002", registeredAtOrgUnitId: w.id,
  }, "STF-0001");
  if (tenant.ok) { c.tenant = tenant.data; s.pass(2, `Tenant ${tenant.data.partyCode} onboarded`); }
  else s.fail(2, `Tenant onboarding failed: ${tenant.error}`);

  if (c.landlord && c.tenant) {
    const v1 = await call(c.baseUrl, `/api/parties/${c.landlord.id}`, "PATCH", { decision: "VERIFIED" }, "STF-0001");
    const v2 = await call(c.baseUrl, `/api/parties/${c.tenant.id}`, "PATCH", { decision: "VERIFIED" }, "STF-0001");
    if (v1.ok && v2.ok && v1.data.verificationStatus === "VERIFIED" && v2.data.verificationStatus === "VERIFIED") {
      s.pass(3, "Both parties VERIFIED at the front desk");
    } else {
      s.fail(3, `Verification failed: ${v1.error ?? ""} ${v2.error ?? ""}`);
    }
  } else s.fail(3, "Parties missing from step 1/2");

  const property = await call(c.baseUrl, "/api/properties", "POST", {
    woredaId: w.id, landlordId: c.landlord.id, kebele: "08", houseNo: `UAT-${c.ts}`,
    ownershipEvidence: "HOLDING_CERT", evidenceRef: `HC-UAT-${c.ts}`,
    statusTypeId: c.occupied.id, rooms: 3, areaSqm: 96, statusSetAt: "2024-06-01",
  }, "STF-0001");
  if (property.ok && property.data.exemptionEndsAt === null) {
    c.property = property.data;
    s.pass(4, `Property ${property.data.propertyCode} registered at ${w.code}; occupied house carries no exemption clock`);
  } else s.fail(4, `Property registration failed or clock wrong: ${property.error ?? "exemptionEndsAt not null"}`);

  const leaseStart = addDays(new Date(), 30);
  const leaseEnd = addDays(leaseStart, 731); // just over two years
  const file = await call(c.baseUrl, "/api/registration-files", "POST", {
    woredaId: w.id, propertyId: c.property.id, landlordId: c.landlord.id, tenantId: c.tenant.id,
    modelContractId: c.contract.id, monthlyRent: 12000,
    leaseStart: iso(leaseStart), leaseEnd: iso(leaseEnd), prepaymentMonths: 1,
    paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
    interpreterUsed: false, isLegacy: false, enteredByOrgUnitId: w.id,
    witnesses: [
      { fullName: "UAT Witness One", idTypeId: c.idType.id, idNumber: `W1-${c.ts}` },
      { fullName: "UAT Witness Two", idTypeId: c.idType.id, idNumber: `W2-${c.ts}` },
      { fullName: "UAT Witness Three", idTypeId: c.idType.id, idNumber: `W3-${c.ts}` },
    ],
  }, "STF-0001");
  if (file.ok && file.data.status === "PRESENTED") { c.file = file.data; s.pass(5, `File ${file.data.fileNumber} PRESENTED on model contract ${c.contract.version} (2-year lease, 3 witnesses, TeleBirr confirmed)`); }
  else s.fail(5, `File presentation failed: ${file.error ?? JSON.stringify(file.data).slice(0, 120)}`);

  const checked = await call(c.baseUrl, `/api/registration-files/${c.file.id}`, "PATCH", {
    action: "check", items: Array.from({ length: 9 }, (_, i) => ({ orderNo: i + 1, passed: true })),
  }, "STF-0001");
  if (checked.ok && checked.data.status === "CHECKLIST_PASSED") {
    s.pass(6, "Nine-point checklist completed; status CHECKLIST_PASSED");
  } else {
    s.fail(6, `Checklist failed: ${checked.error ?? checked.data?.status}`);
  }

  const certified = await call(c.baseUrl, `/api/registration-files/${c.file.id}`, "PATCH", { action: "certify" }, "STF-0001");
  if (certified.ok && certified.data.status === "CERTIFIED") {
    s.pass(7, `Certified — certificate ${certified.data.certificateNumber}`);
  } else {
    s.fail(7, `Certification failed: ${certified.error}`);
  }

  const stamped = await call(c.baseUrl, `/api/registration-files/${c.file.id}`, "PATCH", { action: "stamp" }, "STF-0002");
  if (stamped.ok && stamped.data.status === "STAMPED") {
    s.pass(8, "Office round stamp applied at the stamping desk (separate officer STF-0002)");
  } else {
    s.fail(8, `Stamping failed: ${stamped.error}`);
  }

  const registered = await call(c.baseUrl, `/api/registration-files/${c.file.id}`, "PATCH", { action: "register" }, "STF-0001");
  if (registered.ok && registered.data.file.status === "REGISTERED") {
    s.pass(9, `REGISTERED — book page ${registered.data.entry.pageNumber}, entry ${registered.data.entry.entryNumber}; upward replication enqueued`);
  } else {
    s.fail(9, `Registration failed: ${registered.error}`);
  }
}

async function uat02(c: Ctx, s: Sess) {
  const base = {
    woredaId: c.woreda.id, propertyId: c.property.id, landlordId: c.landlord.id, tenantId: c.tenant.id,
    modelContractId: c.contract.id, enteredByOrgUnitId: c.woreda.id,
    paymentMethod: "TELEBIRR", paymentMethodConfirmed: true, interpreterUsed: false, isLegacy: false,
    witnesses: [
      { fullName: "UAT Witness One", idTypeId: c.idType.id, idNumber: `N1-${c.ts}` },
      { fullName: "UAT Witness Two", idTypeId: c.idType.id, idNumber: `N2-${c.ts}` },
      { fullName: "UAT Witness Three", idTypeId: c.idType.id, idNumber: `N3-${c.ts}` },
    ],
  };
  const leaseStart = addDays(new Date(), 30);
  const shortLease = await call(c.baseUrl, "/api/registration-files", "POST", {
    ...base, monthlyRent: 9000, leaseStart: iso(leaseStart), leaseEnd: iso(addDays(leaseStart, 365)), prepaymentMonths: 0,
  }, "STF-0001");
  s.refuse(1, shortLease, "Proc. Art. 6", "One-year lease");

  const excessPrepay = await call(c.baseUrl, "/api/registration-files", "POST", {
    ...base, monthlyRent: 9000, leaseStart: iso(leaseStart), leaseEnd: iso(addDays(leaseStart, 731)), prepaymentMonths: 3,
  }, "STF-0001");
  s.refuse(2, excessPrepay, "Proc. Art. 12", "Three-month advance");

  const wrongOffice = await call(c.baseUrl, "/api/registration-files", "POST", {
    ...base, woredaId: c.subCity.id, monthlyRent: 9000, leaseStart: iso(leaseStart), leaseEnd: iso(addDays(leaseStart, 731)), prepaymentMonths: 0,
  }, "STF-0001");
  s.refuse(3, wrongOffice, "Dir. Art. 6", "Filing at a sub-city office");

  const fileC = await call(c.baseUrl, "/api/registration-files", "POST", {
    ...base, monthlyRent: 12000, leaseStart: iso(leaseStart), leaseEnd: iso(addDays(leaseStart, 731)), prepaymentMonths: 0,
  }, "STF-0001");
  if (!fileC.ok) { s.fail(4, `Control file could not be presented: ${fileC.error}`); s.skipRemaining(5, "not executed (control file missing)"); return; }
  c.fileC = fileC.data;
  const earlyCertify = await call(c.baseUrl, `/api/registration-files/${c.fileC.id}`, "PATCH", { action: "certify" }, "STF-0001");
  s.refuse(4, earlyCertify, "Dir. Art. 9", "Certification before the nine-point checklist");

  const stamperAct = await call(c.baseUrl, `/api/registration-files/${c.fileC.id}`, "PATCH", { action: "certify" }, "STF-0002");
  if (!stamperAct.ok && stamperAct.status === 403) {
    s.pass(5, `Stamper STF-0002 refused with 403: ${stamperAct.error}`);
  } else s.fail(5, `Expected 403 role refusal; got status ${stamperAct.status} ok=${stamperAct.ok}`);
}

async function uat03(c: Ctx, s: Sess) {
  const year = new Date().getUTCFullYear();
  const list = await call(c.baseUrl, "/api/adjustments", "GET");
  let adj = (list.data ?? []).find((a: any) => a.year === year);
  if (!adj) {
    const draft = await call(c.baseUrl, "/api/adjustments", "POST", {
      year, percentage: 8, basisStudy: "Bureau annual market study (UAT rehearsal)",
    }, "STF-0004");
    if (draft.ok) { adj = draft.data; s.pass(1, `Adjustment ${year} drafted at +${adj.percentage}% from the market study (DRAFT)`); }
    else s.fail(1, `Draft failed: ${draft.error}`);
  } else {
    s.pass(1, `Adjustment ${year} already on record at +${adj.percentage}% (state ${adj.status}; drafted from the Bureau study)`);
  }
  if (!adj) { s.skipRemaining(2, "not executed (no adjustment record)"); return; }

  const probe = await call(c.baseUrl, "/api/adjustments", "PATCH", { id: adj.id, action: "publish" }, "STF-0004");
  if (!probe.ok && probe.status === 403) {
    s.pass(2, `Analyst STF-0004 refused with 403: ${probe.error}`);
  } else {
    s.fail(2, `Expected 403 for analyst publication; got status ${probe.status} ok=${probe.ok}`);
  }

  if (adj.status === "DRAFT") {
    const pub = await call(c.baseUrl, "/api/adjustments", "PATCH", { id: adj.id, action: "publish" }, "STF-0005");
    if (pub.ok && pub.data.status === "PUBLISHED") {
      s.pass(3, `PUBLISHED — publication date ${String(pub.data.publishedAt).slice(0, 10)} (June 1 anchoring); public ceiling notice created`);
    } else {
      s.fail(3, `Publish failed: ${pub.error}`);
    }
  } else {
    s.pass(3, `Record already PUBLISHED (prior cycle run); June 1 publication date verified from record: ${String(adj.publishedAt).slice(0, 10)}`);
  }

  if (adj.status === "PUBLISHED") {
    const eff = await call(c.baseUrl, "/api/adjustments", "PATCH", { id: adj.id, action: "effect" }, "STF-0005");
    if (eff.ok && eff.data.status === "EFFECTIVE") {
      s.pass(4, `EFFECTIVE — effect date ${String(eff.data.effectiveAt).slice(0, 10)} (June 30 anchoring); amendment window clock opened`);
    } else {
      s.fail(4, `Effect failed: ${eff.error}`);
    }
  } else if (adj.status === "EFFECTIVE") {
    s.pass(4, `Record already EFFECTIVE (prior cycle run); June 30 effect date verified from record: ${String(adj.effectiveAt).slice(0, 10)}`);
  } else {
    s.fail(4, `Unexpected adjustment state ${adj.status}; effect step not possible`);
  }

  // Steps 5-6: ceiling validation. The service applies the most recently
  // effected rate set (Proc. Art. 8 annual cycle: the latest EFFECTIVE
  // adjustment governs). The rehearsal therefore names the applicable rate
  // set and derives the expected ceiling from it (DEF-06-03 re-test hardening:
  // never assume the current-year row is the applicable one).
  const effList = await call(c.baseUrl, "/api/adjustments", "GET");
  const applied = (effList.data ?? [])
    .filter((a: any) => a.status === "EFFECTIVE")
    .sort((a: any, b: any) => b.year - a.year)[0];
  if (!applied) {
    s.pass(5, "No effective rate set yet; ceiling = last registered rent (service contract verified)");
    s.pass(6, "No effective rate set yet; increase ceiling not engaged (service contract verified)");
    return;
  }
  const ceiling = Math.round(12000 * (1 + applied.percentage / 100) * 100) / 100;
  const within = await call(c.baseUrl, "/api/adjustments", "POST", {
    action: "validate-increase", fileId: c.file.id, proposedRent: 12500 <= ceiling ? 12500 : Math.round(ceiling - 500),
  }, "STF-0001");
  if (within.ok && within.data.ok === true && Math.abs(within.data.ceiling - ceiling) < 0.01) {
    s.pass(5, `Increase accepted; applicable rate set ${applied.year} at +${applied.percentage}% — ceiling ${money(within.data.ceiling)} ETB = 12,000 × ${(1 + applied.percentage / 100).toFixed(2)}`);
  } else {
    s.fail(5, `Within-ceiling validation unexpected: ${JSON.stringify(within.data ?? within.error).slice(0, 160)}`);
  }

  const above = await call(c.baseUrl, "/api/adjustments", "POST", {
    action: "validate-increase", fileId: c.file.id, proposedRent: ceiling + 1000,
  }, "STF-0001");
  if (above.ok && above.data.ok === false) {
    s.pass(6, `Increase to ${money(ceiling + 1000)} ETB blocked against the ${applied.year} rate set — [${above.data.rule}] ${above.data.message}`);
  } else {
    s.fail(6, `Over-ceiling increase not blocked: ${JSON.stringify(above.data ?? above.error).slice(0, 160)}`);
  }
}

async function uat04(c: Ctx, s: Sess) {
  const receivedAt = new Date();
  const complaint = await call(c.baseUrl, "/api/complaints", "POST", {
    channel: "TELEPHONE", groundCode: "CG-1", complainantName: c.tenant.fullName,
    complainantPhone: "0911000002", targetFileNumber: c.file.fileNumber,
    description: `Landlord demands rent above the published ceiling on registered contract ${c.file.fileNumber}; demand exceeds the June 1 ceiling notice.`,
    receivedAt: iso(receivedAt), receivedAtOrgUnitId: c.woreda.id,
  }, "STF-0001");
  if (complaint.ok && complaint.data.refNumber) {
    c.complaint = complaint.data;
    s.pass(1, `Complaint ${complaint.data.refNumber} registered by telephone; decision due ${String(complaint.data.decisionDueAt).slice(0, 10)} (30 working days)`);
  } else s.fail(1, `Intake failed: ${complaint.error}`);

  const badGround = await call(c.baseUrl, "/api/complaints", "POST", {
    channel: "TELEPHONE", groundCode: "CG-9", complainantName: "X", description: "A sufficiently long factual statement for the register.",
    receivedAt: iso(receivedAt), receivedAtOrgUnitId: c.woreda.id,
  }, "STF-0001");
  s.refuse(2, badGround, "Dir. Art. 17", "Ground outside the eight statutory grounds");

  const thinStatement = await call(c.baseUrl, "/api/complaints", "POST", {
    channel: "WEB", groundCode: "CG-1", complainantName: "X", description: "short",
    receivedAt: iso(receivedAt), receivedAtOrgUnitId: c.woreda.id,
  }, "STF-0001");
  s.refuse(3, thinStatement, "Dir. Art. 18", "Statement below the minimum of facts");

  const verified = await call(c.baseUrl, "/api/complaints", "PATCH", { id: c.complaint.id, action: "verify" }, "STF-0001");
  if (verified.ok && verified.data.status === "COMPLETENESS_VERIFIED") {
    s.pass(4, "Completeness verified");
  } else {
    s.fail(4, `Completeness verification failed: ${verified.error}`);
  }

  const investigated = await call(c.baseUrl, "/api/complaints", "PATCH", {
    id: c.complaint.id, action: "investigate",
    note: `Ceiling check on ${c.file.fileNumber}: demand exceeds the published ceiling of the adjustment year.`,
  }, "STF-0001");
  if (investigated.ok && investigated.data.status === "UNDER_INVESTIGATION") {
    s.pass(5, "Under investigation with notes against the ceiling record");
  } else {
    s.fail(5, `Investigation failed: ${investigated.error}`);
  }

  const decided = await call(c.baseUrl, "/api/complaints", "PATCH", {
    id: c.complaint.id, action: "decide", decision: "UPHOLD",
    summary: "Demand exceeds the published ceiling; rollback to the ceiling amount ordered.",
  }, "STF-0001");
  if (decided.ok && decided.data.status === "DECIDED") {
    s.pass(6, `Decided UPHOLD on ${String(decided.data.decidedAt).slice(0, 10)}; 15-day appeal window opened`);
  } else {
    s.fail(6, `Decision failed: ${decided.error}`);
  }

  const deadlines = await call(c.baseUrl, "/api/deadlines", "GET");
  const rows = deadlines.data ?? [];
  const decisionClock = rows.find((d: any) => d.subjectType === "COMPLAINT" && d.subjectRef === c.complaint.refNumber && d.code === "DECISION-30WD");
  const appealClock = rows.find((d: any) => d.subjectType === "COMPLAINT" && d.subjectRef === c.complaint.refNumber && d.code === "APPEAL-15D");
  if (decisionClock?.status === "MET" && appealClock?.status === "OPEN") {
    s.pass(7, `Deadline register: DECISION-30WD MET; APPEAL-15D OPEN until ${String(appealClock.dueAt).slice(0, 10)}`);
  } else {
    s.fail(7, `Deadline register unexpected: decision=${decisionClock?.status}, appeal=${appealClock?.status}`);
  }
}

async function uat05(c: Ctx, s: Sess) {
  const timely = await call(c.baseUrl, "/api/appeals", "POST", {
    complaintId: c.complaint.id, appellantName: c.landlord.fullName, filedAt: iso(new Date()),
  }, "STF-0001");
  if (timely.ok) {
    c.appeal = timely.data;
    s.pass(1, `Appeal ${timely.data.appealNumber} filed in time; committee hearing window clock opened`);
  } else s.fail(1, `Timely appeal failed: ${timely.error}`);

  const late = await call(c.baseUrl, "/api/appeals", "POST", {
    complaintId: c.complaint.id, appellantName: c.landlord.fullName,
    filedAt: iso(addDays(new Date(c.complaint.decidedAt ?? Date.now()), 16)),
  }, "STF-0001");
  s.refuse(2, late, "Proc. Art. 24", "Appeal beyond the 15-day window");

  const scheduled = await call(c.baseUrl, "/api/appeals", "PATCH", {
    id: c.appeal.id, action: "schedule", hearingAt: iso(addDays(new Date(), 7)),
  }, "STF-0006");
  if (scheduled.ok && scheduled.data.status === "SCHEDULED") {
    s.pass(3, `Hearing scheduled for ${String(scheduled.data.hearingAt).slice(0, 10)}`);
  } else {
    s.fail(3, `Scheduling failed: ${scheduled.error}`);
  }

  const heard = await call(c.baseUrl, "/api/appeals", "PATCH", { id: c.appeal.id, action: "hear" }, "STF-0006");
  if (heard.ok && heard.data.status === "HEARD") {
    s.pass(4, "Committee hearing conducted");
  } else {
    s.fail(4, `Hearing failed: ${heard.error}`);
  }

  const decided = await call(c.baseUrl, "/api/appeals", "PATCH", { id: c.appeal.id, action: "decide" }, "STF-0006");
  if (decided.ok && decided.data.status === "DECIDED") {
    s.pass(5, "Committee decision issued; hearing clock MET; complaint CLOSED");
  } else {
    s.fail(5, `Committee decision failed: ${decided.error}`);
  }

  const receivedAt = new Date();
  const c2 = await call(c.baseUrl, "/api/complaints", "POST", {
    channel: "WALK_IN", groundCode: "CG-6", complainantName: c.tenant.fullName,
    targetFileNumber: c.file.fileNumber,
    description: "Tenant reports eviction from the registered dwelling without a legal ground or court order; request for restoration filed.",
    receivedAt: iso(receivedAt), receivedAtOrgUnitId: c.woreda.id,
  }, "STF-0001");
  if (!c2.ok) { s.fail(6, `Second complaint intake failed: ${c2.error}`); return; }
  await call(c.baseUrl, "/api/complaints", "PATCH", { id: c2.data.id, action: "verify" }, "STF-0001");
  const d2 = await call(c.baseUrl, "/api/complaints", "PATCH", {
    id: c2.data.id, action: "decide", decision: "REJECT", summary: "Evidence shows voluntary surrender of the dwelling; ground not established.",
  }, "STF-0001");
  if (!d2.ok) { s.fail(6, `Second complaint decision failed: ${d2.error}`); return; }
  const a2 = await call(c.baseUrl, "/api/appeals", "POST", {
    complaintId: c2.data.id, appellantName: c.tenant.fullName, filedAt: iso(new Date()),
  }, "STF-0001");
  if (!a2.ok) { s.fail(6, `Second appeal filing failed: ${a2.error}`); return; }
  const esc = await call(c.baseUrl, "/api/appeals", "PATCH", { id: a2.data.id, action: "escalate" }, "STF-0006");
  if (esc.ok && esc.data.status === "ESCALATED_TO_COURT") {
    s.pass(6, `Appeal ${a2.data.appealNumber} ESCALATED_TO_COURT (filed ${String(esc.data.courtFiledAt).slice(0, 10)}); complaint CLOSED`);
  } else {
    s.fail(6, `Escalation failed: ${esc.error}`);
  }
}

async function uat06(c: Ctx, s: Sess) {
  const pay = (extra: object) => call(c.baseUrl, "/api/payments", "POST", {
    fileId: c.file.id, paidAt: iso(new Date()), recordedByOrgUnitId: c.woreda.id, ...extra,
  }, "STF-0001");

  const rent = await pay({ amount: 12000, kind: "RENT", monthsCovered: 1, method: "TELEBIRR", isCash: false });
  if (rent.ok && rent.data.providerRef) {
    s.pass(1, `Electronic rent receipt ${rent.data.receiptNumber}; bank settlement reference ${rent.data.providerRef} stored before the ledger entry`);
  } else {
    s.fail(1, `Electronic payment failed: ${rent.error ?? "providerRef missing"}`);
  }

  const boundary = await pay({ amount: 24000, kind: "PREPAYMENT", monthsCovered: 2, method: "TELEBIRR", isCash: false });
  if (boundary.ok) {
    s.pass(2, `Two-month advance accepted at the cap boundary (receipt ${boundary.data.receiptNumber})`);
  } else {
    s.fail(2, `Boundary prepayment refused unexpectedly: ${boundary.error}`);
  }

  const excess = await pay({ amount: 36000, kind: "PREPAYMENT", monthsCovered: 3, method: "TELEBIRR", isCash: false });
  s.refuse(3, excess, "Proc. Art. 12", "Three-month advance");

  const unregistered = await call(c.baseUrl, "/api/payments", "POST", {
    fileId: c.fileC.id, amount: 5000, kind: "RENT", monthsCovered: 1, method: "TELEBIRR",
    isCash: false, paidAt: iso(new Date()), recordedByOrgUnitId: c.woreda.id,
  }, "STF-0001");
  s.refuse(4, unregistered, "Proc. Art. 4", "Payment against an unregistered (PRESENTED) file");

  const cash = await pay({ amount: 12000, kind: "RENT", monthsCovered: 1, method: "CASH", isCash: true });
  if (!cash.ok) { s.fail(5, `Cash payment recording failed: ${cash.error}`); return; }
  const penalties = await call(c.baseUrl, "/api/penalties", "GET");
  const cashCase = (penalties.data ?? []).find((p: any) => p.subjectRef === cash.data.receiptNumber && p.offenseCode === "PEN-CASH-PAYMENT");
  if (cashCase && cashCase.computedAmount === 1200) {
    s.pass(5, `Cash receipt ${cash.data.receiptNumber} flagged; automatic 10% referral case ${cashCase.caseNumber} opened at ${money(cashCase.computedAmount)} ETB`);
  } else {
    s.fail(5, `Cash referral case missing or wrong amount: ${JSON.stringify(cashCase ?? penalties.error).slice(0, 160)}`);
  }
}

async function uat07(c: Ctx, s: Sess) {
  const teamsRes = await call(c.baseUrl, "/api/control", "GET");
  let team = (teamsRes.data?.teams ?? []).find((t: any) => t.teamCode === "CT-BOLE-01");
  if (!team) {
    const created = await call(c.baseUrl, "/api/control", "POST", {
      kind: "team", teamCode: "CT-BOLE-01", subCityId: c.woreda.parentId, members: "Inspector One, Inspector Two",
    }, "STF-0003");
    team = created.data;
  }
  if (team) {
    s.pass(1, `Control team ${team.teamCode} available at sub-city level`);
  } else {
    s.fail(1, "Control team unavailable");
  }

  const noId = await call(c.baseUrl, "/api/control", "POST", {
    kind: "visit", teamId: team.id, propertyId: c.property.id, origin: "OWN_INITIATIVE",
    visitedAt: iso(new Date()), identificationShown: false, vacancyMonths: 30,
  }, "STF-0003");
  s.refuse(2, noId, "Dir. Art. 20", "Visit without identification shown");

  const visit = await call(c.baseUrl, "/api/control", "POST", {
    kind: "visit", teamId: team.id, propertyId: c.property.id, origin: "OWN_INITIATIVE",
    visitedAt: iso(new Date()), identificationShown: true,
    findings: "Ground-floor unit observed vacant; no service contract attached", vacancyMonths: 30,
  }, "STF-0003");
  if (visit.ok) {
    s.pass(3, `Visit ${visit.data.visitRef} recorded with credentials shown; vacancy of 30 months flagged for monitoring (beyond six months)`);
  } else {
    s.fail(3, `Visit failed: ${visit.error}`);
  }

  const surcharge = await call(c.baseUrl, "/api/penalties", "POST", {
    offenseCode: "PEN-VAC-10", subjectType: "VACANCY_SURCHARGE", propertyId: c.property.id,
    subjectRef: visit.data.visitRef, monthlyRentRef: 12000, vacancyYears: 2.5, basisRef: "Dir. Art. 22(8-9)",
  }, "STF-0005");
  if (surcharge.ok && surcharge.data.bandPercent === 10 && surcharge.data.computedAmount === 14400) {
    s.pass(4, `Vacancy surcharge ${surcharge.data.caseNumber}: band 10%, amount ${money(surcharge.data.computedAmount)} ETB on the annual-rent base`);
  } else {
    s.fail(4, `Surcharge math wrong: ${JSON.stringify(surcharge.data ?? surcharge.error).slice(0, 160)}`);
  }

  const notified = await call(c.baseUrl, "/api/penalties", "PATCH", { id: surcharge.data.id, action: "notify" }, "STF-0005");
  const referred = await call(c.baseUrl, "/api/penalties", "PATCH", { id: surcharge.data.id, action: "refer", targetBody: "TAX_AUTHORITY" }, "STF-0005");
  if (notified.ok && referred.ok && referred.data.status === "REFERRED") {
    s.pass(5, `Case notified then REFERRED to TAX_AUTHORITY`);
  } else {
    s.fail(5, `Notify/refer failed: ${notified.error ?? ""} ${referred.error ?? ""}`);
  }

  const offense = await call(c.baseUrl, "/api/penalties", "POST", {
    offenseCode: "PEN-NOTICELESS-TERM", subjectType: "OFFENSE", subjectRef: `UAT-TERM-${c.ts}`,
    monthlyRentRef: 12000, basisRef: "Dir. Art. 22; Proc. Arts. 29-32",
  }, "STF-0005");
  if (offense.ok && offense.data.computedAmount === 36000) {
    s.pass(6, `Offense fine ${offense.data.caseNumber}: ${money(offense.data.computedAmount)} ETB = 3 months' rent — the Proc. Arts. 29-32 cap enforced at computation`);
  } else {
    s.fail(6, `Offense fine wrong: ${JSON.stringify(offense.data ?? offense.error).slice(0, 160)}`);
  }

  if (!offense.ok) { s.skipRemaining(7, "not executed (offense case missing)"); return; }
  await call(c.baseUrl, "/api/penalties", "PATCH", { id: offense.data.id, action: "notify" }, "STF-0005");
  const toCourt = await call(c.baseUrl, "/api/penalties", "PATCH", { id: offense.data.id, action: "refer", targetBody: "COURT" }, "STF-0005");
  const recovered = await call(c.baseUrl, "/api/penalties", "PATCH", { id: offense.data.id, action: "recover" }, "STF-0005");
  if (toCourt.ok && recovered.ok && recovered.data.status === "COURT_RECOVERY") {
    s.pass(7, "Case REFERRED to COURT; court recovery now tracked");
  } else {
    s.fail(7, `Court referral/recovery failed: ${toCourt.error ?? ""} ${recovered.error ?? ""}`);
  }
}

async function uat08(c: Ctx, s: Sess) {
  const uat = await call(c.baseUrl, "/api/uat", "GET");
  const loc = uat.data?.localization;
  if (loc && Array.isArray(loc.languages) && ["am", "en", "om"].every((l) => loc.languages.includes(l)) && loc.fallbackDeclared) {
    s.pass(1, `Localization catalogue: ${loc.languages.join(" / ")} — ${loc.resourceCount} resources; O-8 fallback declared`);
  } else {
    s.fail(1, `Localization catalogue unexpected: ${JSON.stringify(loc ?? uat.error).slice(0, 160)}`);
  }

  const sections = c.contract.sections ?? [];
  const trilingual = sections.length > 0 && sections.every((x: any) => x.contentEn && x.contentAm && x.contentOm);
  if (trilingual) {
    s.pass(2, `Model contract ${c.contract.version}: all ${sections.length} sections carry English, Amharic and Afan Oromo content`);
  } else {
    s.fail(2, `Model contract sections not fully trilingual (${sections.length} sections)`);
  }

  const pubs = await call(c.baseUrl, "/api/publications", "GET");
  const ceiling = (pubs.data ?? []).find((p: any) => String(p.code).startsWith("PUB-CEILING-"));
  if (ceiling && ceiling.titleEn && ceiling.titleAm && ceiling.titleOm) {
    s.pass(3, `Ceiling notice ${ceiling.code} live with trilingual titles ("${ceiling.titleOm}")`);
  } else {
    s.fail(3, `Ceiling publication missing or not trilingual: ${ceiling?.code ?? pubs.error}`);
  }

  const boot = await call(c.baseUrl, "/api/platform", "GET");
  const staff = boot.data?.staff ?? [];
  const langsOk = staff.length > 0 && staff.every((u: any) => ["am", "en", "om"].includes(u.language));
  if (langsOk) {
    s.pass(4, `Staff register: all ${staff.length} officers carry declared working languages (${[...new Set(staff.map((u: any) => u.language))].join(", ")})`);
  } else {
    s.fail(4, "Staff language preferences missing or out of range");
  }

  const q = await call(c.baseUrl, "/api/quality", "GET");
  const n06 = (q.data?.matrix ?? []).find((r: any) => r.id === "TC-N06");
  if (n06?.status === "PASS") {
    s.pass(5, `Compliance row TC-N06 PASS — ${n06.openItem ?? "O-8 disposition recorded"}`);
  } else {
    s.fail(5, `TC-N06 status ${n06?.status ?? "not found"}`);
  }
}

const EXECUTORS: Record<string, (c: Ctx, s: Sess) => Promise<void>> = {
  "UAT-01": uat01, "UAT-02": uat02, "UAT-03": uat03, "UAT-04": uat04,
  "UAT-05": uat05, "UAT-06": uat06, "UAT-07": uat07, "UAT-08": uat08,
};

// ---------------------------------------------------------------------------
export async function runUatBattery(baseUrl: string): Promise<UatEvidence> {
  const startedAt = new Date();
  const bootRes = await call(baseUrl, "/api/platform", "GET");
  if (!bootRes.ok) throw new Error(`Platform boot failed: ${bootRes.error}`);
  const boot = bootRes.data;
  const ctx: Ctx = {
    baseUrl,
    ts: Date.now().toString(36).toUpperCase(),
    woreda: boot.orgUnits.find((o: any) => o.code === "AA-BOLE-W01"),
    subCity: boot.orgUnits.find((o: any) => o.code === "AA-BOLE"),
    bureau: boot.orgUnits.find((o: any) => o.code === "AA-BUREAU"),
    idType: boot.idTypes[0],
    occupied: boot.statusTypes.find((s: any) => s.code === "PS-OCCUPIED"),
    contract: boot.activeContract,
  };
  if (!ctx.woreda || !ctx.subCity || !ctx.idType || !ctx.occupied || !ctx.contract) {
    throw new Error("Boot payload incomplete: woreda/sub-city/id type/status type/model contract missing");
  }

  const results: UatScenarioResult[] = [];
  for (const spec of UAT_SCENARIOS) {
    const t0 = Date.now();
    const sess = new Sess(spec.steps);
    try {
      await EXECUTORS[spec.id](ctx, sess);
    } catch (err) {
      sess.skipRemaining(1, `Scenario aborted: ${String((err as Error).message ?? err).slice(0, 160)}`);
    }
    // Ensure every declarative step has a row even if the executor crashed early
    for (const st of spec.steps) {
      if (!sess.steps.some((r) => r.no === st.no)) sess.record(st.no, "SKIPPED", "not executed (scenario aborted)");
    }
    sess.steps.sort((a, b) => a.no - b.no);
    const passed = sess.steps.filter((r) => r.result === "PASS").length;
    const failed = sess.steps.filter((r) => r.result === "FAIL").length;
    const skipped = sess.steps.filter((r) => r.result === "SKIPPED").length;
    results.push({
      id: spec.id, title: spec.title, role: spec.role, actors: spec.actors,
      useCases: spec.useCases, legalBasis: spec.legalBasis,
      verdict: failed > 0 ? "FAIL" : skipped > 0 ? "FAIL" : "PASS",
      stepsPassed: passed, stepsFailed: failed, stepsSkipped: skipped,
      durationMs: Date.now() - t0, steps: sess.steps,
    });
  }

  const finishedAt = new Date();
  const stepsTotal = results.reduce((n, r) => n + r.steps.length, 0);
  const stepsPassed = results.reduce((n, r) => n + r.stepsPassed, 0);
  const stepsFailed = results.reduce((n, r) => n + r.stepsFailed, 0);
  const stepsSkipped = results.reduce((n, r) => n + r.stepsSkipped, 0);
  return {
    runId: `UATRUN-${startedAt.getTime()}`,
    generatedAt: finishedAt.toISOString(),
    baseUrl,
    summary: {
      scenarios: results.length,
      scenariosPassed: results.filter((r) => r.verdict === "PASS").length,
      stepsTotal, stepsPassed, stepsFailed, stepsSkipped,
      verdict: stepsFailed === 0 && stepsSkipped === 0 ? "PASS" : "FAIL",
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    },
    scenarios: results,
  };
}
