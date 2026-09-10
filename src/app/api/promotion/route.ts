// ============================================================================
// /api/promotion — Phase 3 staged promotion API (server-side only).
// POST: run a full staged promotion (DEV -> STAGING -> PROD) with release
//       tagging and the validation battery, returning the outcome.
// GET:  return the most recent release with steps and validation checks.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runStagedPromotion } from "@/lib/promotion/promote";

export async function POST(_req: NextRequest) {
  try {
    const outcome = await runStagedPromotion(db);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
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
