// ============================================================================
// tests/integration.test.ts — Phase 5 integration testing against the bank /
// payment sandbox and the identification service, including the plan-mandated
// failure and timeout behaviour (plan §5.6; SRS open item O3).
// Run: bun test tests/integration.test.ts
// ============================================================================

import { describe, it, expect, beforeAll } from "bun:test";

import { db } from "../src/lib/db";
import {
  createParty, verifyParty, createProperty, createRegistrationFile,
  checkChecklist, certifyFile, stampFile, registerFile, recordPayment,
} from "../src/lib/domain/service";
import { MockBankGateway, currentBankMode, IntegrationError } from "../src/lib/integration/bank";
import { MockIdService, currentIdMode } from "../src/lib/integration/idcheck";
import { LAW, NINE_POINT_CHECKLIST } from "../src/lib/domain/law";

const day = (n: number) => new Date(Date.now() + n * 86400000);

const FIX = { landlordId: "", tenantId: "", propertyId: "", fileId: "", woredaId: "", mcId: "", idTypeId: "" };

beforeAll(async () => {
  const woreda = await db.orgUnit.findUnique({ where: { code: "AA-BOLE-W01" } });
  FIX.woredaId = woreda!.id;
  FIX.idTypeId = (await db.identificationType.findUnique({ where: { code: "ID-KEBELE" } }))!.id;
  FIX.mcId = (await db.modelContract.findFirst({ where: { status: "ACTIVE" } }))!.id;

  const mk = async (type: "LANDLORD" | "TENANT", name: string, idNumber: string) => {
    const p = await createParty({
      type, fullName: name, idTypeId: FIX.idTypeId, idNumber,
      idOriginalSeen: true, idCopyAttached: true, registeredAtOrgUnitId: FIX.woredaId,
    });
    await verifyParty(p.id, "VERIFIED");
    return p.id;
  };
  FIX.landlordId = await mk("LANDLORD", "Integration Landlord", `ID-${Math.random().toString(36).slice(2, 10)}`);
  FIX.tenantId = await mk("TENANT", "Integration Tenant", `ID-${Math.random().toString(36).slice(2, 10)}`);

  const prop = await createProperty({
    woredaId: FIX.woredaId, landlordId: FIX.landlordId,
    ownershipEvidence: "OWNERSHIP_CERTIFICATE", evidenceRef: `OWN-${Math.random().toString(36).slice(2, 8)}`,
    statusTypeId: (await db.propertyStatusType.findUnique({ where: { code: "PS-OCCUPIED" } }))!.id,
    rooms: 2, statusSetAt: day(-500),
  });
  FIX.propertyId = prop.id;

  const witnesses = [0, 1, 2].map((i) => ({
    fullName: `Integration Witness ${i}`, idTypeId: FIX.idTypeId,
    idNumber: `IW-${i}-${Math.random().toString(36).slice(2, 8)}`,
  }));
  const f = await createRegistrationFile({
    woredaId: FIX.woredaId, propertyId: FIX.propertyId,
    landlordId: FIX.landlordId, tenantId: FIX.tenantId,
    modelContractId: FIX.mcId, monthlyRent: 6000,
    leaseStart: day(0), leaseEnd: day(365 * 2 + 5),
    prepaymentMonths: 1, paymentMethod: "CBE_BIRR", paymentMethodConfirmed: true,
    interpreterUsed: false, isLegacy: false, witnesses, enteredByOrgUnitId: FIX.woredaId,
  });
  await checkChecklist(f.id, NINE_POINT_CHECKLIST.map((c) => ({ orderNo: c.orderNo, passed: true })));
  await certifyFile(f.id, "Integration Registrar");
  await stampFile(f.id);
  await registerFile(f.id, "Integration Registrar");
  FIX.fileId = f.id;
});

describe("Payment gateway integration (Proc. Art. 13; O3)", () => {
  it("TC-INT-01 electronic settlement stores the provider reference", async () => {
    const payment = await recordPayment({
      fileId: FIX.fileId, amount: 6000, kind: "RENT", method: "CBE_BIRR",
      isCash: false, paidAt: day(1), recordedByOrgUnitId: FIX.woredaId,
    });
    expect(payment.providerRef).toMatch(/^BNK-/);
    expect(payment.isElectronic).toBe(true);
    const stored = await db.payment.findUnique({ where: { id: payment.id } });
    expect(stored!.providerRef).toBe(payment.providerRef);
  });

  it("TC-INT-02 bank decline leaves the ledger untouched", async () => {
    const before = await db.payment.count();
    const prev = process.env.BANK_MOCK_MODE;
    process.env.BANK_MOCK_MODE = "DECLINE"; // force provider decline for the service path
    let err: IntegrationError | null = null;
    try {
      await recordPayment({
        fileId: FIX.fileId, amount: 6000, kind: "RENT", method: "TELEBIRR",
        isCash: false, paidAt: day(1), recordedByOrgUnitId: FIX.woredaId,
      });
    } catch (e) { err = e as IntegrationError; }
    finally {
      if (prev === undefined) delete process.env.BANK_MOCK_MODE; else process.env.BANK_MOCK_MODE = prev;
    }
    expect(err).not.toBeNull();
    expect(err!.kind).toBe("DECLINED");
    expect(err!.status).toBe(424);
    expect(err!.message).toContain("No ledger entry was recorded");
    expect(await db.payment.count()).toBe(before); // no partial ledger write
    // Adapter-level drill (the API maps the same error to HTTP 424)
    const gw = new MockBankGateway();
    try {
      await gw.initiateTransfer({
        debtorRef: "TENANT-X", creditorRef: "BUREAU-COLLECTION-01",
        amountETB: 6000, reference: "DECLINE-DRILL", method: "TELEBIRR",
      }, "DECLINE");
      throw new Error("drill should have thrown");
    } catch (e) {
      const drill = e as IntegrationError;
      expect(drill.kind).toBe("DECLINED");
      expect(drill.status).toBe(424);
    }
  });

  it("TC-INT-03 gateway timeout leaves the ledger untouched and is retry-safe", async () => {
    const before = await db.payment.count();
    const gw = new MockBankGateway();
    try {
      await gw.initiateTransfer({
        debtorRef: "TENANT-X", creditorRef: "BUREAU-COLLECTION-01",
        amountETB: 6000, reference: "TIMEOUT-DRILL", method: "CBE_BIRR",
      }, "TIMEOUT");
      throw new Error("drill should have thrown");
    } catch (e) {
      const err = e as IntegrationError;
      expect(err.kind).toBe("TIMEOUT");
      expect(err.status).toBe(504);
      expect(err.message).toContain("No ledger entry was recorded");
    }
    expect(await db.payment.count()).toBe(before);
    // retry-safe: the same reference settles on the next NORMAL call
    const retry = await gw.initiateTransfer({
      debtorRef: "TENANT-X", creditorRef: "BUREAU-COLLECTION-01",
      amountETB: 6000, reference: "TIMEOUT-DRILL", method: "CBE_BIRR",
    }, "NORMAL");
    expect(retry.status).toBe("SETTLED");
  });

  it("TC-INT-01b mode selection honours env override", () => {
    expect(currentBankMode("DECLINE")).toBe("DECLINE");
    expect(currentBankMode(undefined)).toBe("NORMAL");
    expect(currentIdMode("TIMEOUT")).toBe("TIMEOUT");
    expect(currentIdMode(undefined)).toBe("NORMAL");
    expect(LAW.MAX_PREPAYMENT_MONTHS).toBe(2);
  });
});

describe("Identification service integration (Dir. Art. 7; O3)", () => {
  it("TC-INT-04 identity mismatch flags the party for follow-up", async () => {
    const svc = new MockIdService();
    const verdict = await svc.verify({ idTypeCode: "ID-FAYDA", idNumber: "X-NO-MATCH", fullName: "Mismatch Person" });
    expect(verdict.status).toBe("NO_MATCH");
    // service-level: createParty with online verification returns the note
    const p = await createParty({
      type: "TENANT", fullName: "Mismatch Person", idTypeId: FIX.idTypeId,
      idNumber: `X-${Math.random().toString(36).slice(2, 8)}`,
      idOriginalSeen: true, idCopyAttached: true, registeredAtOrgUnitId: FIX.woredaId,
      verifyIdentityOnline: true,
    });
    expect(p.idCheckNote).toContain("NO_MATCH");
    expect(p.verificationStatus).toBe("PENDING"); // human decision still required
  });

  it("TC-INT-05 identity service timeout degrades gracefully (deferred)", async () => {
    const svc = new MockIdService();
    const verdict = await svc.verify({ idTypeCode: "ID-KEBELE", idNumber: "NORMAL-1", fullName: "Timeout Person" }, "TIMEOUT");
    expect(verdict.status).toBe("DEFERRED");
    const prev = process.env.ID_MOCK_MODE;
    process.env.ID_MOCK_MODE = "TIMEOUT"; // force the provider outage for the service path
    let p;
    try {
      p = await createParty({
        type: "LANDLORD", fullName: `Timeout Person ${Math.random().toString(36).slice(2, 5)}`,
        idTypeId: FIX.idTypeId, idNumber: `ID-${Math.random().toString(36).slice(2, 8)}`,
        idOriginalSeen: true, idCopyAttached: true, registeredAtOrgUnitId: FIX.woredaId,
        verifyIdentityOnline: true,
      });
    } finally {
      if (prev === undefined) delete process.env.ID_MOCK_MODE; else process.env.ID_MOCK_MODE = prev;
    }
    expect(p.idCheckNote).toContain("DEFERRED");
    // The office workflow did NOT stop: the party exists and can proceed
    const verified = await verifyParty(p.id, "VERIFIED");
    expect(verified.verificationStatus).toBe("VERIFIED");
  });
});
