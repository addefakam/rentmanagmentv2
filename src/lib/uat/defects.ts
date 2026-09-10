// ============================================================================
// defects.ts — Phase 6 DEFECT TRIAGE framework (plan §5.7, activity 3).
// Severity definitions with fix schedules, the defect log with closure
// status, and the merge rule that turns any failed UAT step into a triaged
// defect. Gate G6 requires: a signed UAT certificate and a legal memorandum
// with no unresolved deviation - so no open SEV-1/SEV-2 may remain here.
// ============================================================================

import type { UatEvidence } from "./executors";

export type SeverityDef = {
  code: string;
  name: string;
  definition: string;
  fixSchedule: string;
  reTest: string;
};

export const SEVERITY_DEFS: SeverityDef[] = [
  {
    code: "SEV-1", name: "Critical",
    definition: "A legal gate is not enforced, data is lost or corrupted, or a core workflow is blocked for all users. The system cannot lawfully operate until fixed.",
    fixSchedule: "Immediate; fix before any further acceptance activity.",
    reTest: "Full battery re-run plus the named compliance case.",
  },
  {
    code: "SEV-2", name: "Major",
    definition: "A principal workflow is blocked or produces a legally wrong outcome for a class of cases, with no acceptable workaround.",
    fixSchedule: "Within the phase; blocks the gate while open.",
    reTest: "Failed scenario re-run end to end.",
  },
  {
    code: "SEV-3", name: "Minor",
    definition: "A defect with a legal or operational workaround, or limited to a secondary surface (e.g. a read-path control with all mutating paths guarded).",
    fixSchedule: "Scheduled with an explicit due phase; does not block the gate while the disposition is agreed.",
    reTest: "Targeted re-test at the scheduled phase.",
  },
  {
    code: "SEV-4", name: "Observation",
    definition: "Working as designed but flagged for improvement, or pending an external confirmation that does not change behaviour.",
    fixSchedule: "Tracked on the improvement/open-item backlog.",
    reTest: "Verified at the next touching phase.",
  },
];

export type Defect = {
  id: string;
  title: string;
  source: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
  foundAt: string;
  status: "OPEN" | "FIXED_RE_TESTED" | "CLOSED" | "SCHEDULED";
  fixSchedule: string;
  reTestEvidence: string;
};

// Defects known at Phase 6 entry. Anything the UAT battery fails is merged in
// by mergeUatDefects() with a SEV-2 default (a failed acceptance step blocks
// the workflow it rehearses) until triaged otherwise.
export const BASE_DEFECT_LOG: Defect[] = [
  {
    id: "DEF-06-01",
    title: "Console read-path authorization gap (carried from Phase 5 security assessment finding F-1)",
    source: "Phase 5 security assessment (F-1); OWASP ASVS V4",
    severity: "SEV-3",
    foundAt: "Phase 5",
    status: "SCHEDULED",
    fixSchedule: "Phase 8 go-live hardening: enforce capability checks on console read endpoints before city-wide exposure; pilot scope (Phase 7) operates inside the trusted office network.",
    reTestEvidence: "Targeted re-test scheduled with the Phase 8 security regression pack (TC-SEC series).",
  },
  {
    id: "DEF-06-02",
    title: "Afan Oromo legal terminology pending certified glossary (open item O-8; CR-01 fallback active)",
    source: "CR-01 language change; NFR-06 fallback rule",
    severity: "SEV-4",
    foundAt: "Phase 6 entry (UAT-08 rehearsal)",
    status: "OPEN",
    fixSchedule: "Certification workshop with the Bureau before the Phase 7 pilot; terminology marked PENDING_CERTIFICATION until then; English fallback per NFR-06.",
    reTestEvidence: "UAT-08 step set re-runs after certification; glossary sign-off attached to the Phase 7 pilot exit report.",
  },
  {
    id: "DEF-06-03",
    title: "Phase 5 compliance fixture (year-2099 adjustment at 15%) persisted in the shared demonstration database and governed ceiling validation as the latest effected rate set",
    source: "Phase 6 UAT battery run UATRUN-1789026404379 (UAT-03 step 5)",
    severity: "SEV-4",
    foundAt: "Phase 6 UAT battery (first run)",
    status: "FIXED_RE_TESTED",
    fixSchedule: "Fixed in-phase: TC-P08 now cleans up its fixture rows after asserting (test hygiene); the stale 2099 row was removed from the demonstration database; the UAT-03 rehearsal now names the applicable rate set and derives the expected ceiling from it. Platform behaviour was reviewed and is legally correct (Proc. Art. 8 annual cycle: the latest effected rate set governs) - the artifact was test data, not a rule defect.",
    reTestEvidence: "Compliance suite re-run (TC-P08 pass, fixture cleaned) + UAT battery re-run with all steps passing.",
  },
];

export function mergeUatDefects(evidence: UatEvidence | null, startSeq: number): Defect[] {
  if (!evidence) return [];
  const out: Defect[] = [];
  for (const scenario of evidence.scenarios) {
    for (const step of scenario.steps.filter((s) => s.result === "FAIL")) {
      out.push({
        id: `DEF-06-${String(startSeq + out.length).padStart(2, "0")}`,
        title: `${scenario.id} step ${step.no} failed: ${step.action}`,
        source: `Phase 6 UAT battery run ${evidence.runId}`,
        severity: "SEV-2",
        foundAt: evidence.generatedAt,
        status: "OPEN",
        fixSchedule: "Within Phase 6; blocks Gate G6 while open (fix, re-run the battery, re-test).",
        reTestEvidence: "Re-run of the UAT battery after fix; the failed step must pass with the legal rule correctly enforced.",
      });
    }
  }
  return out;
}

export function buildDefectLog(evidence: UatEvidence | null): { log: Defect[]; openSev12: number } {
  const uatDefects = mergeUatDefects(evidence, BASE_DEFECT_LOG.length + 1);
  const log = [...BASE_DEFECT_LOG, ...uatDefects];
  const openSev12 = log.filter(
    (d) => (d.severity === "SEV-1" || d.severity === "SEV-2") && (d.status === "OPEN" || d.status === "SCHEDULED"),
  ).length;
  return { log, openSev12 };
}

export const G6_CHECKLIST: { criterion: string; basis: string; evidence: string }[] = [
  {
    criterion: "Role-based UAT executed: scripts derived from the use cases, run by the real roles",
    basis: "Plan §5.7 activity 1",
    evidence: "8 scenarios / 48 steps over the live API with officer staff codes; results in the UAT results register and Chapter 4 of the Phase 6 report.",
  },
  {
    criterion: "Legal validation session held article-by-article on the compliance matrix",
    basis: "Plan §5.7 activity 2",
    evidence: "Legal validation session record (47 rows walked) and the legal validation memorandum LVM-G6-2026-01.",
  },
  {
    criterion: "Legal memorandum concludes with no unresolved deviation",
    basis: "Gate G6 exit criterion",
    evidence: "Memorandum conclusion; deviation register empty or resolved; pending confirmations O1/O-7/O-8 carried as dispositions.",
  },
  {
    criterion: "Defect triage with severity definitions and agreed fix schedule; re-tests executed",
    basis: "Plan §5.7 activity 3",
    evidence: "Severity framework (SEV-1..4) and the defect log with closure status; no open SEV-1/SEV-2 at gate time.",
  },
  {
    criterion: "UAT certificate prepared for the owner's signature",
    basis: "Gate G6 exit criterion",
    evidence: "UAT certificate (Phase 6 report Chapter 9) summarizing scenario coverage and verdict; owner signs at the gate.",
  },
  {
    criterion: "Trilingual delivery (CR-01) accepted by role-holders",
    basis: "SRS v1.1 NFR-06 / CR-01",
    evidence: "UAT-08 rehearsal: localization catalogue, model contract, publications, staff language register and TC-N06 all confirmed in three languages.",
  },
];
