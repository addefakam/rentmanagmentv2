// /api/deadlines — M12 deadline engine: list statutory clocks; POST sweeps
// overdue clocks and escalates them (Dir. Art. 19 reminder and escalation).
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { sweepDeadlines } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deadlines = await db.deadlineTrack.findMany({ orderBy: { dueAt: "asc" }, take: 200 });
    return ok(deadlines);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    return await withGuard(req, "deadline:sweep",
      { action: "DEADLINE_SWEEP", entity: "DeadlineTrack", ref: () => null },
      () => sweepDeadlines());
  } catch (err) { return fail(err); }
}
