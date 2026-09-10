// ============================================================================
// authz.ts — Phase 5 access control between tiers (NFR-04, OWASP ASVS V4).
// Every mutating endpoint names a capability; the capability names the role
// codes allowed to execute it. The acting officer is resolved from the
// `x-staff-code` header against the seeded SystemUser register; the request is
// denied with 403 when the officer's role is not in the capability's allow
// list. Successful state-changing calls append to the audit chain.
// ============================================================================

import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { recordAudit } from "./audit";

export class SecurityError extends Error {
  constructor(message: string, public readonly missing?: string) {
    super(message);
    this.name = "SecurityError";
  }
}

/** Capability -> allowed role codes. Mirrors the directive's tier duties:
 *  woreda (Dir. Arts. 6-9, 17-19), sub-city (Art. 13), Bureau (Arts. 8, 11,
 *  22), committee (Proc. Arts. 24-26), Ministry (Proc. Art. 18), system
 *  administration (Dir. Art. 14(4)). */
export const CAPABILITIES: Record<string, string[]> = {
  "party:write": ["WOREDA_REGISTRAR"],
  "property:write": ["WOREDA_REGISTRAR"],
  "registration:file": ["WOREDA_REGISTRAR"],
  "registration:check": ["WOREDA_REGISTRAR"],
  "registration:certify": ["WOREDA_REGISTRAR"],
  "registration:stamp": ["WOREDA_STAMPER"], // separate stamping desk, Dir. Art. 9
  "registration:register": ["WOREDA_REGISTRAR"],
  "registration:annotate": ["WOREDA_REGISTRAR"],
  "adjustment:draft": ["BUREAU_ANALYST"],
  "adjustment:publish": ["BUREAU_HEAD"],
  "adjustment:effect": ["BUREAU_HEAD"],
  "adjustment:validate": ["WOREDA_REGISTRAR"],
  "payment:record": ["WOREDA_REGISTRAR"],
  "complaint:intake": ["WOREDA_REGISTRAR"],
  "complaint:progress": ["WOREDA_REGISTRAR"],
  "appeal:file": ["WOREDA_REGISTRAR"],
  "appeal:progress": ["COMMITTEE_MEMBER"],
  "deadline:sweep": ["SYSTEM_ADMIN"],
  "control:manage": ["SUBCITY_MONITOR"],
  "penalty:manage": ["BUREAU_HEAD"],
  "replication:run": ["SUBCITY_MONITOR"],
  "backup:run": ["SYSTEM_ADMIN"],
  "publication:manage": ["MINISTRY_ANALYST"],
  "modelcontract:amend": ["BUREAU_HEAD"],
  "promotion:run": ["SYSTEM_ADMIN"],
  "uat:run": ["SYSTEM_ADMIN", "BUREAU_HEAD"], // Phase 6 acceptance battery coordinator
  "analytics:compute": ["BUREAU_ANALYST"],
  // Phase 7 — migration, reconciliation, training, pilot, awareness
  "migration:run": ["WOREDA_REGISTRAR", "SYSTEM_ADMIN"], // Dir. Art. 8(2) legacy intake
  "reconciliation:run": ["SUBCITY_MONITOR", "BUREAU_ANALYST", "SYSTEM_ADMIN"], // Dir. Art. 13
  "training:record": ["SYSTEM_ADMIN", "BUREAU_HEAD"], // plan 5.8 training records
  "pilot:manage": ["BUREAU_HEAD", "SYSTEM_ADMIN"], // plan 5.8 pilot operation
  "awareness:manage": ["MINISTRY_ANALYST", "BUREAU_HEAD"], // Proc. Arts. 14, 16
  // Phase 8 — go-live hardening, waves, cutover, drills, session layer
  "session:issue": [
    "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
    "BUREAU_HEAD", "COMMITTEE_MEMBER", "MINISTRY_ANALYST", "SYSTEM_ADMIN",
  ], // officer sign-in (any active staff role)
  "phase8:manage": ["BUREAU_HEAD", "SYSTEM_ADMIN"], // cutover, drills, O-7, freeze, roster, hypercare
  "golive:order": ["BUREAU_HEAD", "SYSTEM_ADMIN"], // executes the owner's written go-live order (G8)
  "setting:manage": ["SYSTEM_ADMIN"], // platform settings incl. auth_mode switch
  // Read capabilities enforced when auth_mode = production (DEF-06-01)
  "read:parties": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:registration": ["WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "SYSTEM_ADMIN"],
  "read:payments": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:phase7": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:phase8": ["SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
};

export type Actor = {
  staffCode: string;
  fullName: string;
  roleCode: string;
  orgUnitCode: string | null;
  orgUnitId: string;
};

export async function resolveActor(req: Request): Promise<Actor | null> {
  const code = req.headers.get("x-staff-code");
  if (!code) return null;
  const u = await db.systemUser.findUnique({
    where: { staffCode: code }, include: { role: true, orgUnit: true },
  });
  if (!u || !u.isActive) return null;
  return {
    staffCode: u.staffCode, fullName: u.fullName, roleCode: u.roleCode,
    orgUnitCode: u.orgUnit.code, orgUnitId: u.orgUnitId,
  };
}

export async function requireCapability(req: Request, capability: string): Promise<Actor> {
  const actor = await resolveActor(req);
  if (!actor) {
    throw new SecurityError(
      "No acting officer identified. Present a valid x-staff-code header.",
      "AUTH_MISSING",
    );
  }
  const allowed = CAPABILITIES[capability];
  if (!allowed) throw new SecurityError(`Unknown capability: ${capability}`, "AUTH_CAPABILITY");
  if (!allowed.includes(actor.roleCode)) {
    throw new SecurityError(
      `Role ${actor.roleCode} (${actor.staffCode}) is not authorized for capability ${capability}. ` +
      `Allowed roles: ${allowed.join(", ")}.`,
      "AUTH_FORBIDDEN",
    );
  }
  return actor;
}

export type AuditSpec<T> = {
  action: string;
  entity: string;
  ref?: (data: T) => string | null | undefined;
  summary?: (data: T) => string | null | undefined;
};

/** Guard wrapper: authorize, execute, audit. Throws SecurityError (403) /
 *  LegalError (422) / IntegrationError (424|504) which api.fail() maps. */
export async function withGuard<T>(
  req: Request, capability: string, audit: AuditSpec<T>, run: (actor: Actor) => Promise<T>,
): Promise<Response> {
  const actor = await requireCapability(req, capability);
  const data = await run(actor);
  try {
    await recordAudit({
      actorCode: actor.staffCode, actorRole: actor.roleCode,
      orgUnitCode: actor.orgUnitCode,
      action: audit.action, entity: audit.entity,
      entityRef: audit.ref ? (audit.ref(data) ?? null) : null,
      summary: audit.summary ? (audit.summary(data) ?? null) : null,
    });
  } catch {
    // Audit failure must not roll back the legal action, but must be loud:
    // the chain verification surface reports any gap immediately.
    console.error(`AUDIT WRITE FAILED for ${audit.action}`);
  }
  return ok(data);
}
