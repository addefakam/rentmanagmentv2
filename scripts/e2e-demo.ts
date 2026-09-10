// ============================================================================
// e2e-demo.ts — Phase 4 end-to-end walkthrough over the HTTP API layer.
// Exercises the golden path of every sprint increment S1-S7 and leaves the
// demonstration dataset in the database for console review.
// Run: bunx tsx scripts/e2e-demo.ts
// ============================================================================

const BASE = "http://localhost:3000";

async function api(path: string, method: string, payload?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!json.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json.rule ? `[${json.rule}] ` : ""}${json.error}`);
  }
  return json.data;
}

let pass = 0;
function step(name: string, assert?: () => void) {
  if (assert) assert();
  pass++;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const boot = await api("/api/platform", "GET");
  const woreda = boot.orgUnits.find((o: { code: string }) => o.code === "AA-BOLE-W01");
  const bureau = boot.orgUnits.find((o: { code: string }) => o.code === "AA-BUREAU");
  const idType = boot.idTypes[0];
  const contract = boot.activeContract;
  if (!woreda || !idType || !contract || !bureau) throw new Error("boot payload incomplete");
  console.log("S1 · M13/M1 — parties and admin");

  const landlord = await api("/api/parties", "POST", {
    type: "LANDLORD", fullName: "Abebe Kebede", idTypeId: idType.id, idNumber: "KL-100201",
    idOriginalSeen: true, idCopyAttached: true, phone: "0911000001",
    registeredAtOrgUnitId: woreda.id,
  });
  step(`landlord ${landlord.partyCode}`);
  const tenant = await api("/api/parties", "POST", {
    type: "TENANT", fullName: "Tsion Alemu", idTypeId: idType.id, idNumber: "TN-773402",
    idOriginalSeen: true, idCopyAttached: true, phone: "0911000002",
    registeredAtOrgUnitId: woreda.id,
  });
  step(`tenant ${tenant.partyCode}`);
  const vLandlord = await api(`/api/parties/${landlord.id}`, "PATCH", { decision: "VERIFIED" });
  const vTenant = await api(`/api/parties/${tenant.id}`, "PATCH", { decision: "VERIFIED" });
  step("registrar verification acts", () => {
    if (vLandlord.verificationStatus !== "VERIFIED" || vTenant.verificationStatus !== "VERIFIED") throw new Error("verification failed");
  });

  console.log("S2 · M2 — property with exemption clock");
  const occupied = boot.statusTypes.find((s: { code: string }) => s.code === "PS-OCCUPIED")!;
  const property = await api("/api/properties", "POST", {
    woredaId: woreda.id, landlordId: landlord.id, kebele: "08", houseNo: "241",
    ownershipEvidence: "HOLDING_CERT", evidenceRef: "HC-2009-88231",
    statusTypeId: occupied.id, rooms: 3, areaSqm: 96, statusSetAt: "2024-06-01",
  });
  step(`property ${property.propertyCode} (occupied: no clock)`, () => {
    if (property.exemptionEndsAt !== null) throw new Error("occupied property must have no exemption clock");
  });

  console.log("S3 · M4 — registration workflow to REGISTERED");
  const file = await api("/api/registration-files", "POST", {
    woredaId: woreda.id, propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id,
    modelContractId: contract.id, monthlyRent: 12000,
    leaseStart: "2026-09-01", leaseEnd: "2028-09-01", prepaymentMonths: 1,
    paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
    interpreterUsed: false, isLegacy: false,
    witnesses: [
      { fullName: "Witness One", idTypeId: idType.id, idNumber: "W-001" },
      { fullName: "Witness Two", idTypeId: idType.id, idNumber: "W-002" },
      { fullName: "Witness Three", idTypeId: idType.id, idNumber: "W-003" },
    ],
  });
  step(`file ${file.fileNumber} presented`);
  // Legal gate: a 1-year lease must be rejected
  let rejected = false;
  try {
    await api("/api/registration-files", "POST", {
      woredaId: woreda.id, propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id,
      modelContractId: contract.id, monthlyRent: 9000,
      leaseStart: "2026-09-01", leaseEnd: "2027-08-31", prepaymentMonths: 0,
      paymentMethod: "TELEBIRR", paymentMethodConfirmed: true,
      witnesses: [
        { fullName: "W1", idTypeId: idType.id, idNumber: "A" },
        { fullName: "W2", idTypeId: idType.id, idNumber: "B" },
        { fullName: "W3", idTypeId: idType.id, idNumber: "C" },
      ],
    });
  } catch (e) {
    rejected = String(e).includes("Art. 6");
  }
  step("1-year lease rejected by Proc. Art. 6 gate", () => { if (!rejected) throw new Error("short lease was NOT rejected"); });
  const items = Array.from({ length: 9 }, (_, i) => ({ orderNo: i + 1, passed: true }));
  const checked = await api(`/api/registration-files/${file.id}`, "PATCH", { action: "check", items });
  step("nine-point checklist passed", () => { if (checked.status !== "CHECKLIST_PASSED") throw new Error(`status ${checked.status}`); });
  const certified = await api(`/api/registration-files/${file.id}`, "PATCH", { action: "certify" });
  step(`certified ${certified.certificateNumber}`);
  const stamped = await api(`/api/registration-files/${file.id}`, "PATCH", { action: "stamp" });
  step("stamped at the stamping desk");
  const registered = await api(`/api/registration-files/${file.id}`, "PATCH", { action: "register" });
  step(`registered in book p.${registered.entry.pageNumber}/e.${registered.entry.entryNumber} + replication enqueued`);

  console.log("S4 · M5/M6 — adjustments and payment ledger");
  const pay1 = await api("/api/payments", "POST", {
    fileId: registered.file.id, amount: 12000, kind: "RENT", monthsCovered: 1,
    method: "TELEBIRR", isCash: false, paidAt: new Date().toISOString(),
    recordedByOrgUnitId: woreda.id,
  });
  step(`electronic rent ${pay1.receiptNumber}`);
  let cashCaseCount = 0;
  const pay2 = await api("/api/payments", "POST", {
    fileId: registered.file.id, amount: 12000, kind: "RENT", monthsCovered: 1,
    method: "CASH", isCash: true, paidAt: new Date().toISOString(),
    recordedByOrgUnitId: woreda.id,
  });
  step(`cash payment ${pay2.receiptNumber} flagged`);
  const penalties1 = await api("/api/penalties", "GET");
  cashCaseCount = penalties1.filter((p: { subjectRef: string; offenseCode: string }) => p.subjectRef === pay2.receiptNumber && p.offenseCode === "PEN-CASH-PAYMENT").length;
  step("10% cash referral auto-computed (Dir. Art. 22)", () => { if (cashCaseCount !== 1) throw new Error("cash case missing"); });
  let prepayRejected = false;
  try {
    await api("/api/payments", "POST", {
      fileId: registered.file.id, amount: 36000, kind: "PREPAYMENT", monthsCovered: 3,
      method: "TELEBIRR", isCash: false, paidAt: new Date().toISOString(), recordedByOrgUnitId: woreda.id,
    });
  } catch (e) { prepayRejected = String(e).includes("Art. 12"); }
  step("3-month prepayment rejected by Proc. Art. 12 gate", () => { if (!prepayRejected) throw new Error("excess prepayment NOT rejected"); });

  // Re-runnable: reuse this year's adjustment if a previous run created it
  const adjYear = new Date().getUTCFullYear();
  let adj = null as null | { id: string; year: number; percentage: number; status: string };
  try {
    adj = await api("/api/adjustments", "POST", { year: adjYear, percentage: 8, basisStudy: "Bureau annual market study" });
    step(`adjustment ${adjYear} drafted (+${adj.percentage}%)`);
  } catch {
    const all = await api("/api/adjustments", "GET");
    adj = all.find((a: { year: number }) => a.year === adjYear);
    step(`adjustment ${adjYear} reused (${adj.status})`);
  }
  if (adj.status === "DRAFT") {
    const published = await api("/api/adjustments", "PATCH", { id: adj.id, action: "publish" });
    step(`published June 1 (${published.status}) — pre-effect check window opened`);
    adj = published;
  }
  if (adj.status === "PUBLISHED") {
    const effected = await api("/api/adjustments", "PATCH", { id: adj.id, action: "effect" });
    step(`effective June 30 (${effected.status}) — amendment window opened`);
    adj = effected;
  }
  const vCheck = await api("/api/adjustments", "POST", { action: "validate-increase", fileId: registered.file.id, proposedRent: 12500 });
  step(`increase validation: ${vCheck.message}`, () => { if (!vCheck.ok || vCheck.ceiling !== 12960) throw new Error("ceiling math wrong"); });
  let overCeiling = false;
  try {
    await api("/api/adjustments", "POST", { action: "validate-increase", fileId: registered.file.id, proposedRent: 14000 });
  } catch (e) { overCeiling = true; }
  // validate-increase returns ok:false payload, not an error — call again and inspect
  const overCheck = await api("/api/adjustments", "POST", { action: "validate-increase", fileId: registered.file.id, proposedRent: 14000 });
  overCeiling = overCheck.ok === false;
  step("over-ceiling increase blocked (Proc. Arts. 8-9)", () => { if (!overCeiling) throw new Error("over-ceiling increase NOT blocked"); });

  console.log("S5 · M8/M12 — complaint pipeline with statutory clocks");
  const complaint = await api("/api/complaints", "POST", {
    channel: "TELEPHONE", groundCode: "CG-1", complainantName: "Tsion Alemu",
    complainantPhone: "0911000002", targetFileNumber: registered.file.fileNumber,
    description: "Landlord demands 14000 ETB after the new ceiling was published; rent is above the published ceiling.",
    receivedAt: new Date().toISOString(), receivedAtOrgUnitId: woreda.id,
  });
  step(`complaint ${complaint.refNumber} — decision clock opened`);
  await api("/api/complaints", "PATCH", { id: complaint.id, action: "verify" });
  await api("/api/complaints", "PATCH", { id: complaint.id, action: "investigate", note: "Ceiling check confirms demand exceeds 12,960 ETB ceiling" });
  const decided = await api("/api/complaints", "PATCH", { id: complaint.id, action: "decide", decision: "UPHOLD", summary: "Demand exceeds published ceiling; rollback ordered" });
  step(`decided ${decided.decision} — 15-day appeal window opened`);
  const appeal = await api("/api/appeals", "POST", {
    complaintId: complaint.id, appellantName: "Abebe Kebede", filedAt: new Date().toISOString(),
  });
  step(`appeal ${appeal.appealNumber} filed in time`);
  await api("/api/appeals", "PATCH", { id: appeal.id, action: "schedule" });
  await api("/api/appeals", "PATCH", { id: appeal.id, action: "hear" });
  const appealDecided = await api("/api/appeals", "PATCH", { id: appeal.id, action: "decide" });
  step(`committee decided (${appealDecided.status})`);
  const sweep = await api("/api/deadlines", "POST");
  step(`deadline sweep: ${sweep.swept} overdue, ${sweep.openRemaining} open`);

  console.log("S6 · M7/M9 — control visits and penalty ladder");
  // Re-runnable: reuse the demo team when a previous run created it
  const allTeams = await api("/api/control", "GET");
  const team = allTeams.teams.find((t: { teamCode: string }) => t.teamCode === "CT-BOLE-01")
    ?? await api("/api/control", "POST", { kind: "team", teamCode: "CT-BOLE-01", subCityId: woreda.parentId, members: "Inspector One, Inspector Two" });
  step(`control team ${team.teamCode} formed`);
  const visit = await api("/api/control", "POST", {
    kind: "visit", teamId: team.id, propertyId: property.id, origin: "OWN_INITIATIVE",
    visitedAt: new Date().toISOString(), identificationShown: true,
    findings: "Second unit vacant, no service contract attached", vacancyMonths: 30,
  });
  step(`visit ${visit.visitRef} — vacancy beyond 6 months monitored`);
  const vac = await api("/api/penalties", "POST", {
    offenseCode: "PEN-VAC-10", subjectType: "VACANCY_SURCHARGE",
    propertyId: property.id, subjectRef: visit.visitRef,
    monthlyRentRef: 12000, vacancyYears: 2.5, basisRef: "Dir. Art. 22(8-9)",
  });
  step(`vacancy surcharge ${vac.caseNumber}: ${vac.computedAmount} ETB at ${vac.bandPercent}%`, () => {
    if (vac.bandPercent !== 10 || vac.computedAmount !== 14400) throw new Error("band math wrong");
  });
  const cashCase = penalties1.find((p: { subjectRef: string; offenseCode: string }) => p.subjectRef === pay2.receiptNumber && p.offenseCode === "PEN-CASH-PAYMENT");
  const notified = await api("/api/penalties", "PATCH", { id: cashCase.id, action: "notify" });
  const paid = await api("/api/penalties", "PATCH", { id: cashCase.id, action: "pay" });
  step(`cash penalty ${paid.status} (${notified.computedAmount} ETB = 10%)`);
  const referred = await api("/api/penalties", "PATCH", { id: vac.id, action: "refer", targetBody: "TAX_AUTHORITY" });
  step(`vacancy surcharge referred to TAX_AUTHORITY (${referred.status})`);

  console.log("S7 · M10/M11 — replication, backup, aggregation, publication");
  const reps = await api("/api/replication", "POST", {
    fromOrgUnitId: woreda.id, recordType: "COMPLAINT", recordRef: complaint.refNumber,
    summary: "Complaint register upward propagation",
  });
  step(`replication ${reps.length} hops: ${reps.map((r: { hopOrder: number }) => r.hopOrder).join("→")}`);
  const env = boot.environments.find((e: { stage: string }) => e.stage === "PROD");
  const backup = await api("/api/backups", "POST", { environmentId: env.id, type: "FULL", location: "PROD vault" });
  step(`backup on ${env.stage} succeeded`, () => { if (backup.status !== "SUCCEEDED") throw new Error("backup not succeeded"); });
  const snapshot = await api("/api/analytics", "POST", { orgUnitId: bureau.id, period: "2026-09" });
  step(`bureau snapshot ${snapshot.period}: ${snapshot.contractsRegistered} registered, ${snapshot.complaintsReceived} received`);
  const pub = await api("/api/publications", "POST", {
    code: `PUB-STAT-${Date.now()}`, category: "STATISTICS",
    titleEn: "Monthly statistics: registrations and disputes",
    titleAm: "ወርሃዊ መረጃ: ምዝገባዎች እና ክስተቶች",
    titleOm: "Caasaaf Ji'ootaa: galmeewwan fi dhiphina",
    contentEn: "Aggregated tier statistics published per Proc. Art. 18.",
  });
  step(`publication ${pub.code} live in the public feed`);

  const final = await api("/api/platform", "GET");
  console.log("\nE2E COMPLETE — platform counts:");
  console.log(`  parties=${final.counts.parties} properties=${final.counts.properties} files=${final.counts.files} registered=${final.counts.registeredFiles} payments=${final.counts.payments} complaints=${final.counts.complaints} appeals=${final.counts.appeals} penalties=${final.counts.penalties} deadlines=${final.counts.deadlines}`);
  console.log(`  ${pass} checks passed`);
}

main().catch((err) => {
  console.error("E2E FAILED:", err.message);
  process.exit(1);
});
