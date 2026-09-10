// ============================================================================
// /api/promotion — Phase 3 staged promotion API (server-side only).
// POST: run a full staged promotion (DEV -> STAGING -> PROD) with release
//       tagging and the validation battery, returning the outcome.
//       Phase 5: restricted to the SYSTEM_ADMIN role (RBAC, NFR-04).
// GET:  return the most recent release with steps and validation checks.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runStagedPromotion } from "@/lib/promotion/promote";
import { requireCapability } from "@/lib/security/authz";
import { recordAudit } from "@/lib/security/audit";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireCapability(req, "promotion:run");
    const outcome = await runStagedPromotion(db);
    await recordAudit({
      actorCode: actor.staffCode, actorRole: actor.roleCode,
      orgUnitCode: actor.orgUnitCode,
      action: "PROMOTION_RUN", entity: "Release",
      entityRef: outcome?.tag ?? null,
      summary: `Staged promotion ${outcome?.status ?? "UNKNOWN"}`,
    });
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    if (err instanceof Error && err.name === "SecurityError") {
      return NextResponse.json({ ok: false, error: err.message, rule: "NFR-04 access control (ASVS V4)" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const release = await db.release.findFirst({
      orderBy: { startedAt: "desc" },
      include: {
        steps: {
          orderBy: { orderNo: "asc" },
          include: { checks: { orderBy: { name: "asc" } } },
        },
      },
    });
    return NextResponse.json({ ok: true, release });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
