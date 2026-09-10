// ============================================================================
// /api/uat — Phase 6 User Acceptance and Legal Validation evidence.
// GET  : UAT scripts, last battery run (attached results), legal validation
//        session + memorandum, defect log with severity framework, G6
//        checklist, and the localization catalogue (CR-01/NFR-06) for UAT-08.
// POST : runs the full UAT battery over the live API (capability "uat:run")
//        and attaches the results as the newest evidence.
// ============================================================================
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import { UAT_SCENARIOS } from "@/lib/uat/scripts";
import { runUatBattery, type UatEvidence } from "@/lib/uat/executors";
import { buildLegalSession } from "@/lib/uat/legal-session";
import { buildDefectLog, SEVERITY_DEFS, G6_CHECKLIST } from "@/lib/uat/defects";

export const dynamic = "force-dynamic";

const RESULTS_FILE = "src/lib/uat/results.json";

function readLastRun(): UatEvidence | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), RESULTS_FILE), "utf-8")) as UatEvidence;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const lastRun = readLastRun();
    const [languages, resources] = await Promise.all([
      db.language.findMany({ orderBy: { code: "asc" } }),
      db.localizationResource.findMany({ orderBy: { key: "asc" } }),
    ]);
    const { log, openSev12 } = buildDefectLog(lastRun);
    return ok({
      scenarios: UAT_SCENARIOS,
      lastRun,
      localization: {
        languages: languages.filter((l) => l.status === "ACTIVE").map((l) => l.code),
        languageRows: languages.map((l) => ({ code: l.code, nameNative: l.nameNative, status: l.status })),
        resourceCount: resources.length,
        pendingCertification: resources.filter((r) => r.certificationStatus === "PENDING_CERTIFICATION").length,
        fallbackDeclared: true, // NFR-06 fallback rule (O-8)
      },
      legalSession: buildLegalSession(lastRun),
      defects: { log, openSev12, severityDefs: SEVERITY_DEFS },
      gateChecklist: G6_CHECKLIST,
    });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    return await withGuard(req, "uat:run",
      { action: "UAT_RUN", entity: "UatEvidence", ref: (d: UatEvidence) => d.runId,
        summary: (d: UatEvidence) => `UAT battery ${d.summary.verdict}: ${d.summary.stepsPassed}/${d.summary.stepsTotal} steps` },
      async () => {
        const baseUrl = new URL(req.url).origin;
        const evidence = await runUatBattery(baseUrl);
        writeFileSync(join(process.cwd(), RESULTS_FILE), JSON.stringify(evidence, null, 2));
        return evidence;
      });
  } catch (err) { return fail(err); }
}
