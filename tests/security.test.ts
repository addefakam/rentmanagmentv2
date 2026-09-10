// ============================================================================
// tests/security.test.ts — Phase 5 security testing (NFR-04, OWASP ASVS
// Level 2 focus controls): access control between tiers (V4) and audit-trail
// integrity (V7). The guard layer is exercised through the same functions the
// API routes use, so the tests prove the enforcement point itself.
// Run: bun test tests/security.test.ts
// ============================================================================

import { describe, it, expect } from "bun:test";

import { requireCapability, CAPABILITIES, withGuard, SecurityError, type Actor } from "../src/lib/security/authz";
import { recordAudit, verifyAuditChain, GENESIS_HASH } from "../src/lib/security/audit";
import { db } from "../src/lib/db";

const reqWith = (staffCode?: string) => new Request("http://localhost/test", {
  method: "POST",
  headers: staffCode ? { "x-staff-code": staffCode } : {},
});

const staff: Record<string, string> = {
  registrar: "STF-0001",     // WOREDA_REGISTRAR
  stamper: "STF-0002",       // WOREDA_STAMPER
  monitor: "STF-0003",       // SUBCITY_MONITOR
  analyst: "STF-0004",       // BUREAU_ANALYST
  bureauHead: "STF-0005",    // BUREAU_HEAD
  committee: "STF-0006",     // COMMITTEE_MEMBER
  ministry: "STF-0007",      // MINISTRY_ANALYST
  sysadmin: "STF-0008",      // SYSTEM_ADMIN
};

describe("TC-N04 access control between tiers (ASVS V4)", () => {
  it("TC-SEC-01 anonymous mutation refused with 403", async () => {
    let code = "";
    try { await requireCapability(reqWith(), "payment:record"); }
    catch (e) { code = (e as SecurityError).missing ?? ""; }
    expect(code).toBe("AUTH_MISSING");
  });

  it("TC-SEC-02 wrong-tier role refused (registrar cannot publish ceilings)", async () => {
    let code = "";
    try { await requireCapability(reqWith(staff.registrar), "adjustment:publish"); }
    catch (e) { code = (e as SecurityError).missing ?? ""; }
    expect(code).toBe("AUTH_FORBIDDEN");
  });

  it("TC-SEC-03 stamping desk separated from registrar (Dir. Art. 9)", async () => {
    // registrar may certify but may NOT stamp; stamper may stamp
    let code = "";
    try { await requireCapability(reqWith(staff.registrar), "registration:stamp"); }
    catch (e) { code = (e as SecurityError).missing ?? ""; }
    expect(code).toBe("AUTH_FORBIDDEN");
    const stamper = await requireCapability(reqWith(staff.stamper), "registration:stamp");
    expect(stamper.roleCode).toBe("WOREDA_STAMPER");
    // and the stamper cannot certify
    let code2 = "";
    try { await requireCapability(reqWith(staff.stamper), "registration:certify"); }
    catch (e) { code2 = (e as SecurityError).missing ?? ""; }
    expect(code2).toBe("AUTH_FORBIDDEN");
  });

  it("TC-SEC-04 correct role executes each capability", async () => {
    const positive: [string, string][] = [
      ["party:write", staff.registrar],
      ["property:write", staff.registrar],
      ["registration:file", staff.registrar],
      ["registration:certify", staff.registrar],
      ["registration:stamp", staff.stamper],
      ["adjustment:draft", staff.analyst],
      ["adjustment:publish", staff.bureauHead],
      ["adjustment:effect", staff.bureauHead],
      ["payment:record", staff.registrar],
      ["complaint:intake", staff.registrar],
      ["complaint:progress", staff.registrar],
      ["appeal:file", staff.registrar],
      ["appeal:progress", staff.committee],
      ["deadline:sweep", staff.sysadmin],
      ["control:manage", staff.monitor],
      ["penalty:manage", staff.bureauHead],
      ["replication:run", staff.monitor],
      ["backup:run", staff.sysadmin],
      ["publication:manage", staff.ministry],
      ["modelcontract:amend", staff.bureauHead],
      ["promotion:run", staff.sysadmin],
      ["analytics:compute", staff.analyst],
    ];
    for (const [cap, who] of positive) {
      const actor = await requireCapability(reqWith(who), cap);
      expect(actor.staffCode).toBe(who);
    }
  });

  it("TC-SEC-05 capability matrix mirrors the directive tier duties", () => {
    // every capability has a non-empty allow list of known role codes
    const known = new Set([
      "LANDLORD", "TENANT", "AGENT_PROXY", "WITNESS", "WOREDA_REGISTRAR",
      "WOREDA_STAMPER", "INTERPRETER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
      "BUREAU_HEAD", "COMMITTEE_MEMBER", "MINISTRY_ANALYST", "SYSTEM_ADMIN",
    ]);
    const caps = Object.entries(CAPABILITIES);
    expect(caps.length).toBeGreaterThanOrEqual(20);
    for (const [cap, roles] of caps) {
      expect(roles.length).toBeGreaterThan(0);
      for (const r of roles) expect(known.has(r)).toBe(true);
    }
    // no public-tier role holds an office capability
    for (const [cap, roles] of caps) {
      expect(roles).not.toContain("LANDLORD");
      expect(roles).not.toContain("TENANT");
      void cap;
    }
  });

  it("TC-P18 publication is a Ministry capability (RBAC)", async () => {
    const actor = await requireCapability(reqWith(staff.ministry), "publication:manage");
    expect(actor.roleCode).toBe("MINISTRY_ANALYST");
  });

  it("TC-P18 publication is denied to non-Ministry roles (RBAC)", async () => {
    for (const who of [staff.registrar, staff.monitor, staff.analyst, staff.committee, staff.sysadmin]) {
      let code = "";
      try { await requireCapability(reqWith(who), "publication:manage"); }
      catch (e) { code = (e as SecurityError).missing ?? ""; }
      expect(code).toBe("AUTH_FORBIDDEN");
    }
  });

  it("TC-SEC-04b guard wrapper audits successful guarded actions", async () => {
    const res = await withGuard(reqWith(staff.sysadmin), "deadline:sweep",
      { action: "SECURITY_PROBE_SWEEP", entity: "Probe", ref: () => "TC-SEC-04b" },
      async () => ({ done: true }));
    expect(res.status).toBe(200);
    const evt = await db.auditEvent.findFirst({ where: { action: "SECURITY_PROBE_SWEEP" }, orderBy: { seq: "desc" } });
    expect(evt).not.toBeNull();
    expect(evt!.actorCode).toBe(staff.sysadmin);
    expect(evt!.entityRef).toBe("TC-SEC-04b");
  });
});

describe("TC-N07 audit trail integrity (ASVS V7)", () => {
  it("TC-SEC-06 state changes append to the audit chain", async () => {
    const e1 = await recordAudit({
      actorCode: "STF-0001", actorRole: "WOREDA_REGISTRAR", orgUnitCode: "AA-BOLE-W01",
      action: "SECURITY_PROBE_A", entity: "Probe", entityRef: "chain-1",
    });
    const e2 = await recordAudit({
      actorCode: "STF-0002", actorRole: "WOREDA_STAMPER", orgUnitCode: "AA-BOLE-W01",
      action: "SECURITY_PROBE_B", entity: "Probe", entityRef: "chain-2",
    });
    expect(e2.prevHash).toBe(e1.hash);
    expect(e1.hash).toHaveLength(64);
    const tip = await db.auditEvent.findFirst({ orderBy: { seq: "desc" } });
    expect(tip!.hash).toBe(e2.hash);
  });

  it("TC-SEC-08 chain verification returns intact on untampered history", async () => {
    const verdict = await verifyAuditChain();
    expect(verdict.intact).toBe(true);
    expect(verdict.checked).toBe(verdict.events);
    expect(verdict.brokenAtSeq).toBeNull();
  });

  it("TC-SEC-07 tampering with a historical event is detected", async () => {
    // Force-write an alteration to a mid-chain event (simulating a compromised
    // actor editing history directly in the database).
    const victim = await db.auditEvent.findFirst({
      where: { action: "SECURITY_PROBE_A" }, orderBy: { seq: "asc" },
    });
    expect(victim).not.toBeNull();
    const original = victim!.summary;
    await db.auditEvent.update({
      where: { seq: victim!.seq },
      data: { summary: "TAMPERED BY SECURITY DRILL" },
    });
    const verdict = await verifyAuditChain();
    expect(verdict.intact).toBe(false);
    expect(verdict.brokenAtSeq).toBe(victim!.seq);
    expect(verdict.reason).toContain("altered after append");
    // restore so later suites and the console see an intact chain
    await db.auditEvent.update({ where: { seq: victim!.seq }, data: { summary: original } });
    const restored = await verifyAuditChain();
    expect(restored.intact).toBe(true);
  });

  it("TC-SEC-08b audit events carry actor, role and org for every probe", async () => {
    const probes = await db.auditEvent.findMany({
      where: { action: { startsWith: "SECURITY_PROBE" } }, orderBy: { seq: "asc" },
    });
    for (const p of probes) {
      expect(p.actorCode).toMatch(/^(STF-\d{4}|SYSTEM|PUBLIC|INTEGRATION)$/);
      expect(p.actorRole.length).toBeGreaterThan(0);
      expect(p.hash).toHaveLength(64);
      expect(p.prevHash).toHaveLength(64);
    }
  });
});

describe("Security utility regressions", () => {
  it("SecurityError is distinct and typed for the API mapper", () => {
    const e = new SecurityError("probe", "AUTH_FORBIDDEN");
    expect(e.name).toBe("SecurityError");
    expect(e.missing).toBe("AUTH_FORBIDDEN");
  });
});
