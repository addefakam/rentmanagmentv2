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
import { bureauOf, cityCodeForOrgUnit, descendantIds, subtreeRootForRole } from "@/lib/city";
import { isNationalRole } from "@/lib/auth/officer";

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
  "regulation:manage": ["SYSTEM_ADMIN"], // national regulation register — fleet-wide (owner directive)
  "modelcontract:propagate": ["SYSTEM_ADMIN"], // push a new model contract version to EVERY active city
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
  "operations:manage": ["BUREAU_HEAD", "SYSTEM_ADMIN"], // hypercare, cycle, referrals, handover, PIR (plan A-42..A-48)
  "feed:publish": ["MINISTRY_ANALYST", "BUREAU_HEAD", "SYSTEM_ADMIN"], // national feed to the Ministry (A-45)
  "setting:manage": ["SYSTEM_ADMIN"], // platform settings incl. auth_mode switch
  // City staff register — the sub-city rent-control officer appoints the
  // woreda desks of HIS sub-city (role/tier rules in the route); the city
  // super-admin and the system admin run the wider register. The city bureau
  // head does NOT create staff: founding a sub-city hands staffing to that
  // sub-city's own officer (owner directive).
  "staff:manage": ["CITY_ADMIN", "SUBCITY_MONITOR", "SYSTEM_ADMIN"],
  // Multi-city administration (per-city rule sets, Dir. Art. 14).
  // Owner directive (single-admin policy): exactly ONE administrator — the
  // SYSTEM_ADMIN — manages cities. The ministry analyst is oversight-only:
  // no city settings, no fleet reads, no city directory. City-bound officers
  // keep their OWN-city self-administration via city:manage (+ CITY_ADMIN
  // auto-grant below, scope-walled to their city).
  "city:manage": ["BUREAU_HEAD", "SYSTEM_ADMIN"], // city identity + statutory params (own city; scope-walled)
  "city:admin": ["SYSTEM_ADMIN"], // fleet-level READ: City Management table — the one supreme admin only
  "city:write": ["SYSTEM_ADMIN"], // fleet-level WRITE: onboard / edit / activate / deactivate cities
  // SaaS tenant service catalog — city admin manages own city, system admin fleet-wide
  "service:manage": ["CITY_ADMIN", "SYSTEM_ADMIN"],
  "ladder:manage": ["BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"], // penalty ladder values
  // Org register — the city bureau head FOUNDS sub-cities (each with its
  // responsible officer); the sub-city officer registers the WOREDAS of his
  // area; the route enforces the role/tier split.
  "org:manage": ["BUREAU_HEAD", "SUBCITY_MONITOR", "SYSTEM_ADMIN"], // sub-city / woreda register
  // Read capabilities enforced when auth_mode = production (DEF-06-01)
  "read:parties": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:registration": ["WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "SYSTEM_ADMIN"],
  "read:payments": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:phase7": ["WOREDA_REGISTRAR", "SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
  "read:phase8": ["SUBCITY_MONITOR", "BUREAU_ANALYST", "BUREAU_HEAD", "MINISTRY_ANALYST", "SYSTEM_ADMIN"],
};

// ---------------------------------------------------------------------------
// CITY_ADMIN — the city super-admin created automatically when a city is
// onboarded. Holds EVERY city-level duty (registry oversight, operations,
// statutory configuration, org structure, staff register) inside ONE city;
// fleet administration, federal publications and platform settings stay
// with the national roles. Deadline sweep stays national (its sweep is
// fleet-wide), as do backup/promotion/UAT coordination.
// ---------------------------------------------------------------------------
const CITY_ADMIN_GRANTS = [
  "party:write", "property:write", "payment:record",
  "complaint:intake", "complaint:progress", "appeal:file",
  "registration:file", "registration:check", "registration:certify", "registration:register", "registration:annotate",
  "adjustment:draft", "adjustment:publish", "adjustment:effect", "adjustment:validate",
  "penalty:manage", "control:manage", "replication:run", "modelcontract:amend", "analytics:compute",
  "city:manage", "ladder:manage", "org:manage",
  "reconciliation:run", "training:record", "pilot:manage", "awareness:manage",
  "phase8:manage", "operations:manage", "golive:order", "feed:publish", "uat:run",
  "read:parties", "read:registration", "read:payments", "read:phase7", "read:phase8",
];
for (const cap of CITY_ADMIN_GRANTS) {
  if (CAPABILITIES[cap] && !CAPABILITIES[cap].includes("CITY_ADMIN")) {
    CAPABILITIES[cap].push("CITY_ADMIN");
  }
}

export type Actor = {
  staffCode: string;
  fullName: string;
  roleCode: string;
  orgUnitCode: string | null;
  orgUnitId: string;
  cityCode: string | null; // home city resolved from the org tree (null = national)
  national: boolean; // MINISTRY_ANALYST / SYSTEM_ADMIN may act across cities
};

export async function resolveActor(req: Request): Promise<Actor | null> {
  const code = req.headers.get("x-staff-code");
  if (!code) return null;
  const u = await db.systemUser.findUnique({
    where: { staffCode: code }, include: { role: true, orgUnit: true },
  });
  if (!u || !u.isActive) return null;
  const [units, configs] = await Promise.all([
    db.orgUnit.findMany({ orderBy: { code: "asc" } }),
    db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
  ]);
  const cityCode = cityCodeForOrgUnit(units as never, configs as never, u.orgUnitId);
  return {
    staffCode: u.staffCode, fullName: u.fullName, roleCode: u.roleCode,
    orgUnitCode: u.orgUnit.code, orgUnitId: u.orgUnitId,
    cityCode, national: isNationalRole(u.roleCode),
  };
}

// --------------------------------------------------------------------------
// City scope wall — a city-bound officer may ONLY touch their own city.
// Every mutating route resolves a CityCtx through cityContext(); any explicit
// city or org-unit reference outside the officer's own city is denied 403
// before the domain layer runs. National officers (Ministry / System admin)
// may target any city they name; when they reference a unit without naming a
// city the unit's own city is derived.
// --------------------------------------------------------------------------
export type CityCtx = {
  cityCode: string;
  bureauId: string | null;
  units: Array<{ id: string; code: string; tier: string; parentId: string | null }>;
  unitIds: string[];
  subCityIds: string[];
  woredaIds: string[];
};

export class CityScopeError extends SecurityError {
  constructor(message: string) {
    super(message, "AUTH_CITY_SCOPE");
    this.name = "CityScopeError";
  }
}

export async function cityContext(
  actor: Actor,
  opts: { city?: string | null; unitId?: string | null; unitLabel?: string } = {},
): Promise<CityCtx> {
  const [units, configs] = await Promise.all([
    db.orgUnit.findMany({ orderBy: { code: "asc" } }),
    db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
  ]);

  if (actor.national) {
    // National actor: target city = explicit ? city ?? the referenced unit's
    // city ?? the actor's own attachement (usually null) ?? first city.
    let cityCode = opts.city ?? null;
    if (!cityCode && opts.unitId) {
      const bureau = bureauOf(units as never, opts.unitId);
      // Fleet-level references (e.g. the Ministry org unit) resolve to no
      // city — skip the unit check instead of guessing a city.
      if (bureau) cityCode = configs.find((c) => c.bureauId === bureau.id)?.cityCode ?? null;
      if (!bureau) {
        return {
          cityCode: cityCode ?? actor.cityCode ?? configs[0]?.cityCode ?? "AA",
          bureauId: null, units: units as never, unitIds: [], subCityIds: [], woredaIds: [],
        };
      }
    }
    cityCode = cityCode ?? actor.cityCode ?? configs[0]?.cityCode ?? "AA";
    const cfg = configs.find((c) => c.cityCode === cityCode);
    const bureauId = cfg?.bureauId ?? null;
    const unitIds = bureauId ? descendantIds(units as never, bureauId) : [];
    if (opts.unitId && unitIds.length > 0 && !unitIds.includes(opts.unitId)) {
      throw new CityScopeError(
        `Cross-city reference denied: the referenced ${opts.unitLabel ?? "org unit"} does not belong to city ${cityCode}.`,
      );
    }
    return {
      cityCode, bureauId, units: units as never, unitIds,
      subCityIds: unitIds.filter((id) => units.find((u) => u.id === id)?.tier === "SUB_CITY"),
      woredaIds: unitIds.filter((id) => units.find((u) => u.id === id)?.tier === "WOREDA"),
    };
  }

  // City-bound actor: pinned to the home bureau subtree, no exceptions —
  // except the sub-city officer (owner directive), whose world is his own
  // sub-city subtree: his woredas, his staff, his numbers only.
  const bureau = bureauOf(units as never, actor.orgUnitId);
  const mine = configs.find((c) => c.bureauId === bureau?.id);
  if (!bureau || !mine) {
    throw new CityScopeError(
      `Account ${actor.staffCode} is not linked to an active city. Contact the system administrator.`,
    );
  }
  if (opts.city && opts.city !== mine.cityCode) {
    throw new CityScopeError(
      `Cross-city access denied: ${actor.staffCode} is scoped to ${mine.nameEn} (${mine.cityCode}) and cannot act on ${opts.city}.`,
    );
  }
  const subRoot = subtreeRootForRole(units as never, actor.orgUnitId, actor.roleCode);
  const unitIds = subRoot
    ? descendantIds(units as never, subRoot)
    : descendantIds(units as never, bureau.id);
  if (opts.unitId && !unitIds.includes(opts.unitId)) {
    throw new CityScopeError(
      subRoot
        ? `Access denied: the referenced ${opts.unitLabel ?? "org unit"} is outside your sub-city (${units.find((u) => u.id === subRoot)?.code ?? ""}).`
        : `Cross-city access denied: the referenced ${opts.unitLabel ?? "org unit"} is outside ${mine.nameEn} (${mine.cityCode}).`,
    );
  }
  return {
    cityCode: mine.cityCode, bureauId: bureau.id, units: units as never, unitIds,
    subCityIds: unitIds.filter((id) => units.find((u) => u.id === id)?.tier === "SUB_CITY"),
    woredaIds: unitIds.filter((id) => units.find((u) => u.id === id)?.tier === "WOREDA"),
  };
}

/** Deny when a referenced property sits in another city's woreda. */
export async function assertPropertyInScope(ctx: CityCtx, propertyId: string | null | undefined): Promise<void> {
  if (!propertyId) return;
  const p = await db.property.findUnique({ where: { id: propertyId }, select: { woredaId: true } });
  if (p && ctx.woredaIds.length > 0 && !ctx.woredaIds.includes(p.woredaId)) {
    throw new CityScopeError(
      `Cross-city access denied: the referenced property is registered in another city (${ctx.cityCode} scope only).`,
    );
  }
}

/** Deny when a referenced registration file belongs to another city. */
export async function assertFileInScope(ctx: CityCtx, fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  const f = await db.registrationFile.findUnique({ where: { id: fileId }, select: { woredaId: true } });
  if (f && ctx.woredaIds.length > 0 && !ctx.woredaIds.includes(f.woredaId)) {
    throw new CityScopeError(
      `Cross-city access denied: the referenced registration file belongs to another city (${ctx.cityCode} scope only).`,
    );
  }
}

/** Deny when a referenced complaint was received outside the acting city. */
export async function assertComplaintInScope(ctx: CityCtx, complaintId: string | null | undefined): Promise<void> {
  if (!complaintId) return;
  const c = await db.complaint.findUnique({ where: { id: complaintId }, select: { receivedAtOrgUnitId: true } });
  if (c && ctx.unitIds.length > 0 && !ctx.unitIds.includes(c.receivedAtOrgUnitId)) {
    throw new CityScopeError(
      `Cross-city access denied: the referenced complaint was received by another city (${ctx.cityCode} scope only).`,
    );
  }
}

/** Deny when a referenced control team is not stationed in the acting city. */
export async function assertTeamInScope(ctx: CityCtx, teamId: string | null | undefined): Promise<void> {
  if (!teamId) return;
  const t = await db.controlTeam.findUnique({ where: { id: teamId }, select: { subCityId: true } });
  if (t && ctx.subCityIds.length > 0 && !ctx.subCityIds.includes(t.subCityId)) {
    throw new CityScopeError(
      `Cross-city access denied: the referenced control team belongs to another city (${ctx.cityCode} scope only).`,
    );
  }
}

/** Read scoping: returns the city ctx for CITY-BOUND readers; null when the
 *  reader is national or absent (fleet/unauthenticated reads stay unfiltered,
 *  matching the demo auth mode). Mutations always go through cityContext. */
export async function readScope(req: Request): Promise<CityCtx | null> {
  const actor = await resolveActor(req);
  if (!actor || actor.national) return null;
  return cityContext(actor);
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
