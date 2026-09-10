// ============================================================================
// session.ts — Phase 8 go-live hardening (DEF-06-01 / Phase 5 finding F-1).
// The Phase 5 security assessment found that console read endpoints were
// intentionally open in the review sandbox and disposed that "in a production
// deployment, session-based read authorization must be enforced alongside the
// mutating-route guard, and sensitive reads (party identity data) must be
// logged per NFR-07". This module implements exactly that disposition:
//
//  1. Officer sign-in binds a demo staff identity to the national identity
//     provider integration (mock Falka-style SSO, NORMAL|TIMEOUT modes) and
//     issues an opaque session token. Only the SHA-256 hash is stored.
//  2. auth_mode is a platform setting: "demo" keeps the console read paths
//     open as the owner's review surface; "production" requires a valid,
//     unexpired, unrevoked session for guarded reads and authorizes them
//     through the same capability matrix the mutation guard uses.
//  3. Sensitive reads (party identity and financial data) are audit-logged
//     per NFR-07 whenever they pass through the guard in production mode.
//
// The mode switch is a checklist action at cutover ("configuration frozen"
// then production authentication on), drilled by the automated suite and the
// live end-to-end walkthrough.
// ============================================================================

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { recordAudit } from "./audit";
import { CAPABILITIES, resolveActor, SecurityError, type Actor } from "./authz";

export const AUTH_MODE_KEY = "auth_mode";
export const SESSION_TTL_HOURS = 12;
const ID_PROVIDER = "NATIONAL-ID-SSO (mock Falka integration)";

export type AuthMode = "demo" | "production";

export async function getAuthMode(): Promise<AuthMode> {
  const row = await db.platformSetting.findUnique({ where: { key: AUTH_MODE_KEY } });
  return row?.value === "production" ? "production" : "demo";
}

export async function setAuthMode(mode: AuthMode, byStaffCode: string) {
  if (mode !== "demo" && mode !== "production") {
    throw new SecurityError(`Invalid auth mode: ${mode}`, "AUTH_MODE");
  }
  await db.platformSetting.upsert({
    where: { key: AUTH_MODE_KEY },
    create: { key: AUTH_MODE_KEY, value: mode, updatedBy: byStaffCode },
    update: { value: mode, updatedBy: byStaffCode },
  });
  await recordAudit({
    actorCode: byStaffCode, actorRole: "SYSTEM_ADMIN", orgUnitCode: null,
    action: mode === "production" ? "AUTH_MODE_PRODUCTION_ON" : "AUTH_MODE_DEMO_ON",
    entity: "PlatformSetting", entityRef: AUTH_MODE_KEY,
    summary: `Read-path authentication mode switched to ${mode} (DEF-06-01 hardening).`,
  });
  return { key: AUTH_MODE_KEY, value: mode };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// National identity provider binding (integration point per SRS M6/O3; the
// mock mirrors MockIdService modes so failure drills stay reproducible).
// ---------------------------------------------------------------------------
async function bindIdentityProvider(staffCode: string, mode?: "NORMAL" | "TIMEOUT") {
  const providerMode = mode ?? "NORMAL";
  if (providerMode === "TIMEOUT") {
    throw new SecurityError(
      "National identity provider did not respond in time; session not issued.",
      "IDP_TIMEOUT",
    );
  }
  return `FALKA-SSO-${staffCode}-${new Date().toISOString().slice(0, 10)}`;
}

export async function issueSession(input: {
  staffCode: string; idProviderMode?: "NORMAL" | "TIMEOUT"; ttlHours?: number;
}) {
  const user = await db.systemUser.findUnique({
    where: { staffCode: input.staffCode }, include: { role: true, orgUnit: true },
  });
  if (!user || !user.isActive) {
    throw new SecurityError("Sign-in refused: officer not found or inactive.", "AUTH_SUBJECT");
  }
  const idpRef = await bindIdentityProvider(input.staffCode, input.idProviderMode);
  const token = randomBytes(32).toString("hex");
  const ttl = input.ttlHours ?? SESSION_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttl * 3600 * 1000);
  const session = await db.productionSession.create({
    data: {
      tokenHash: hashToken(token), staffCode: user.staffCode, roleCode: user.roleCode,
      idProviderRef: idpRef, expiresAt,
    },
  });
  await recordAudit({
    actorCode: user.staffCode, actorRole: user.roleCode, orgUnitCode: user.orgUnit.code,
    action: "SESSION_ISSUED", entity: "ProductionSession", entityRef: session.id,
    summary: `Officer session issued via ${ID_PROVIDER}; expires ${expiresAt.toISOString()}.`,
  });
  return { token, expiresAt, sessionId: session.id, staffCode: user.staffCode, roleCode: user.roleCode };
}

export async function verifySession(token: string): Promise<Actor> {
  const h = hashToken(token);
  const session = await db.productionSession.findUnique({ where: { tokenHash: h } });
  if (!session) {
    throw new SecurityError("Session token not recognized.", "AUTH_SESSION_REQUIRED");
  }
  if (session.revokedAt) {
    throw new SecurityError("Session has been revoked.", "AUTH_SESSION_REVOKED");
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    throw new SecurityError("Session has expired; sign in again.", "AUTH_SESSION_EXPIRED");
  }
  // Re-resolve the actor live so role changes and deactivations take effect
  // immediately, exactly as the mutation guard behaves.
  const user = await db.systemUser.findUnique({
    where: { staffCode: session.staffCode }, include: { role: true, orgUnit: true },
  });
  if (!user || !user.isActive) {
    throw new SecurityError("Session subject is no longer an active officer.", "AUTH_SUBJECT");
  }
  return {
    staffCode: user.staffCode, fullName: user.fullName, roleCode: user.roleCode,
    orgUnitCode: user.orgUnit.code, orgUnitId: user.orgUnitId,
  };
}

export async function revokeSession(token: string) {
  const h = hashToken(token);
  const session = await db.productionSession.findUnique({ where: { tokenHash: h } });
  if (!session) {
    throw new SecurityError("Session token not recognized.", "AUTH_SESSION_REQUIRED");
  }
  await db.productionSession.update({
    where: { id: session.id }, data: { revokedAt: new Date() },
  });
  await recordAudit({
    actorCode: session.staffCode, actorRole: session.roleCode, orgUnitCode: null,
    action: "SESSION_REVOKED", entity: "ProductionSession", entityRef: session.id,
    summary: "Officer session revoked at sign-out.",
  });
  return { revoked: true, sessionId: session.id };
}

/** Extract a bearer session token from the request (Authorization: Bearer or
 *  x-session-token). */
export function sessionTokenOf(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const direct = req.headers.get("x-session-token");
  return direct && direct.trim() ? direct.trim() : null;
}

export type ReadGuardSpec = {
  /** Capability name (must exist in CAPABILITIES). */
  capability: string;
  /** Marks party-identity / financial reads that NFR-07 requires to be logged. */
  sensitive?: boolean;
  /** Audit entity label. */
  entity: string;
};

/** Read guard for GET endpoints (DEF-06-01). In demo mode the console read
 *  surface stays open for the owner's review; in production mode a valid
 *  session is mandatory, the capability matrix decides, and sensitive reads
 *  land in the audit chain per NFR-07. Throws SecurityError (401/403). */
export async function withReadGuard(req: Request, spec: ReadGuardSpec): Promise<Actor | null> {
  const mode = await getAuthMode();
  if (mode === "demo") return resolveActor(req); // review surface stays open; no enforcement
  const token = sessionTokenOf(req);
  if (!token) {
    throw new SecurityError(
      "Production authentication is enforced: this read requires a session. Sign in to obtain a session token.",
      "AUTH_SESSION_REQUIRED",
    );
  }
  const actor = await verifySession(token);
  const allowed = CAPABILITIES[spec.capability];
  if (!allowed || !allowed.includes(actor.roleCode)) {
    throw new SecurityError(
      `Role ${actor.roleCode} (${actor.staffCode}) is not authorized to read ${spec.entity}. ` +
      `Allowed roles: ${(allowed ?? []).join(", ")}.`,
      "AUTH_FORBIDDEN",
    );
  }
  try {
    await recordAudit({
      actorCode: actor.staffCode, actorRole: actor.roleCode, orgUnitCode: actor.orgUnitCode,
      action: spec.sensitive ? "READ_SENSITIVE" : "READ",
      entity: spec.entity, entityRef: null,
      summary: spec.sensitive
        ? `Sensitive read of ${spec.entity} logged per NFR-07 (production session).`
        : `Read of ${spec.entity} (production session).`,
    });
  } catch (err) {
    console.error("AUDIT WRITE FAILED for read guard", err);
  }
  return actor;
}
