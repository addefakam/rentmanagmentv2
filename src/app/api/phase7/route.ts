// /api/phase7 — Data Migration, Training and Pilot evidence (plan section 5.8).
// GET  : legacy books + migration records, reconciliation reports, training
//        curriculum/sessions/trainees, active pilot + day logs, pilot exit
//        check, awareness materials.
// POST : action dispatcher over capability-guarded service calls:
//        migrate (Dir. Art. 8(2) intake), reconcile (Dir. Art. 13),
//        training-session / trainee, pilot-open / pilot-day,
//        awareness-create / awareness-approve (Proc. Arts. 14, 16).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import {
  migrateLegacyWoreda, reconcileWoreda, reconcileAllMigrated,
  createTrainingSession, addTrainee, openPilot, logPilotDay,
  pilotExitCheck, createAwarenessItem, approveAwarenessItem,
} from "@/lib/domain/phase7";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [books, migrations, reconciliations, courses, sessions, pilot, awareness] = await Promise.all([
      db.legacyBookEntry.findMany({ include: { woreda: true, migrationRecord: true }, orderBy: [{ woredaId: "asc" }, { pageNo: "asc" }, { entryNo: "asc" }] }),
      db.migrationRecord.findMany({ include: { woreda: true, file: true }, orderBy: { migratedAt: "asc" } }),
      db.reconciliationReport.findMany({ include: { woreda: true }, orderBy: { createdAt: "desc" } }),
      db.trainingCourse.findMany({ include: { sessions: { include: { trainees: true } } }, orderBy: { code: "asc" } }),
      db.trainingSession.findMany({ include: { course: true, orgUnit: true, trainees: true }, orderBy: { heldAt: "desc" } }),
      db.pilotConfig.findFirst({ include: { subCity: true, dayLogs: { orderBy: { seq: "asc" } } } }),
      db.awarenessItem.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    const exit = await pilotExitCheck();
    // Latest reconciliation per woreda for the console summary.
    const latestByWoreda: Record<string, typeof reconciliations[number]> = {};
    for (const r of reconciliations) {
      if (!latestByWoreda[r.woredaId]) latestByWoreda[r.woredaId] = r;
    }
    return ok({
      books, migrations, reconciliations, latestByWoreda: Object.values(latestByWoreda),
      courses, sessions, pilot, awareness, exit,
    });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const kind = String(input.kind ?? "");
    switch (kind) {
      case "migrate":
        return await withGuard(req, "migration:run",
          { action: "LEGACY_MIGRATE", entity: "MigrationRecord",
            ref: (d: { migrated: number }) => `batch-${d.migrated}`,
            summary: (d: { migrated: number; woredaCode: string }) => `Legacy migration ${d.woredaCode}: ${d.migrated} row(s)` },
          () => migrateLegacyWoreda(String(input.woredaId), input.byStaffCode ? String(input.byStaffCode) : "STF-0001"));
      case "reconcile":
        return await withGuard(req, "reconciliation:run",
          { action: "MIGRATION_RECONCILE", entity: "ReconciliationReport",
            ref: (d: { id: string }[]) => d[0]?.id ?? "none",
            summary: (d: { id: string }[]) => `Reconciliation: ${d.length} woreda report(s)` },
          async () => input.woredaId ? [await reconcileWoreda(String(input.woredaId))] : await reconcileAllMigrated());
      case "training-session":
        return await withGuard(req, "training:record",
          { action: "TRAINING_SESSION", entity: "TrainingSession", ref: (d: { id: string }) => d.id },
          () => createTrainingSession({
            courseCode: String(input.courseCode), heldAt: new Date(String(input.heldAt ?? new Date().toISOString())),
            trainer: String(input.trainer), orgUnitId: String(input.orgUnitId), venue: String(input.venue),
          }));
      case "trainee":
        return await withGuard(req, "training:record",
          { action: "TRAINEE_RECORD", entity: "TraineeRecord", ref: (d: { id: string }) => d.id },
          () => addTrainee({
            sessionId: String(input.sessionId), name: String(input.name),
            staffCode: input.staffCode ? String(input.staffCode) : undefined,
            roleCode: String(input.roleCode),
            attendance: input.attendance === "ABSENT" ? "ABSENT" : "PRESENT",
            assessmentScore: input.assessmentScore != null && input.assessmentScore !== "" ? Number(input.assessmentScore) : undefined,
          }));
      case "pilot-open":
        return await withGuard(req, "pilot:manage",
          { action: "PILOT_OPEN", entity: "PilotConfig", ref: (d: { id: string }) => d.id },
          () => openPilot({
            subCityId: String(input.subCityId),
            woredaCodes: Array.isArray(input.woredaCodes) ? input.woredaCodes.map(String) : String(input.woredaCodes).split(","),
            startedAt: new Date(String(input.startedAt ?? new Date().toISOString())),
            plannedWeeks: Number(input.plannedWeeks ?? 2),
            ownerApprovalRef: String(input.ownerApprovalRef ?? ""),
          }));
      case "pilot-day":
        return await withGuard(req, "pilot:manage",
          { action: "PILOT_DAY_LOG", entity: "PilotDayLog", ref: (d: { id: string }) => d.id },
          () => logPilotDay({
            date: new Date(String(input.date ?? new Date().toISOString())),
            woredaCode: String(input.woredaCode),
            filesOpened: Number(input.filesOpened ?? 0), filesRegistered: Number(input.filesRegistered ?? 0),
            avgCycleMinutes: Number(input.avgCycleMinutes ?? 0),
            checklistCompliancePct: Number(input.checklistCompliancePct ?? 100),
            replicationCorrect: input.replicationCorrect !== false,
            incidents: input.incidents ? String(input.incidents) : undefined,
            severity: input.severity ? (String(input.severity) as "NONE") : undefined,
            supportNotes: input.supportNotes ? String(input.supportNotes) : undefined,
          }));
      case "awareness-create":
        return await withGuard(req, "awareness:manage",
          { action: "AWARENESS_CREATE", entity: "AwarenessItem", ref: (d: { id: string }) => d.id },
          () => createAwarenessItem({
            basis: String(input.basis), channel: String(input.channel),
            titleEn: String(input.titleEn), titleAm: String(input.titleAm), titleOm: String(input.titleOm),
            bodyEn: String(input.bodyEn),
          }));
      case "awareness-approve":
        return await withGuard(req, "awareness:manage",
          { action: "AWARENESS_APPROVE", entity: "AwarenessItem", ref: (d: { id: string }) => d.id },
          () => approveAwarenessItem(String(input.id), String(input.ownerApprovalRef ?? "")));
      default:
        return fail(new Error("Unknown phase7 payload kind"));
    }
  } catch (err) { return fail(err); }
}
