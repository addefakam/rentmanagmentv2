// /api/backups — M10 backup runs per environment scheme (Dir. Art. 13).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { runBackup } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backups = await db.backupRun.findMany({
      include: { environment: true }, orderBy: { startedAt: "desc" }, take: 100,
    });
    return ok(backups);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "backup:run",
      { action: "BACKUP_RUN", entity: "BackupRun", ref: (d: { id: string }) => d.id },
      () => runBackup({
        environmentId: String(input.environmentId), type: String(input.type),
        location: String(input.location ?? "tier-local vault"),
      }));
  } catch (err) { return fail(err); }
}
