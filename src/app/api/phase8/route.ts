// /api/phase8 — Go-Live, Operations and Continuous Improvement evidence
// (plan section 5.9; Gate G8 package).
// GET  : waves + cutover checklist, drills, support roster, hypercare plan,
//        O-7 confirmation summary, configuration freeze, awareness
//        distribution, auth mode, G8 readiness check.
// POST : action dispatcher over capability-guarded service calls:
//        o7-confirm, checklist-execute, drill-rollback, drill-restore,
//        drill-record, freeze-config, hypercare-sign, awareness-distribute,
//        auth-mode, golive-order.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import {
  confirmO7Register, o7Summary, freezeConfiguration, verifyConfigFreeze,
  runRestoreDrill, runRollbackDrill, recordSessionDrill, recordPerfDrill,
  upsertRoster, signHypercarePlan, distributeAwareness,
  executeCutoverChecklist, giveGoLiveOrder, g8Check, prepareWaves,
} from "@/lib/domain/phase8";
import { setAuthMode, getAuthMode, withReadGuard } from "@/lib/security/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await withReadGuard(req, { capability: "read:phase8", entity: "Phase 8 go-live evidence" });
    const [waves, drills, roster, hypercare, freeze, awareness, sessions] = await Promise.all([
      db.goLiveWave.findMany({ include: { items: { orderBy: { seq: "asc" } } }, orderBy: { plannedOrder: "asc" } }),
      db.drillRun.findMany({ orderBy: { ranAt: "desc" } }),
      db.supportRosterEntry.findMany({ orderBy: { escalationLevel: "asc" } }),
      db.hypercarePlan.findMany({ orderBy: { signedAt: "desc" } }),
      verifyConfigFreeze(),
      db.awarenessItem.findMany({ orderBy: { createdAt: "asc" } }),
      db.productionSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);
    const [o7, readiness, authMode] = await Promise.all([o7Summary(), g8Check(), getAuthMode()]);
    return ok({
      waves, drills, roster, hypercare, freeze, awareness, sessions, o7, readiness, authMode,
    });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const kind = String(input.kind ?? "");
    switch (kind) {
      case "o7-confirm":
        return await withGuard(req, "phase8:manage",
          { action: "O7_CONFIRM", entity: "O7Confirmation",
            ref: (d: { confirmed: number }) => `o7-${d.confirmed}`,
            summary: (d: { confirmed: number; total: number }) => `O-7 register confirmation: ${d.confirmed}/${d.total} sub-cities confirmed` },
          () => confirmO7Register({
            officialCounts: input.officialCounts as Record<string, number> | undefined,
            sourceRef: input.sourceRef ? String(input.sourceRef) : undefined,
          }));
      case "checklist-execute":
        return await withGuard(req, "phase8:manage",
          { action: "CUTOVER_CHECKLIST_EXECUTE", entity: "CutoverItem",
            ref: (d: { waveCode: string }) => d.waveCode,
            summary: (d: { allGreen: boolean }) => `Cutover checklist executed for ${String(input.waveCode)}: ${d.allGreen ? "all GREEN" : "blocked items present"}` },
          async () => executeCutoverChecklist(String(input.waveCode ?? "WAVE-1"), { staffCode: "x" }));
      case "drill-rollback":
        return await withGuard(req, "phase8:manage",
          { action: "ROLLBACK_DRILL", entity: "DrillRun", ref: (d: { id: string }) => d.id },
          () => runRollbackDrill("STF-0008"));
      case "drill-restore":
        return await withGuard(req, "phase8:manage",
          { action: "RESTORE_DRILL", entity: "DrillRun", ref: (d: { id: string }) => d.id },
          () => runRestoreDrill("STF-0008"));
      case "drill-record": {
        const evidence = (input.evidence ?? {}) as Record<string, unknown>;
        const drillKind = String(input.drillKind ?? "");
        return await withGuard(req, "phase8:manage",
          { action: `DRILL_RECORD_${drillKind.toUpperCase()}`, entity: "DrillRun", ref: (d: { id: string }) => d.id },
          () => drillKind === "SESSION_HARDENING"
            ? recordSessionDrill("STF-0008", evidence)
            : recordPerfDrill("STF-0008", evidence as { profiles: { profile: string; p95?: number; targetMs?: number }[]; generatedAt: string }));
      }
      case "freeze-config":
        return await withGuard(req, "phase8:manage",
          { action: "CONFIG_FREEZE", entity: "ConfigFreeze", ref: (d: { version: string }) => d.version },
          () => freezeConfiguration("STF-0008", input.note ? String(input.note) : undefined));
      case "hypercare-sign":
        return await withGuard(req, "phase8:manage",
          { action: "HYPERCARE_SIGN", entity: "HypercarePlan", ref: (d: { reference: string }) => d.reference },
          () => signHypercarePlan({
            waveCode: String(input.waveCode ?? "WAVE-1"),
            days: Number(input.days ?? 28),
            dailyReportTime: String(input.dailyReportTime ?? "18:00"),
            sla: (input.sla ?? {}) as Record<string, string>,
            signedBy: String(input.signedBy ?? ""),
            reference: String(input.reference ?? ""),
          }));
      case "awareness-distribute":
        return await withGuard(req, "awareness:manage",
          { action: "AWARENESS_DISTRIBUTE", entity: "AwarenessItem",
            ref: (d: { distributionRef: string }) => d.distributionRef,
            summary: (d: { distributed: number }) => `Awareness distribution: ${d.distributed} material(s)` },
          () => distributeAwareness(String(input.distributionRef ?? ""), String(input.byStaffCode ?? "STF-0007")));
      case "auth-mode":
        return await withGuard(req, "setting:manage",
          { action: "AUTH_MODE_SET", entity: "PlatformSetting", ref: () => "auth_mode",
            summary: (d: { value: string }) => `Authentication mode set to ${d.value}` },
          () => setAuthMode(String(input.mode ?? "demo") === "production" ? "production" : "demo", "STF-0008"));
      case "golive-order":
        return await withGuard(req, "golive:order",
          { action: "GO_LIVE_ORDER", entity: "GoLiveWave", ref: (d: { code: string }) => d.code,
            summary: (d: { code: string; goLiveOrderRef: string | null }) => `Go-live order ${d.goLiveOrderRef} executed on ${d.code}` },
          () => giveGoLiveOrder(String(input.waveCode ?? "WAVE-1"), String(input.orderRef ?? ""), { staffCode: "x" }));
      case "prepare-waves":
        return await withGuard(req, "phase8:manage",
          { action: "WAVES_PREPARE", entity: "GoLiveWave", ref: (d: { length: number }) => `waves-${d.length}` },
          () => prepareWaves());
      default:
        return fail(new Error("Unknown phase8 payload kind"));
    }
  } catch (err) { return fail(err); }
}
