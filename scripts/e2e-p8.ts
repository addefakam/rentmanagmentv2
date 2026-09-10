// ============================================================================
// e2e-p8.ts — Phase 8 end-to-end walkthrough over the HTTP API layer.
// Rehearses the plan §5.9 go-live evidence live: wave/cutover payload, RBAC
// separations on the phase8 actions, the full production-authentication drill
// (DEF-06-01: session issue/verify/revoke, 401 without token, 403 for
// unauthorized roles, NFR-07 sensitive-read audit), governed re-freeze,
// O-7 confirmation drill, and the go-live order drill (blocked without a
// written reference, sequenced behind Wave 1, executed on the green board).
// Records the live hardening drill transcript, then reseeds to the shipped
// go-live READY state.
// Run: bun scripts/e2e-p8.ts   (dev server on :3000, seeded database)
// ============================================================================

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

async function api(path: string, method: string, payload?: unknown, opts?: { actor?: string; token?: string }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.actor) headers["x-staff-code"] = opts.actor;
  if (opts?.token) headers["authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: payload ? JSON.stringify(payload) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, json };
}

let pass = 0;
function step(name: string, assert?: () => void) {
  if (assert) assert();
  pass++;
  console.log(`  ✓ ${name}`);
}
function expectThrow(name: string, cond: boolean, detail?: string) {
  if (!cond) throw new Error(`E2E expectation failed: ${name}${detail ? ` - ${detail}` : ""}`);
  pass++;
  console.log(`  ✓ ${name}`);
}

const drillTranscript: Record<string, unknown> = { result: "PASS", drills: [] as unknown[] };

async function main() {
  console.log("P8-A · Go-live evidence payload (shipped READY state)");
  const boot = await api("/api/phase8", "GET");
  expectThrow("phase8 evidence payload loads", boot.json.ok === true);
  const p8 = boot.json.data;
  expectThrow("four waves seeded; pilot LIVE under the G7 authorization",
    p8.waves.length === 4 && p8.waves[0].status === "LIVE" && p8.waves[0].goLiveOrderRef === "GATE-G7-2026-09-10");
  expectThrow("Wave 1 LIVE under the owner's G8 order with the cutover checklist 10/10 GREEN",
    p8.waves[1].status === "LIVE" && p8.waves[1].goLiveOrderRef === "GATE-G8-2026-09-10"
    && p8.waves[1].items.length === 10 && p8.waves[1].items.every((i: { status: string }) => i.status === "GREEN"));
  expectThrow("O-7 closed: 11/11 sub-cities confirmed", p8.o7.closed === true && p8.o7.confirmed === 11);
  expectThrow("G8 readiness check green", p8.readiness.ready === true);

  console.log("P8-B · Capability separations on the go-live actions");
  const deniedChecklist = await api("/api/phase8", "POST", { kind: "checklist-execute", waveCode: "WAVE-1" }, { actor: "STF-0001" });
  expectThrow("registrar cannot execute the cutover checklist (403)", deniedChecklist.status === 403);
  const runChecklist = await api("/api/phase8", "POST", { kind: "checklist-execute", waveCode: "WAVE-1" }, { actor: "STF-0005" });
  expectThrow("bureau head re-executes the checklist - stays green", runChecklist.json.ok === true && runChecklist.json.data.allGreen === true);
  const deniedOrder = await api("/api/phase8", "POST", { kind: "golive-order", waveCode: "WAVE-1", orderRef: "X" }, { actor: "STF-0004" });
  expectThrow("bureau analyst cannot give the go-live order (403)", deniedOrder.status === 403);
  const deniedSetting = await api("/api/phase8", "POST", { kind: "auth-mode", mode: "production" }, { actor: "STF-0005" });
  expectThrow("bureau head cannot switch authentication mode (403, SYSTEM_ADMIN only)", deniedSetting.status === 403);

  console.log("P8-C · Session layer (DEF-06-01 / finding F-1 closure)");
  const idpTimeout = await api("/api/session", "POST", { idProviderMode: "TIMEOUT" }, { actor: "STF-0001" });
  expectThrow("identity-provider timeout refuses issuance (401 IDP_TIMEOUT)", idpTimeout.status === 401 && idpTimeout.json.code === "IDP_TIMEOUT");
  const sess = await api("/api/session", "POST", {}, { actor: "STF-0001" });
  expectThrow("officer sign-in issues a session token", sess.json.ok === true && typeof sess.json.data.token === "string" && sess.json.data.token.length === 64);
  const token1: string = sess.json.data.token;
  const verify = await api("/api/session", "GET", undefined, { token: token1 });
  expectThrow("session verifies back to the officer context",
    verify.json.ok === true && verify.json.data.authenticated === true && verify.json.data.actor.roleCode === "WOREDA_REGISTRAR");

  const adminSess = await api("/api/session", "POST", {}, { actor: "STF-0008" });
  expectThrow("system admin sign-in issues a session", adminSess.json.ok === true);
  const tokenAdmin: string = adminSess.json.data.token;

  console.log("P8-D · Production-mode read guard drill");
  const toProd = await api("/api/phase8", "POST", { kind: "auth-mode", mode: "production" }, { actor: "STF-0008" });
  expectThrow("system admin switches auth_mode to production", toProd.json.ok === true && toProd.json.data.value === "production");
  const noToken = await api("/api/parties", "GET", undefined, {});
  expectThrow("unauthenticated read refused in production mode (401 AUTH_SESSION_REQUIRED)",
    noToken.status === 401 && noToken.json.code === "AUTH_SESSION_REQUIRED");
  const withToken = await api("/api/parties", "GET", undefined, { token: token1 });
  expectThrow("authorized session reads the party register (200)", withToken.status === 200 && withToken.json.ok === true);
  const stamper = await api("/api/session", "POST", {}, { actor: "STF-0002" });
  const stamperRead = await api("/api/parties", "GET", undefined, { token: stamper.json.data.token });
  expectThrow("stamper refused the party register (403 capability matrix)", stamperRead.status === 403);
  const sensitive = await prisma.auditEvent.findFirst({
    where: { action: "READ_SENSITIVE", actorCode: "STF-0001", entity: "Party register" }, orderBy: { seq: "desc" },
  });
  expectThrow("sensitive read audit-logged per NFR-07", !!sensitive && (sensitive!.summary ?? "").includes("NFR-07"));
  (drillTranscript.drills as unknown[]).push(
    { drill: "401 without token", pass: noToken.status === 401 },
    { drill: "200 with authorized session", pass: withToken.status === 200 },
    { drill: "403 unauthorized role", pass: stamperRead.status === 403 },
    { drill: "READ_SENSITIVE audit", pass: !!sensitive },
  );
  const signout = await api("/api/session", "DELETE", undefined, { token: stamper.json.data.token });
  expectThrow("sign-out revokes the session", signout.json.ok === true && signout.json.data.revoked === true);
  const revokedRead = await api("/api/parties", "GET", undefined, { token: stamper.json.data.token });
  expectThrow("revoked session refused (401 AUTH_SESSION_REVOKED)",
    revokedRead.status === 401 && revokedRead.json.code === "AUTH_SESSION_REVOKED");
  const adminRead = await api("/api/phase8", "GET", undefined, { token: tokenAdmin });
  expectThrow("phase8 evidence readable in production mode with an authorized session", adminRead.status === 200);
  (drillTranscript.drills as unknown[]).push(
    { drill: "revoked session refused", pass: revokedRead.status === 401 },
    { drill: "phase8 evidence in production mode", pass: adminRead.status === 200 },
  );
  const toDemo = await api("/api/phase8", "POST", { kind: "auth-mode", mode: "demo" }, { actor: "STF-0008" });
  expectThrow("auth_mode restored to demo (console review surface open)", toDemo.json.ok === true && toDemo.json.data.value === "demo");
  const demoRead = await api("/api/parties", "GET", undefined, {});
  expectThrow("unauthenticated read open again in demo mode", demoRead.status === 200);

  console.log("P8-E · Governed re-freeze and O-7 drills");
  const reFreeze = await api("/api/phase8", "POST", { kind: "freeze-config", note: "E2E governed re-freeze" }, { actor: "STF-0008" });
  expectThrow("configuration re-frozen with a fresh hash version", reFreeze.json.ok === true && String(reFreeze.json.data.version).startsWith("CFG-FREEZE-"));
  const o7Bad = await api("/api/phase8", "POST", { kind: "o7-confirm", officialCounts: { "AA-BOLE": 15 } }, { actor: "STF-0008" });
  expectThrow("register disagreement recorded (10/11 confirmed, AA-BOLE ADJUSTED)",
    o7Bad.json.ok === true && o7Bad.json.data.confirmed === o7Bad.json.data.total - 1);
  const o7Fix = await api("/api/phase8", "POST", { kind: "o7-confirm" }, { actor: "STF-0008" });
  expectThrow("O-7 confirmation restored to 11/11", o7Fix.json.ok === true && o7Fix.json.data.confirmed === o7Fix.json.data.total);

  console.log("P8-F · The go-live order drill (Gate G8 decision recorded; sequencing now admits Wave 2)");
  const noRef = await api("/api/phase8", "POST", { kind: "golive-order", waveCode: "WAVE-2", orderRef: "  " }, { actor: "STF-0005" });
  expectThrow("go-live order without the written reference refused (422 Gate G8)", noRef.status === 422 && noRef.json.rule.includes("Gate G8"));
  const reorderLive = await api("/api/phase8", "POST", { kind: "golive-order", waveCode: "WAVE-1", orderRef: "DRILL-G8-00" }, { actor: "STF-0005" });
  expectThrow("re-ordering the already-live Wave 1 refused (422)", reorderLive.status === 422 && reorderLive.json.error.includes("already live"));
  const order = await api("/api/phase8", "POST", { kind: "golive-order", waveCode: "WAVE-2", orderRef: "DRILL-G8-02" }, { actor: "STF-0005" });
  expectThrow("city-wide order executes with Wave 1 live and O-7 closed (sequencing gate passed live)", order.json.ok === true && order.json.data.status === "LIVE");
  const afterOrder = await api("/api/phase8", "GET");
  const liveWave = (afterOrder.json.data.waves as { code: string; status: string; goLiveOrderRef: string | null }[]).find((w) => w.code === "WAVE-2");
  expectThrow("wave register shows Wave 2 LIVE under DRILL-G8-02", liveWave?.status === "LIVE" && liveWave?.goLiveOrderRef === "DRILL-G8-02");

  console.log("P8-G · Hardening drill transcript + audit chain + restore");
  const recordDrill = await api("/api/phase8", "POST", {
    kind: "drill-record", drillKind: "SESSION_HARDENING",
    evidence: { ...drillTranscript, unitSuite: "tests/phase8.test.ts", e2e: "scripts/e2e-p8.ts (live production-mode drill above)" },
  }, { actor: "STF-0008" });
  expectThrow("live hardening drill transcript recorded (PASS)", recordDrill.json.ok === true && recordDrill.json.data.result === "PASS");
  const quality = await api("/api/quality", "GET");
  expectThrow("audit chain INTACT after the production-mode drill",
    quality.json.ok === true && quality.json.data.audit?.intact === true);

  // Restore the shipped demonstration state by reseeding.
  const { runSeed } = await import("../prisma/seed");
  await runSeed();
  step("database reseeded to the shipped operational state");
  const restored = await api("/api/phase8", "GET");
  const r = restored.json.data;
  expectThrow("shipped state restored: Wave 1 LIVE under the G8 order, checklist 10/10 GREEN, G8 READY, demo mode",
    r.waves[1].status === "LIVE" && r.waves[1].goLiveOrderRef === "GATE-G8-2026-09-10"
    && r.waves[1].items.every((i: { status: string }) => i.status === "GREEN")
    && r.readiness.ready === true && r.authMode === "demo");

  console.log(`\nE2E-P8 RESULT: ${pass} checks passed, 0 failed`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("E2E-P8 FAILED:", err);
  // Safety: never leave the platform in production auth mode.
  await prisma.platformSetting.upsert({
    where: { key: "auth_mode" }, update: { value: "demo" }, create: { key: "auth_mode", value: "demo", updatedBy: "e2e" },
  }).catch(() => undefined);
  await prisma.$disconnect();
  process.exit(1);
});
