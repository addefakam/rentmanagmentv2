// /api/phase8 — Go-Live, Operations and Continuous Improvement evidence
// (plan section 5.9; Gate G8 order execution and Gate G9 package).
// GET  : waves + cutover checklists, drills, support roster, hypercare plan
//        and daily reports, O-7 confirmation, configuration freeze, awareness
//        distribution, auth mode, G8 readiness, Part B operations summary
//        (annual cycle, referrals, Ministry feeds, handover, PIR, closure
//        minute, G9 check).
// POST : action dispatcher over capability-guarded service calls:
//        o7-confirm, checklist-execute, drill-rollback, drill-restore,
//        drill-record, freeze-config, hypercare-sign, awareness-distribute,
//        auth-mode, golive-order, golive-execute, hypercare-log,
//        hypercare-close, cycle-operate, referral-create, referral-outcome,
//        feed-publish, pir-run, pir-finding, minute-draft, minute-sign.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import {
  confirmO7Register, o7Summary, freezeConfiguration, verifyConfigFreeze,
  runRestoreDrill, runRollbackDrill, recordSessionDrill, recordPerfDrill,
  upsertRoster, signHypercarePlan, distributeAwareness,
  executeCutoverChecklist, giveGoLiveOrder, g8Check, prepareWaves,
} from "@/lib/domain/phase8";
import {
  executeGoLiveOrder, logHypercareDay, closeHypercare, operateAnnualCycle,
  createEnforcementReferral, recordReferralOutcome, publishMinistryFeed,
  runPostImplementationReview, addPirFinding, draftClosureMinute,
  signClosureMinute, operationsSummary,
} from "@/lib/domain/operations";
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
    const [o7, readiness, authMode, operations] = await Promise.all([o7Summary(), g8Check(), getAuthMode(), operationsSummary()]);
    return ok({
      waves, drills, roster, hypercare, freeze, awareness, sessions, o7, readiness, authMode, operations,
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
      case "golive-execute":
        return await withGuard(req, "golive:order",
          { action: "GO_LIVE_ORDER_EXECUTE", entity: "GoLiveWave", ref: (d: { code: string }) => d.code,
            summary: (d: { code: string; goLiveOrderRef: string | null }) => `Go-live order ${d.goLiveOrderRef} executed on ${d.code} with the production switch` },
          () => executeGoLiveOrder(String(input.waveCode ?? "WAVE-1"), String(input.orderRef ?? ""), { staffCode: "x" }));
      case "hypercare-log":
        return await withGuard(req, "operations:manage",
          { action: "HYPERCARE_DAY_LOG", entity: "HypercareReport", ref: (d: { dayNumber: number }) => `${String(input.waveCode ?? "WAVE-1")}-day-${d.dayNumber}` },
          () => logHypercareDay({
            waveCode: String(input.waveCode ?? "WAVE-1"), dayNumber: Number(input.dayNumber ?? 0),
            reportDate: input.reportDate ? new Date(String(input.reportDate)) : undefined,
            ticketsOpened: Number(input.ticketsOpened ?? 0), ticketsClosed: Number(input.ticketsClosed ?? 0),
            sev1: Number(input.sev1 ?? 0), sev2: Number(input.sev2 ?? 0),
            sev3: Number(input.sev3 ?? 0), sev4: Number(input.sev4 ?? 0),
            slaMet: input.slaMet === undefined ? true : Boolean(input.slaMet),
            breaches: input.breaches ? String(input.breaches) : undefined,
            notes: input.notes ? String(input.notes) : undefined,
            staffCode: "x",
          }));
      case "hypercare-close":
        return await withGuard(req, "operations:manage",
          { action: "HYPERCARE_CLOSE_HANDOVER", entity: "OperationsHandover", ref: (d: { reference: string }) => d.reference,
            summary: (d: { manualVersion: string }) => `Hypercare closed; operations handover signed (${d.manualVersion})` },
          () => closeHypercare({
            waveCode: String(input.waveCode ?? "WAVE-1"), reference: String(input.reference ?? ""),
            manualVersion: String(input.manualVersion ?? "OPS-MANUAL-v1.1"),
            runbookRef: String(input.runbookRef ?? "RUNBOOK-v1.1"),
            signedBy: String(input.signedBy ?? ""), staffCode: "x",
            notes: input.notes ? String(input.notes) : undefined,
          }));
      case "cycle-operate":
        return await withGuard(req, "operations:manage",
          { action: "ANNUAL_CYCLE_OPERATE", entity: "AnnualCycleStep", ref: (d: { cycleYear: number }) => `AC-${d.cycleYear}` ,
            summary: (d: { cycleYear: number }) => `Annual adjustment cycle ${d.cycleYear} recorded end to end (Proc. Art. 8)` },
          () => operateAnnualCycle({
            cycleYear: Number(input.cycleYear ?? new Date().getUTCFullYear()),
            percentage: Number(input.percentage ?? 8),
            studyRef: String(input.studyRef ?? ""), staffCode: "x",
          }));
      case "referral-create":
        return await withGuard(req, "operations:manage",
          { action: "ENFORCEMENT_REFERRAL_CREATE", entity: "EnforcementReferral", ref: (d: { reference: string }) => d.reference,
            summary: (d: { reference: string; competentBody: string }) => `Referral ${d.reference} sent to ${d.competentBody}` },
          () => createEnforcementReferral({
            offenseCode: input.offenseCode ? String(input.offenseCode) : undefined,
            subjectType: input.subjectType ? String(input.subjectType) : undefined,
            subjectRef: input.subjectRef ? String(input.subjectRef) : undefined,
            monthlyRentRef: input.monthlyRentRef != null ? Number(input.monthlyRentRef) : undefined,
            basisRef: String(input.basisRef ?? "Dir. Art. 22"),
            kind: String(input.referralKind ?? "PENALTY_REFERRAL"),
            subject: String(input.subject ?? ""),
            competentBody: String(input.competentBody ?? ""),
            amount: input.amount != null ? Number(input.amount) : undefined,
            notes: input.notes ? String(input.notes) : undefined,
            staffCode: "x",
          }));
      case "referral-outcome":
        return await withGuard(req, "operations:manage",
          { action: "ENFORCEMENT_REFERRAL_OUTCOME", entity: "EnforcementReferral", ref: (d: { reference: string }) => d.reference,
            summary: (d: { reference: string; status: string }) => `Referral ${d.reference} -> ${d.status}` },
          () => recordReferralOutcome(String(input.reference ?? ""), {
            status: String(input.status ?? ""),
            outcomeRef: input.outcomeRef ? String(input.outcomeRef) : undefined,
            recovered: input.recovered != null ? Number(input.recovered) : undefined,
            notes: input.notes ? String(input.notes) : undefined,
          }, "x"));
      case "feed-publish":
        return await withGuard(req, "feed:publish",
          { action: "MINISTRY_FEED_PUBLISH", entity: "MinistryFeedPublication", ref: (d: { period: string }) => d.period,
            summary: (d: { period: string; itemCount: number }) => `Ministry feed ${d.period} published (${d.itemCount} records)` },
          () => publishMinistryFeed(String(input.period ?? ""), "x"));
      case "pir-run":
        return await withGuard(req, "operations:manage",
          { action: "PIR_RUN", entity: "PirRecord", ref: (d: { reference: string }) => d.reference,
            summary: (d: { reference: string }) => `Ninety-day post-implementation review ${d.reference} conducted` },
          () => runPostImplementationReview({ reference: String(input.reference ?? ""), conductedBy: "x", summary: input.summary ? String(input.summary) : undefined }));
      case "pir-finding":
        return await withGuard(req, "operations:manage",
          { action: "PIR_FINDING_RECORD", entity: "PirFinding", ref: () => String(input.pirReference ?? ""),
            summary: (d: { category: string; disposition: string }) => `PIR finding recorded: ${d.category}/${d.disposition}` },
          () => addPirFinding({
            pirReference: String(input.pirReference ?? ""), category: String(input.category ?? ""),
            description: String(input.description ?? ""), severity: String(input.severity ?? ""),
            disposition: String(input.disposition ?? ""),
            backlogRef: input.backlogRef ? String(input.backlogRef) : undefined,
          }));
      case "minute-draft":
        return await withGuard(req, "operations:manage",
          { action: "CLOSURE_MINUTE_DRAFT", entity: "ClosureMinute", ref: (d: { reference: string }) => d.reference,
            summary: (d: { reference: string }) => `Closure minute ${d.reference} drafted with lessons` },
          () => draftClosureMinute({
            reference: String(input.reference ?? ""),
            lessons: (input.lessons ?? []) as string[],
            transitions: (input.transitions ?? []) as string[],
            openItems: (input.openItems ?? []) as string[],
            staffCode: "x",
          }));
      case "minute-sign":
        return await withGuard(req, "golive:order",
          { action: "CLOSURE_MINUTE_SIGN", entity: "ClosureMinute", ref: (d: { reference: string }) => d.reference,
            summary: (d: { reference: string; g9Ref: string | null }) => `Closure minute ${d.reference} signed under ${d.g9Ref}` },
          () => signClosureMinute(String(input.reference ?? ""), {
            g9Ref: String(input.g9Ref ?? ""), signedBy: String(input.signedBy ?? "Owner"),
          }));
      case "prepare-waves":
        return await withGuard(req, "phase8:manage",
          { action: "WAVES_PREPARE", entity: "GoLiveWave", ref: (d: { length: number }) => `waves-${d.length}` },
          () => prepareWaves());
      default:
        return fail(new Error("Unknown phase8 payload kind"));
    }
  } catch (err) { return fail(err); }
}
