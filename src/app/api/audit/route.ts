// /api/audit — the PLATFORM AUDIT TRAIL (owner directive "remove insight and
// add some else if needed"). When Insights (city Data & Reports) was removed
// from the super user's console, this became its administrative counterpart:
// instead of city analytics, the System Super User gets fleet-wide oversight
// of the tamper-evident audit chain (NFR-07) — WHO did WHAT, in WHICH city.
//
//   GET (SYSTEM_ADMIN) → recent audit events across EVERY tenant city with
//                        filters (actor / free text / city / limit) and an
//                        on-demand full hash-chain integrity verdict.
//   GET (anyone else)  → 403 — this is the super user's oversight surface.
//
// Read-only: no capability mutation is exposed here; every state-changing
// action in the platform is already appended to the chain by recordAudit.
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { resolveActor, SecurityError } from "@/lib/security/authz";
import { verifyAuditChain } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

const FETCH_CAP = 1000; // filter window: the 1 000 most recent events
const EVENTS_MAX = 300; // hard response cap regardless of ?limit

export async function GET(req: Request) {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      throw new SecurityError("No acting officer identified. Present a valid x-staff-code header.", "AUTH_MISSING");
    }
    if (actor.roleCode !== "SYSTEM_ADMIN") {
      throw new SecurityError(
        `The platform audit trail is reserved for the System Super User (role ${actor.roleCode} is not authorized).`,
        "AUTH_FORBIDDEN",
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(EVENTS_MAX, Math.max(20, Number(url.searchParams.get("limit") ?? 120) || 120));
    const actorFilter = (url.searchParams.get("actor") ?? "").trim().toUpperCase();
    const q = (url.searchParams.get("q") ?? "").trim().toUpperCase();
    const city = (url.searchParams.get("city") ?? "").trim().toUpperCase();
    const verify = url.searchParams.get("verify") === "1";

    const [total, recent] = await Promise.all([
      db.auditEvent.count(),
      db.auditEvent.findMany({ orderBy: { seq: "desc" }, take: FETCH_CAP }),
    ]);

    // JS-side filtering keeps the route portable across SQLite (local) and
    // Postgres/Neon (production) — no dialect-sensitive case-insensitivity.
    const events = recent
      .filter((e) => (actorFilter ? e.actorCode.toUpperCase().includes(actorFilter) : true))
      .filter((e) =>
        q
          ? [e.action, e.entity, e.entityRef ?? "", e.summary ?? "", e.actorRole].some((f) => f.toUpperCase().includes(q))
          : true)
      .filter((e) => (city ? (e.orgUnitCode ?? "").toUpperCase().startsWith(`${city}-`) : true))
      .slice(0, limit)
      .map((e) => ({
        seq: e.seq, at: e.at.toISOString(), actorCode: e.actorCode, actorRole: e.actorRole,
        orgUnitCode: e.orgUnitCode, action: e.action, entity: e.entity,
        entityRef: e.entityRef, summary: e.summary,
      }));

    const chain = verify ? await verifyAuditChain() : null;

    return ok({
      scope: "SYSTEM_ADMIN",
      total,
      fetchedWindow: recent.length,
      shown: events.length,
      events,
      chain,
    });
  } catch (err) { return fail(err); }
}
