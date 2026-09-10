// /api/session — Phase 8 production authentication (DEF-06-01 hardening).
// POST   : officer sign-in — issues a session token bound to the national
//          identity provider (requires x-staff-code; capability session:issue).
// GET    : verifies the presented session token (Authorization: Bearer or
//          x-session-token) and returns the resolved officer context.
// DELETE : revokes the presented session (sign-out).
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import {
  issueSession, verifySession, revokeSession, getAuthMode, sessionTokenOf,
} from "@/lib/security/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req).catch(() => ({}) as Record<string, unknown>);
    return await withGuard(
      req, "session:issue",
      { action: "SESSION_ISSUE", entity: "ProductionSession", ref: (d: { sessionId: string }) => d.sessionId },
      async () => {
        const result = await issueSession({
          staffCode: String(input.staffCode ?? req.headers.get("x-staff-code") ?? ""),
          idProviderMode: input.idProviderMode === "TIMEOUT" ? "TIMEOUT" : "NORMAL",
          ttlHours: input.ttlHours != null ? Number(input.ttlHours) : undefined,
        });
        return { ...result, authMode: await getAuthMode() };
      },
    );
  } catch (err) { return fail(err); }
}

export async function GET(req: Request) {
  try {
    const token = sessionTokenOf(req);
    if (!token) {
      return ok({ authenticated: false, authMode: await getAuthMode() });
    }
    const actor = await verifySession(token);
    return ok({ authenticated: true, authMode: await getAuthMode(), actor });
  } catch (err) { return fail(err); }
}

export async function DELETE(req: Request) {
  try {
    const token = sessionTokenOf(req);
    if (!token) {
      return ok({ revoked: false, message: "No session token presented." });
    }
    return ok(await revokeSession(token));
  } catch (err) { return fail(err); }
}
