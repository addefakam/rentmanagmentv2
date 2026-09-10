// ============================================================================
// service.ts — Phase 4 operational service layer. Multi-step, legally
// load-bearing operations. Each function cites its legal basis. API routes
// stay thin and map LegalError to HTTP 422 with the violated rule.
// ============================================================================

import { db } from "@/lib/db";
import {
  LAW, NINE_POINT_CHECKLIST,
  addCalendarDays, appealDeadline, isAppealFiledInTime,
  cashPenaltyAmount, ceilingAfterAdjustment, certificateNumberFor,
  computeExemptionEndsAt, complaintDecisionDue, effectDate, fileNumberFor,
  isProxyDocumentationComplete, offenseFineAmount, publicationDate,
  registryBookPosition, validateLease, validateWitnesses,
  vacancySurchargeAmount, amendmentWindowEndsAt, committeeHearingDue,
} from "./law";
import { bankGateway } from "@/lib/integration/bank";
import { idService } from "@/lib/integration/idcheck";

export class LegalError extends Error {
  rule: string;
  constructor(rule: string, message: string) {
    super(message);
    this.rule = rule;
  }
}

function requireTrue(cond: unknown, rule: string, message: string): asserts cond {
  if (!cond) throw new LegalError(rule, message);
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");
const yearOf = (d: Date) => d.getUTCFullYear();

// ---------------------------------------------------------------------------
// S1 / M1 — Parties
// ---------------------------------------------------------------------------
export async function createParty(input: {
  type: string; fullName: string; idTypeId: string; idNumber: string;
  idOriginalSeen: boolean; idCopyAttached: boolean;
  phone?: string; address?: string; isDeaf?: boolean; usesSignLanguage?: boolean;
  proxyName?: string; proxyIdNumber?: string; proxyWitness1Name?: string; proxyWitness2Name?: string;
  registeredAtOrgUnitId: string;
  verifyIdentityOnline?: boolean; // Phase 5: national ID service check (Dir. Art. 7)
}) {
  requireTrue(input.idOriginalSeen && input.idCopyAttached, "Dir. Art. 7",
    "Identification original must be presented and a copy attached (original-and-copy rule).");
  if (input.type === "AGENT") {
    requireTrue(isProxyDocumentationComplete(input), "Dir. Art. 7",
      "Agent acting by proxy needs proxy identification and two witness names on the proxy documents.");
  }
  // Phase 5 integration: optional online identity verification. The service
  // answers MATCH / NO_MATCH / DEFERRED; a DEFERRED outcome degrades
  // gracefully (registration continues, manual follow-up flag), per the plan's
  // failure-behaviour requirement.
  let idCheckNote: string | null = null;
  if (input.verifyIdentityOnline) {
    const idType = await db.identificationType.findUnique({ where: { id: input.idTypeId } });
    const verdict = await idService.verify({
      idTypeCode: idType?.code ?? "UNKNOWN", idNumber: input.idNumber, fullName: input.fullName,
    });
    idCheckNote = `${verdict.status}: ${verdict.note} (${verdict.providerRef})`;
  }
  const seq = (await db.party.count()) + 1;
  const party = await db.party.create({
    data: {
      partyCode: `PTY-${pad(seq, 6)}`,
      type: input.type, fullName: input.fullName,
      idTypeId: input.idTypeId, idNumber: input.idNumber,
      idOriginalSeen: input.idOriginalSeen, idCopyAttached: input.idCopyAttached,
      phone: input.phone, address: input.address,
      isDeaf: input.isDeaf ?? false, usesSignLanguage: input.usesSignLanguage ?? false,
      proxyName: input.proxyName, proxyIdNumber: input.proxyIdNumber,
      proxyWitness1Name: input.proxyWitness1Name, proxyWitness2Name: input.proxyWitness2Name,
      registeredAtOrgUnitId: input.registeredAtOrgUnitId,
      documents: input.type === "AGENT"
        ? { create: { docType: "PROXY_LETTER", ref: `PROXY-${input.idNumber}`, originalSeen: true, copyAttached: true } }
        : undefined,
    },
  });
  return { ...party, idCheckNote };
}

export async function verifyParty(partyId: string, decision: "VERIFIED" | "REJECTED") {
  const party = await db.party.findUnique({ where: { id: partyId } });
  requireTrue(party, "Dir. Art. 7", "Party not found.");
  if (decision === "VERIFIED") {
    requireTrue(party!.idOriginalSeen && party!.idCopyAttached, "Dir. Art. 7",
      "Cannot verify: identification original-and-copy rule not satisfied.");
  }
  return db.party.update({ where: { id: partyId }, data: { verificationStatus: decision, verifiedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// S2 / M2 — Properties with exemption clocks (Proc. Art. 10)
// ---------------------------------------------------------------------------
export async function createProperty(input: {
  woredaId: string; landlordId: string; kebele?: string; houseNo?: string; addressNote?: string;
  ownershipEvidence: string; evidenceRef: string; statusTypeId: string;
  rooms: number; areaSqm?: number; statusSetAt: Date;
}) {
  const woreda = await db.orgUnit.findUnique({ where: { id: input.woredaId } });
  requireTrue(woreda && woreda.tier === "WOREDA", "Dir. Art. 6", "Property must be registered at the woreda where the house is located.");
  const landlord = await db.party.findUnique({ where: { id: input.landlordId } });
  requireTrue(landlord && landlord.type === "LANDLORD" && landlord.verificationStatus === "VERIFIED",
    "Proc. Art. 4; Dir. Art. 7", "Landlord must be a verified party before a property can be registered.");
  const statusType = await db.propertyStatusType.findUnique({ where: { id: input.statusTypeId } });
  requireTrue(statusType, "Proc. Art. 2", "Property status type not found.");
  const { endsAt, basis } = computeExemptionEndsAt(statusType!.exemptionMonths, input.statusSetAt);
  const seq = (await db.property.count({ where: { woredaId: input.woredaId } })) + 1;
  const property = await db.property.create({
    data: {
      propertyCode: `PRP-${woreda!.code}-${pad(seq, 4)}`,
      woredaId: input.woredaId, landlordId: input.landlordId,
      subCityId: woreda!.parentId ?? undefined,
      kebele: input.kebele, houseNo: input.houseNo, addressNote: input.addressNote,
      ownershipEvidence: input.ownershipEvidence, evidenceRef: input.evidenceRef,
      statusTypeId: input.statusTypeId, rooms: input.rooms, areaSqm: input.areaSqm,
      statusSetAt: input.statusSetAt, exemptionEndsAt: endsAt ?? undefined, exemptionBasis: basis,
      vacantFrom: statusType!.code === "PS-VACANT" ? input.statusSetAt : undefined,
    },
  });
  return property;
}

// ---------------------------------------------------------------------------
// S3 / M4 — Registration file lifecycle (Proc. Arts. 4, 7; Dir. Arts. 6-9)
// ---------------------------------------------------------------------------
async function nextFileNumber(woredaCode: string, woredaId: string): Promise<string> {
  const year = yearOf(new Date());
  const existing = await db.registrationFile.count({ where: { woredaId, fileNumber: { startsWith: `${woredaCode}/${year}/` } } });
  return fileNumberFor(woredaCode, year, existing + 1);
}

export async function createRegistrationFile(input: {
  woredaId: string; propertyId: string; landlordId: string; tenantId: string; agentId?: string;
  modelContractId: string; monthlyRent: number; leaseStart: Date; leaseEnd: Date;
  prepaymentMonths: number; paymentMethod: string; paymentMethodConfirmed: boolean;
  interpreterUsed: boolean; interpreterName?: string; isLegacy: boolean;
  witnesses: { fullName: string; idTypeId: string; idNumber: string }[];
  enteredByOrgUnitId: string;
}) {
  // Model contract must be the active Bureau version (Proc. Art. 5; Dir. Art. 4)
  const mc = await db.modelContract.findUnique({ where: { id: input.modelContractId } });
  requireTrue(mc, "Proc. Art. 5; Dir. Art. 4", "Model contract version not found.");
  requireTrue(mc!.status === "ACTIVE", "Proc. Art. 5; Dir. Art. 4",
    "Files must be written on the ACTIVE Bureau model contract version.");

  // Parties verified (Proc. Art. 4; Dir. Art. 7)
  for (const [label, id] of [["Landlord", input.landlordId], ["Tenant", input.tenantId]] as const) {
    const p = await db.party.findUnique({ where: { id } });
    requireTrue(p && p.verificationStatus === "VERIFIED", "Proc. Art. 4; Dir. Art. 7",
      `${label} must be a verified party before filing.`);
  }

  // Statutory lease rules (Proc. Arts. 5, 6, 12, 13). Legacy exception:
  // a pre-proclamation contract is registered as it stands under Dir. Art.
  // 8(2) - the Art. 6 minimum-term rule governs new and amended contracts,
  // not the legacy intake, which carries the LEGACY_ART7 annotation instead.
  const city = await db.cityConfig.findFirst({ where: { isActive: true } });
  const v = validateLease({
    leaseStart: input.leaseStart, leaseEnd: input.leaseEnd, monthlyRent: input.monthlyRent,
    prepaymentMonths: input.prepaymentMonths, paymentMethodConfirmed: input.paymentMethodConfirmed,
    minLeaseYears: city?.minLeaseYears ?? LAW.MIN_LEASE_YEARS,
    maxPrepayMonths: city?.maxPrepayMonths ?? LAW.MAX_PREPAYMENT_MONTHS,
  });
  if (!v.ok && !(input.isLegacy && v.rule === "Proc. Art. 6")) throw new LegalError(v.rule, v.message);

  // Witnesses: exactly three (model agreement)
  const w = validateWitnesses(input.witnesses.length);
  if (!w.ok) throw new LegalError(w.rule, w.message);

  // Interpreter flow for deaf parties (Dir. Art. 8(1))
  const deafParty = await db.party.findFirst({
    where: { id: { in: [input.landlordId, input.tenantId] }, isDeaf: true },
  });
  if (deafParty) {
    requireTrue(input.interpreterUsed && !!input.interpreterName, "Dir. Art. 8(1)",
      "A deaf party requires the sign-language interpreter flow with a named interpreter.");
  }

  const woreda = await db.orgUnit.findUnique({ where: { id: input.woredaId } });
  requireTrue(woreda && woreda.tier === "WOREDA", "Dir. Art. 6", "Filing woreda not found.");
  const fileNumber = await nextFileNumber(woreda!.code, input.woredaId);

  const file = await db.registrationFile.create({
    data: {
      fileNumber, woredaId: input.woredaId,
      propertyId: input.propertyId, landlordId: input.landlordId, tenantId: input.tenantId,
      agentId: input.agentId, modelContractId: input.modelContractId,
      monthlyRent: input.monthlyRent, leaseStart: input.leaseStart, leaseEnd: input.leaseEnd,
      prepaymentMonths: input.prepaymentMonths, paymentMethod: input.paymentMethod,
      paymentMethodConfirmed: input.paymentMethodConfirmed,
      interpreterUsed: input.interpreterUsed, interpreterName: input.interpreterName,
      isLegacy: input.isLegacy,
      witnesses: { create: input.witnesses.map((wi, i) => ({ orderNo: i + 1, ...wi })) },
      annotations: input.isLegacy
        ? { create: {
            code: "LEGACY_ART7",
            text: "Pre-proclamation contract: presented within the 30+3 day window of Proc. Art. 7; annotated per Dir. Art. 8(2).",
            annotatedByOrgUnitId: input.enteredByOrgUnitId,
          } }
        : undefined,
    },
  });

  if (input.isLegacy) {
    // Legacy 30+3 day registration clock (Proc. Art. 7; Dir. Art. 8(2))
    await db.deadlineTrack.create({
      data: {
        code: "LEGACY-33D", subjectType: "FILE", subjectRef: fileNumber,
        name: "Legacy contract registration window (30 + 3 days)",
        dueAt: addCalendarDays(new Date(), LAW.REGISTRATION_WINDOW_DAYS + LAW.LEGACY_GRACE_DAYS),
      },
    });
  }
  return file;
}

export async function checkChecklist(fileId: string, items: { orderNo: number; passed: boolean; note?: string }[]) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId } });
  requireTrue(file, "Dir. Art. 6", "File not found.");
  requireTrue(file!.status === "PRESENTED" || file!.status === "CHECKLIST_PASSED", "Dir. Arts. 6-9",
    `Checklist can only be checked on a PRESENTED file (current: ${file!.status}).`);
  for (const it of items) {
    const tpl = NINE_POINT_CHECKLIST.find((c) => c.orderNo === it.orderNo);
    requireTrue(tpl, "Dir. Arts. 6-9", `Checklist item ${it.orderNo} does not exist.`);
    await db.registrationChecklistItem.upsert({
      where: { fileId_orderNo: { fileId, orderNo: it.orderNo } },
      create: { fileId, orderNo: it.orderNo, code: tpl!.code, requirement: tpl!.requirement, passed: it.passed, note: it.note },
      update: { passed: it.passed, note: it.note, checkedAt: new Date() },
    });
  }
  const all = await db.registrationChecklistItem.findMany({ where: { fileId } });
  const allPassed = NINE_POINT_CHECKLIST.every((c) => {
    const row = all.find((a) => a.orderNo === c.orderNo);
    return row?.passed === true;
  });
  if (allPassed) {
    return db.registrationFile.update({ where: { id: fileId }, data: { status: "CHECKLIST_PASSED" } });
  }
  return file!;
}

export async function certifyFile(fileId: string, registrarName: string) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId }, include: { checklist: true } });
  requireTrue(file, "Dir. Art. 9", "File not found.");
  requireTrue(file!.status === "CHECKLIST_PASSED", "Dir. Art. 9",
    "Certification requires the nine-point checklist fully passed.");
  const allPassed = NINE_POINT_CHECKLIST.every((c) =>
    file!.checklist.some((row) => row.orderNo === c.orderNo && row.passed === true));
  requireTrue(allPassed, "Dir. Art. 9", "Certification blocked: checklist has failing items.");
  return db.registrationFile.update({
    where: { id: fileId },
    data: { status: "CERTIFIED", certifiedAt: new Date(), certificateNumber: certificateNumberFor(file!.fileNumber) },
  });
}

export async function stampFile(fileId: string) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId } });
  requireTrue(file, "Dir. Arts. 9-10", "File not found.");
  requireTrue(file!.status === "CERTIFIED", "Dir. Arts. 9-10", "Stamping requires a CERTIFIED file.");
  return db.registrationFile.update({ where: { id: fileId }, data: { status: "STAMPED", stampedAt: new Date() } });
}

export async function registerFile(fileId: string, enteredByName: string) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId } });
  requireTrue(file, "Proc. Art. 4; Dir. Art. 9", "File not found.");
  requireTrue(file!.status === "STAMPED", "Proc. Art. 4; Dir. Art. 9", "Registration requires a STAMPED file.");
  const seq = (await db.registryBookEntry.count({ where: { woredaId: file!.woredaId } })) + 1;
  const pos = registryBookPosition(seq);
  const updated = await db.registrationFile.update({
    where: { id: fileId },
    data: { status: "REGISTERED", registeredAt: new Date() },
  });
  const entry = await db.registryBookEntry.create({
    data: { woredaId: file!.woredaId, pageNumber: pos.pageNumber, entryNumber: pos.entryNumber, fileId, enteredByName },
  });
  // M10: registry change propagates upward (Dir. Art. 13) — enqueue replication
  const batchRef = `REP-${Date.now()}-${seq}`;
  await enqueueReplication(batchRef, file!.woredaId, "REGISTRY_ENTRY", file!.fileNumber,
    `Registered contract ${file!.fileNumber} (book p.${pos.pageNumber}/e.${pos.entryNumber})`);
  // M12: amendment window tracking is created when rates change; legacy clock
  // already created at filing. Registration itself closes the LEGACY clock.
  if (file!.isLegacy) {
    await db.deadlineTrack.updateMany({
      where: { subjectType: "FILE", subjectRef: file!.fileNumber, code: "LEGACY-33D", status: "OPEN" },
      data: { status: "MET", closedAt: new Date() },
    });
  }
  return { file: updated, entry };
}

export async function annotateFile(fileId: string, code: string, text: string, byOrgUnitId: string) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId } });
  requireTrue(file, "Dir. Art. 8(2)", "File not found.");
  requireTrue(["LEGACY_ART7", "AMENDMENT_ART7", "RENEWAL", "TERMINATION", "NOTE"].includes(code),
    "Dir. Art. 8(2)", "Unknown annotation code.");
  const ann = await db.fileAnnotation.create({
    data: { fileId, code, text, annotatedByOrgUnitId: byOrgUnitId },
  });
  if (code === "AMENDMENT_ART7") {
    // Amendment registration window (Proc. Arts. 6-7; Dir. Art. 10)
    const year = yearOf(new Date());
    await db.deadlineTrack.create({
      data: {
        code: "AMENDMENT-30WD", subjectType: "FILE", subjectRef: file!.fileNumber,
        name: "Amendment registration window (30 working days)",
        dueAt: amendmentWindowEndsAt(year), isWorkingDays: true,
      },
    });
  }
  return ann;
}

// ---------------------------------------------------------------------------
// S4 / M5 — Adjustment engine (Proc. Arts. 8-11; Dir. Art. 11)
// ---------------------------------------------------------------------------
export async function createAdjustment(year: number, percentage: number, basisStudy?: string) {
  requireTrue(percentage >= 0 && percentage <= 100, "Proc. Art. 8", "Adjustment percentage must be between 0 and 100.");
  const dup = await db.rentAdjustment.findUnique({ where: { year } });
  requireTrue(!dup, "Proc. Art. 8", `An adjustment for ${year} already exists.`);
  return db.rentAdjustment.create({ data: { year, percentage, basisStudy } });
}

export async function publishAdjustment(id: string, byOrgUnitId: string) {
  const adj = await db.rentAdjustment.findUnique({ where: { id } });
  requireTrue(adj, "Proc. Art. 8", "Adjustment not found.");
  requireTrue(adj!.status === "DRAFT", "Proc. Art. 8; Dir. Art. 11", "Only a DRAFT adjustment can be published.");
  const pub = publicationDate(adj!.year);
  const updated = await db.rentAdjustment.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: pub, publishedByOrgUnitId: byOrgUnitId },
  });
  // Pre-effect amendment registration check window (Dir. Art. 11; CAL-PRE-EFFECT-CHECK)
  await db.deadlineTrack.create({
    data: {
      code: "PRE-EFFECT-CHECK", subjectType: "ADJUSTMENT", subjectRef: String(adj!.year),
      name: "Pre-effect amendment registration check (June window)",
      dueAt: effectDate(adj!.year),
    },
  });
  // Public publication feed (Proc. Art. 8; Art. 18)
  const bureau = await db.orgUnit.findUnique({ where: { code: "AA-BUREAU" } });
  await db.publicationItem.create({
    data: {
      code: `PUB-CEILING-${adj!.year}`, category: "CEILING",
      titleEn: `Rent ceiling adjustment ${adj!.year}: +${adj!.percentage}%`,
      titleAm: `የ${adj!.year} የኪራይ ጣሪያ ማስተካከያ: +${adj!.percentage}%`,
      titleOm: `Guddina daangaa kiraalaa ${adj!.year}: +${adj!.percentage}%`,
      contentEn: `Published June 1, ${adj!.year}. Effective June 30, ${adj!.year}. Basis: ${adj!.basisStudy ?? "Bureau annual study"}.`,
      contentAm: `ሰኔ 1 ቀን ${adj!.year} ታትሞ፣ ሰኔ 30 ቀን ${adj!.year} ሥራ ላይ ይውላል።`,
      contentOm: `Caamsaa 1, ${adj!.year} beeksame; Caamsaa 30, ${adj!.year} irraa hoii seera qabeessa seena.`,
      publishedByOrgUnitId: byOrgUnitId || bureau!.id,
    },
  });
  return updated;
}

export async function effectAdjustment(id: string) {
  const adj = await db.rentAdjustment.findUnique({ where: { id } });
  requireTrue(adj, "Proc. Art. 8", "Adjustment not found.");
  requireTrue(adj!.status === "PUBLISHED", "Proc. Art. 8; Dir. Art. 11", "Only a PUBLISHED adjustment can take effect.");
  const eff = effectDate(adj!.year);
  const updated = await db.rentAdjustment.update({
    where: { id }, data: { status: "EFFECTIVE", effectiveAt: eff },
  });
  // Amendment registration window opens at effect (Proc. Arts. 6-7; Dir. Art. 10)
  await db.deadlineTrack.create({
    data: {
      code: "AMENDMENT-30WD", subjectType: "ADJUSTMENT", subjectRef: String(adj!.year),
      name: "Post-effect amendment registration window (30 working days)",
      dueAt: amendmentWindowEndsAt(adj!.year), isWorkingDays: true,
    },
  });
  return updated;
}

// Ceiling validation for an increase on a registered contract (Proc. Arts. 8-9)
export async function validateIncrease(fileId: string, proposedRent: number) {
  const file = await db.registrationFile.findUnique({ where: { id: fileId } });
  requireTrue(file, "Proc. Arts. 8-9", "File not found.");
  const eff = await db.rentAdjustment.findFirst({ where: { status: "EFFECTIVE" }, orderBy: { year: "desc" } });
  const property = await db.property.findUnique({ where: { id: file!.propertyId } });
  requireTrue(property, "Proc. Art. 10", "Property not found.");
  const applicable = !property!.exemptionEndsAt || property!.exemptionEndsAt.getTime() >= (eff?.effectiveAt?.getTime() ?? Date.now());
  requireTrue(applicable, "Proc. Art. 10",
    "House is within its exemption window; the adjustment regime does not apply yet.");
  if (!eff) return { ok: true, ceiling: file!.monthlyRent, message: "No effective adjustment yet; current rent stands." };
  const ceiling = ceilingAfterAdjustment(file!.monthlyRent, eff.percentage);
  const v = ceilingAfterAdjustment(file!.monthlyRent, eff.percentage) >= proposedRent;
  return {
    ok: v, ceiling,
    rule: v ? undefined : "Proc. Arts. 8-9",
    message: v ? `Within ceiling: ${ceiling}` : `Proposed ${proposedRent} exceeds ceiling ${ceiling} (+${eff.percentage}% for ${eff.year}).`,
  };
}

// ---------------------------------------------------------------------------
// S4 / M6 — Payment ledger (Proc. Arts. 12-14; Dir. Art. 22)
// ---------------------------------------------------------------------------
export async function recordPayment(input: {
  fileId: string; amount: number; kind: string; monthsCovered?: number;
  method: string; isCash: boolean; paidAt: Date; recordedByOrgUnitId: string;
}) {
  const file = await db.registrationFile.findUnique({ where: { id: input.fileId } });
  requireTrue(file, "Proc. Art. 13", "Contract file not found.");
  requireTrue(file!.status === "REGISTERED", "Proc. Art. 4", "Payments attach to REGISTERED contracts.");
  if (input.kind === "PREPAYMENT") {
    requireTrue((input.monthsCovered ?? 0) <= LAW.MAX_PREPAYMENT_MONTHS, "Proc. Art. 12",
      "Prepayment cannot exceed two months' rent.");
  }
  requireTrue(!input.isCash || input.method === "CASH", "Proc. Art. 13", "Inconsistent payment channel flags.");
  // Phase 5 integration (Proc. Art. 13; open item O3): electronic payments
  // settle through the bank/payment gateway BEFORE the ledger entry is
  // written. A decline or timeout raises IntegrationError -> HTTP 424/504 and
  // no receipt is recorded, so the ledger can never diverge from the bank.
  let providerRef: string | null = null;
  if (!input.isCash) {
    const settlement = await bankGateway.initiateTransfer({
      debtorRef: `TENANT-${file!.landlordId.slice(-6)}`, // instrument refs bind at UAT
      creditorRef: "BUREAU-COLLECTION-01",
      amountETB: input.amount,
      reference: `${file!.fileNumber}-${yearOf(input.paidAt)}`,
      method: input.method,
    });
    providerRef = settlement.providerRef;
  }
  const seq = (await db.payment.count()) + 1;
  const payment = await db.payment.create({
    data: {
      receiptNumber: `RCP-${yearOf(input.paidAt)}-${pad(seq, 6)}`,
      fileId: input.fileId, amount: input.amount, kind: input.kind,
      monthsCovered: input.monthsCovered, method: input.method,
      isElectronic: !input.isCash, cashFlag: input.isCash,
      providerRef,
      paidAt: input.paidAt, recordedByOrgUnitId: input.recordedByOrgUnitId,
    },
  });
  if (input.isCash && file!.monthlyRent > 0) {
    // Auto-compute the 10% cash referral case (Dir. Art. 22; Proc. Art. 13)
    await createPenaltyCase({
      offenseCode: "PEN-CASH-PAYMENT", subjectType: "CASH_PAYMENT",
      propertyId: file!.propertyId, subjectRef: payment.receiptNumber,
      monthlyRentRef: file!.monthlyRent, basisRef: "Dir. Art. 22; Proc. Art. 13",
    });
  }
  return payment;
}

// ---------------------------------------------------------------------------
// S5 / M8 — Complaints and appeals (Proc. Arts. 20-26; Dir. Arts. 17-19)
// ---------------------------------------------------------------------------
export async function createComplaint(input: {
  channel: string; groundCode: string; complainantName?: string; complainantPhone?: string;
  propertyId?: string; targetFileNumber?: string; description: string;
  receivedAt: Date; receivedAtOrgUnitId: string;
}) {
  const ground = await db.complaintGroundType.findUnique({ where: { code: input.groundCode } });
  requireTrue(ground, "Dir. Art. 17", "Complaint ground not in the eight-grounds checklist.");
  requireTrue(input.description && input.description.length >= 10, "Dir. Art. 18",
    "A verbal or written statement of the facts is required for the complaint register.");
  const seq = (await db.complaint.count()) + 1;
  const complaint = await db.complaint.create({
    data: {
      refNumber: `CMP-${yearOf(input.receivedAt)}-${pad(seq, 5)}`,
      channel: input.channel, groundCode: input.groundCode,
      complainantName: input.complainantName, complainantPhone: input.complainantPhone,
      propertyId: input.propertyId, targetFileNumber: input.targetFileNumber,
      description: input.description,
      receivedAt: input.receivedAt, receivedAtOrgUnitId: input.receivedAtOrgUnitId,
      decisionDueAt: complaintDecisionDue(input.receivedAt),
    },
  });
  // M12: decision clock — 30 working days (Proc. Art. 22)
  await db.deadlineTrack.create({
    data: {
      code: "DECISION-30WD", subjectType: "COMPLAINT", subjectRef: complaint.refNumber,
      name: "Complaint decision window (30 working days)",
      dueAt: complaintDecisionDue(input.receivedAt), isWorkingDays: true,
    },
  });
  return complaint;
}

export async function progressComplaint(id: string, action: string, payload: { note?: string; decision?: string; summary?: string }) {
  const c = await db.complaint.findUnique({ where: { id } });
  requireTrue(c, "Proc. Arts. 20-22", "Complaint not found.");
  if (action === "verify") {
    requireTrue(c!.status === "INTAKE", "Dir. Art. 18", "Completeness check applies at INTAKE.");
    const ok = (payload.note ?? "complete") !== "incomplete";
    return db.complaint.update({
      where: { id },
      data: ok ? { status: "COMPLETENESS_VERIFIED" } : { status: "REJECTED_INCOMPLETE" },
    });
  }
  if (action === "investigate") {
    requireTrue(c!.status === "COMPLETENESS_VERIFIED", "Dir. Art. 19", "Investigation requires completeness verification.");
    return db.complaint.update({
      where: { id }, data: { status: "UNDER_INVESTIGATION", investigationNotes: payload.note },
    });
  }
  if (action === "decide") {
    requireTrue(["UNDER_INVESTIGATION", "COMPLETENESS_VERIFIED"].includes(c!.status), "Proc. Art. 22",
      "Decision requires investigation stage.");
    requireTrue(["UPHOLD", "PARTIAL", "REJECT"].includes(payload.decision ?? ""), "Proc. Art. 22",
      "Decision must be UPHOLD, PARTIAL or REJECT.");
    const updated = await db.complaint.update({
      where: { id },
      data: { status: "DECIDED", decision: payload.decision, decisionSummary: payload.summary, decidedAt: new Date() },
    });
    // Close the decision clock; open the 15-day appeal window (Proc. Art. 24)
    await db.deadlineTrack.updateMany({
      where: { subjectType: "COMPLAINT", subjectRef: c!.refNumber, code: "DECISION-30WD", status: "OPEN" },
      data: { status: "MET", closedAt: new Date() },
    });
    await db.deadlineTrack.create({
      data: {
        code: "APPEAL-15D", subjectType: "COMPLAINT", subjectRef: c!.refNumber,
        name: "Appeal filing window (15 days)",
        dueAt: appealDeadline(new Date()),
      },
    });
    return updated;
  }
  throw new LegalError("Proc. Arts. 20-22", `Unknown complaint action: ${action}`);
}

export async function fileAppeal(input: { complaintId: string; appellantName: string; filedAt: Date }) {
  const c = await db.complaint.findUnique({ where: { id: input.complaintId } });
  requireTrue(c && c.status === "DECIDED", "Proc. Art. 24", "Appeal requires a decided complaint.");
  requireTrue(isAppealFiledInTime(input.filedAt, c!.decidedAt ?? new Date()), "Proc. Art. 24",
    `Appeal window expired (15 days from decision, deadline ${appealDeadline(c!.decidedAt ?? new Date()).toISOString().slice(0, 10)}).`);
  const seq = (await db.appeal.count()) + 1;
  const appeal = await db.appeal.create({
    data: {
      complaintId: input.complaintId,
      appealNumber: `APL-${yearOf(input.filedAt)}-${pad(seq, 5)}`,
      appellantName: input.appellantName, filedAt: input.filedAt,
    },
  });
  // Committee hearing clock (configuration window; O1 note)
  await db.deadlineTrack.create({
    data: {
      code: "COMMITTEE-30D", subjectType: "APPEAL", subjectRef: appeal.appealNumber,
      name: "Committee hearing window",
      dueAt: committeeHearingDue(input.filedAt),
    },
  });
  return appeal;
}

export async function progressAppeal(id: string, action: string, payload: { hearingAt?: Date; decision?: string; courtFiledAt?: Date }) {
  const a = await db.appeal.findUnique({ where: { id } });
  requireTrue(a, "Proc. Arts. 24-26", "Appeal not found.");
  if (action === "schedule") {
    requireTrue(a!.status === "FILED", "Proc. Art. 25", "Only a FILED appeal can be scheduled.");
    return db.appeal.update({ where: { id }, data: { status: "SCHEDULED", hearingAt: payload.hearingAt } });
  }
  if (action === "hear") {
    requireTrue(a!.status === "SCHEDULED", "Proc. Art. 25", "Committee hearing requires SCHEDULED status.");
    return db.appeal.update({ where: { id }, data: { status: "HEARD" } });
  }
  if (action === "decide") {
    requireTrue(a!.status === "HEARD", "Proc. Art. 25", "Committee decision requires a hearing.");
    const updated = await db.appeal.update({
      where: { id }, data: { status: "DECIDED", committeeDecision: payload.decision, decidedAt: new Date() },
    });
    await db.deadlineTrack.updateMany({
      where: { subjectType: "APPEAL", subjectRef: a!.appealNumber, code: "COMMITTEE-30D", status: "OPEN" },
      data: { status: "MET", closedAt: new Date() },
    });
    await db.complaint.update({ where: { id: a!.complaintId }, data: { status: "CLOSED" } });
    return updated;
  }
  if (action === "escalate") {
    // Court escalation (Proc. Arts. 25-26)
    const updated = await db.appeal.update({
      where: { id }, data: { status: "ESCALATED_TO_COURT", courtFiledAt: payload.courtFiledAt ?? new Date() },
    });
    await db.complaint.update({ where: { id: a!.complaintId }, data: { status: "CLOSED" } });
    return updated;
  }
  throw new LegalError("Proc. Arts. 24-26", `Unknown appeal action: ${action}`);
}

// ---------------------------------------------------------------------------
// S6 / M7 — Control visits (Proc. Art. 20; Dir. Art. 20)
// ---------------------------------------------------------------------------
export async function createControlTeam(input: { teamCode: string; subCityId: string; members: string }) {
  const sc = await db.orgUnit.findUnique({ where: { id: input.subCityId } });
  requireTrue(sc && sc.tier === "SUB_CITY", "Dir. Art. 20", "Control teams are organized at sub-city level.");
  return db.controlTeam.create({ data: input });
}

export async function recordControlVisit(input: {
  teamId: string; propertyId: string; origin: string; visitedAt: Date;
  identificationShown: boolean; findings?: string; violations?: string; vacancyMonths?: number;
}) {
  requireTrue(input.identificationShown, "Dir. Art. 20", "Control teams must present their identification during control.");
  const team = await db.controlTeam.findUnique({ where: { id: input.teamId } });
  requireTrue(team, "Dir. Art. 20", "Control team not found.");
  const seq = (await db.controlVisit.count()) + 1;
  const visit = await db.controlVisit.create({
    data: { visitRef: `VIS-${yearOf(input.visitedAt)}-${pad(seq, 5)}`, ...input },
  });
  // Vacancy monitoring beyond six months (Dir. Art. 20)
  if ((input.vacancyMonths ?? 0) > LAW.VACANCY_MONITOR_MONTHS) {
    await db.property.update({
      where: { id: input.propertyId },
      data: { vacantFrom: input.visitedAt },
    });
  }
  return visit;
}

// ---------------------------------------------------------------------------
// S6 / M9 — Penalty ladder (Proc. Arts. 29-32; Dir. Art. 22)
// ---------------------------------------------------------------------------
export async function createPenaltyCase(input: {
  offenseCode: string; subjectType: string; propertyId?: string; subjectRef?: string;
  monthlyRentRef?: number; vacancyYears?: number; basisRef: string;
}) {
  const offense = await db.penaltyParameter.findUnique({ where: { code: input.offenseCode } });
  requireTrue(offense, "Proc. Arts. 29-32", "Offense code not in the penalty ladder.");
  let amount = 0; let bandPercent: number | null = null; let capped = false;
  if (offense!.category === "SURCHARGE_BAND") {
    requireTrue(input.monthlyRentRef && input.vacancyYears, "Dir. Art. 22(8-9)",
      "Vacancy surcharge needs the monthly rent reference and observed vacancy years.");
    const { band, amount: amt } = vacancySurchargeAmount(input.monthlyRentRef!, input.vacancyYears!);
    amount = amt; bandPercent = band.percent;
  } else if (offense!.category === "REFERRAL_RULE") {
    requireTrue(input.monthlyRentRef, "Dir. Art. 22", "Cash referral needs the monthly rent reference.");
    amount = cashPenaltyAmount(input.monthlyRentRef!);
  } else {
    requireTrue(input.monthlyRentRef, "Dir. Art. 22", "Fine computation needs the monthly rent reference.");
    const r = offenseFineAmount(input.monthlyRentRef!, offense!.valueMin ?? 1);
    amount = r.amount; capped = r.capped;
  }
  // Numbering derives from the highest existing sequence for the year, not
  // from row count: deletions must never cause a case-number collision.
  const prefix = `PNC-${yearOf(new Date())}-`;
  const numbers = await db.penaltyCase.findMany({
    where: { caseNumber: { startsWith: prefix } }, select: { caseNumber: true },
  });
  const maxSeq = numbers.reduce((m, c) => Math.max(m, parseInt(c.caseNumber.slice(prefix.length), 10) || 0), 0);
  const seq = maxSeq + 1;
  return db.penaltyCase.create({
    data: {
      caseNumber: `${prefix}${pad(seq, 5)}`,
      offenseCode: input.offenseCode, subjectType: input.subjectType,
      propertyId: input.propertyId, subjectRef: input.subjectRef,
      monthlyRentRef: input.monthlyRentRef, bandPercent,
      computedAmount: amount, capApplied: capped, basisRef: input.basisRef,
    },
  });
}

export async function progressPenaltyCase(id: string, action: string, payload: { targetBody?: string }) {
  const p = await db.penaltyCase.findUnique({ where: { id } });
  requireTrue(p, "Proc. Arts. 29-32", "Penalty case not found.");
  if (action === "notify") {
    requireTrue(p!.status === "COMPUTED", "Proc. Arts. 29-32", "Only a COMPUTED case can be notified.");
    return db.penaltyCase.update({ where: { id }, data: { status: "NOTIFIED", notifiedAt: new Date() } });
  }
  if (action === "pay") {
    requireTrue(p!.status === "NOTIFIED", "Proc. Arts. 29-32", "Payment requires prior notification.");
    return db.penaltyCase.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  }
  if (action === "refer") {
    requireTrue(["NOTIFIED", "COMPUTED"].includes(p!.status), "Dir. Art. 22", "Referral requires an open case.");
    requireTrue(["TAX_AUTHORITY", "ENFORCEMENT_BODY", "COURT"].includes(payload.targetBody ?? ""),
      "Dir. Art. 22", "Referral target must be TAX_AUTHORITY, ENFORCEMENT_BODY or COURT.");
    const updated = await db.penaltyCase.update({ where: { id }, data: { status: "REFERRED" } });
    await db.referral.create({ data: { penaltyCaseId: id, targetBody: payload.targetBody! } });
    return updated;
  }
  if (action === "recover") {
    requireTrue(p!.status === "REFERRED", "Proc. Arts. 29-32", "Court recovery applies to referred cases.");
    return db.penaltyCase.update({ where: { id }, data: { status: "COURT_RECOVERY" } });
  }
  if (action === "close") {
    return db.penaltyCase.update({ where: { id }, data: { status: "CLOSED" } });
  }
  throw new LegalError("Proc. Arts. 29-32", `Unknown penalty action: ${action}`);
}

// ---------------------------------------------------------------------------
// S7 / M10 — Replication and backup (Dir. Art. 13)
// ---------------------------------------------------------------------------
export async function enqueueReplication(batchRef: string, fromOrgUnitId: string, recordType: string, recordRef: string, summary?: string) {
  const from = await db.orgUnit.findUnique({ where: { id: fromOrgUnitId }, include: { parent: true } });
  requireTrue(from, "Dir. Art. 13", "Source org unit not found.");
  const hops: { toId: string; hopOrder: number }[] = [];
  let cursor = from!;
  let hop = 1;
  while (cursor.parentId && hop <= 3) {
    hops.push({ toId: cursor.parentId, hopOrder: hop });
    const parent = await db.orgUnit.findUnique({ where: { id: cursor.parentId }, include: { parent: true } });
    cursor = parent!;
    hop++;
  }
  requireTrue(hops.length > 0, "Dir. Art. 13", "Unit is already at the top of the chain (Ministry).");
  const rows = [];
  for (const h of hops) {
    rows.push(await db.replicationLog.create({
      data: { batchRef, fromOrgUnitId, toOrgUnitId: h.toId, hopOrder: h.hopOrder, recordType, recordRef, payloadSummary: summary, status: "PROPAGATED" },
    }));
  }
  return rows;
}

export async function runBackup(input: { environmentId: string; type: string; location: string }) {
  const env = await db.environment.findUnique({ where: { id: input.environmentId } });
  requireTrue(env, "Dir. Art. 13", "Environment not found.");
  const completed = new Date();
  const rpoMet = env.rpoMinutes == null ? null : true;
  return db.backupRun.create({
    data: {
      environmentId: input.environmentId, type: input.type,
      completedAt: completed, status: "SUCCEEDED", location: input.location,
      rpoMinutesMet: rpoMet, notes: `Backup per environment scheme: ${env.backupScheme}`,
    },
  });
}

// ---------------------------------------------------------------------------
// S7 / M11 — Aggregation and publication (Proc. Art. 18; Dir. Art. 13)
// ---------------------------------------------------------------------------
export async function computeSnapshot(orgUnitId: string, period: string) {
  const org = await db.orgUnit.findUnique({ where: { id: orgUnitId } });
  requireTrue(org, "Dir. Art. 13", "Org unit not found.");
  const descendantIds = await descendantOrgIds(org!);
  const inScope = (woredaIds: string[]) => ({ woredaId: { in: woredaIds } });

  const contractsRegistered = await db.registrationFile.count({
    where: { ...inScope(descendantIds.woredaIds), status: "REGISTERED",
      registeredAt: { gte: new Date(`${period}-01T00:00:00Z`), lt: new Date(nextPeriodStart(period)) } },
  });
  const activeFiles = await db.registrationFile.count({
    where: { ...inScope(descendantIds.woredaIds), status: "REGISTERED" },
  });
  const complaintsReceived = await db.complaint.count({
    where: { receivedAtOrgUnitId: { in: descendantIds.allIds },
      receivedAt: { gte: new Date(`${period}-01T00:00:00Z`), lt: new Date(nextPeriodStart(period)) } },
  });
  const complaintsDecided = await db.complaint.count({
    where: { receivedAtOrgUnitId: { in: descendantIds.allIds }, status: { in: ["DECIDED", "CLOSED"] } },
  });
  const penAgg = await db.penaltyCase.aggregate({
    where: { propertyId: null, status: { in: ["NOTIFIED", "PAID", "REFERRED", "COURT_RECOVERY"] } },
    _sum: { computedAmount: true },
  });
  const penaltiesImposed = penAgg._sum.computedAmount ?? 0;
  return db.aggregationSnapshot.upsert({
    where: { orgUnitId_period: { orgUnitId, period } },
    create: {
      orgUnitId, period, sourceTier: org!.tier,
      contractsRegistered, activeFiles, complaintsReceived, complaintsDecided, penaltiesImposed,
    },
    update: {
      sourceTier: org!.tier, contractsRegistered, activeFiles,
      complaintsReceived, complaintsDecided, penaltiesImposed, computedAt: new Date(),
    },
  });
}

function nextPeriodStart(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${pad(nm, 2)}-01T00:00:00Z`;
}

async function descendantOrgIds(org: { id: string; tier: string; parentId: string | null }): Promise<{ allIds: string[]; woredaIds: string[] }> {
  const allIds: string[] = [org.id];
  const woredaIds: string[] = [];
  if (org.tier === "WOREDA") woredaIds.push(org.id);
  let frontier = [org.id];
  for (let depth = 0; depth < 3 && frontier.length; depth++) {
    const children = await db.orgUnit.findMany({ where: { parentId: { in: frontier } } });
    frontier = [];
    for (const c of children) {
      allIds.push(c.id);
      if (c.tier === "WOREDA") woredaIds.push(c.id);
      frontier.push(c.id);
    }
  }
  return { allIds, woredaIds };
}

// ---------------------------------------------------------------------------
// S2 / M3 — Model contract studio: Bureau amendment creates a new version
// (Proc. Art. 5; Dir. Art. 4)
// ---------------------------------------------------------------------------
export async function amendModelContract(input: {
  baseContractId: string; newVersion: string; note: string;
  changes: { sectionCode: string; contentEn?: string; contentAm?: string; contentOm?: string }[];
}) {
  const base = await db.modelContract.findUnique({ where: { id: input.baseContractId }, include: { sections: true } });
  requireTrue(base, "Proc. Art. 5; Dir. Art. 4", "Base model contract not found.");
  requireTrue(base!.status === "ACTIVE", "Proc. Art. 5; Dir. Art. 4", "Only the ACTIVE version can be amended.");
  requireTrue(input.changes.length > 0, "Dir. Art. 4", "An amendment must change at least one section.");
  const dup = await db.modelContract.findUnique({ where: { version: input.newVersion } });
  requireTrue(!dup, "Dir. Art. 4", `Version ${input.newVersion} already exists.`);
  const next = await db.modelContract.create({
    data: {
      version: input.newVersion, status: "ACTIVE", issuedBy: base!.issuedBy,
      legalBasis: base!.legalBasis, effectiveFrom: new Date(),
      canonicalLang: base!.canonicalLang,
      sections: {
        create: base!.sections.map((s) => {
          const ch = input.changes.find((c) => c.sectionCode === s.code);
          return {
            orderNo: s.orderNo, code: s.code,
            titleEn: s.titleEn, titleAm: s.titleAm, titleOm: s.titleOm,
            contentEn: ch?.contentEn ?? s.contentEn,
            contentAm: ch?.contentAm ?? s.contentAm,
            contentOm: ch?.contentOm ?? s.contentOm,
            certificationStatus: ch ? "PENDING_LEGAL_REVIEW" : s.certificationStatus,
            legalBasis: s.legalBasis,
          };
        }),
      },
    },
  });
  await db.modelContract.update({ where: { id: base!.id }, data: { status: "SUPERSEDED" } });
  return next;
}

// ---------------------------------------------------------------------------
// M12 — Deadline sweep: mark overdue clocks (escalation duty, Dir. Art. 19)
// ---------------------------------------------------------------------------
export async function sweepDeadlines() {
  const now = new Date();
  const open = await db.deadlineTrack.findMany({ where: { status: "OPEN" } });
  let swept = 0;
  for (const d of open) {
    if (d.dueAt.getTime() < now.getTime()) {
      await db.deadlineTrack.update({ where: { id: d.id }, data: { status: "OVERDUE", escalated: true } });
      swept++;
    }
  }
  return { swept, openRemaining: open.length - swept };
}
