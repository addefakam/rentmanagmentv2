// p6_content_a.js — Phase 6 report chapters 1-5 (Gate G6 package).
// Evidence is read from p6_evidence.json produced by scripts/uat/dump-p6-evidence.ts.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p6_evidence.json");

const run = E.run;
const S = run.summary;

function chapter1() {
  return [
    h1("1. Introduction and Phase 6 Scope"),
    p("Phase 6 is the phase in which the system's own users take over the questioning. The implementation plan defines its objective in one sentence: let the real roles judge the system, using scripts derived from the use cases, and let the legal side certify that automated behaviour matches the directive. In line with that objective, the phase ran three activities. Role-based user acceptance testing rehearsed the principal workflows of Proclamation No. 1320/2016 and Addis Ababa Directive No. 7/2016 in the hands of the roles that perform them daily - registrars, stamping desks, Bureau analysts, the Bureau head, complaint officers, hearing committee members, sub-city monitors and system administrators. The legal validation session then walked the forty-seven-row compliance matrix article by article, confirming behaviour against the source texts and recording any divergence. Defect triage ran continuously, merging every failed acceptance step into a severity-classified defect log with an agreed fix schedule and re-test evidence."),
    p("The phase entered on the owner's Gate G5 approval, with the platform carrying a clean test record: the automated battery stood at one hundred thirteen passing cases across five suites with zero failures, the compliance matrix showed every row passing, and the live audit chain was verified intact. Three open items travelled with the phase by documented disposition: O1 (the directive's fine-ladder figures pending the official Amharic text), O-7 (woreda register reconciliation before the pilot) and O-8 (certification of the Afan Oromo legal glossary under change request CR-01). None of them alters automated behaviour, and each was re-examined during the legal session; the walkthrough records the two that touch matrix rows as confirmations with dispositions rather than deviations."),
    p(`This report is the Gate G6 package. Its chapters follow the deliverables the plan names for this phase: the UAT scripts and their results (chapters 2, 3 and 4), the legal validation session record and the legal validation memorandum (chapters 5 and 6), and the defect log with closure status (chapter 7). Chapter 8 records the trilingual acceptance evidence that change request CR-01 and non-functional requirement NFR-06 require, chapter 9 presents the UAT certificate prepared for the owner's signature together with the gate checklist, and chapter 10 states the gate decision request and the transition to Phase 7. At the time of writing the acceptance battery stands at ${S.scenariosPassed} of ${S.scenarios} scenarios passed with ${S.stepsPassed} of ${S.stepsTotal} steps passed, none failed or skipped, and the legal session concludes with no unresolved deviation.`),
  ];
}

function chapter2() {
  return [
    h1("2. UAT Approach and Acceptance Environment"),
    p("The acceptance approach follows the plan's commitment that scripts are derived from the use cases and executed by the real roles. Every scenario in the catalogue traces to entries of the SRS v1.1 use-case registry, and every step within a scenario names the legal basis it demonstrates, so a reviewer can read each rehearsal as law first and procedure second. Scenarios run over the live HTTP API of the platform - the same interface the console uses - and every call carries the acting officer's staff code. This single design decision makes the acceptance run structurally honest: role separation, tier-based authorization, the legal refusal gates and the audit trail are exercised exactly as a real working session would exercise them, not as a test harness would simulate them. Negative steps are scripted with the same care as positive ones: where the law refuses, the scenario attempts the refused act and expects the refusal with the violated article named."),
    ...tbl({
      caption: "Scenario coverage against the use-case registry",
      headers: ["Scenario", "Role cluster", "Use cases exercised", "Steps"],
      widths: [12, 34, 40, 14],
      zebra: true,
      rows: E.scenarios.map((s) => [s.id, s.role, s.useCases.join(", "), String(s.steps.length)]),
    }),
    p("The acceptance environment is the seeded demonstration environment used throughout construction and testing: one hundred thirty-one organization units arranged in the Ministry - Bureau - sub-city - woreda hierarchy, thirteen roles, the active model contract, the trilingual localization catalogue, and the eight demo staff whose codes (STF-0001 through STF-0008) appear as actors in the scenarios. Test data is created by the scenarios themselves through the public service layer, and the demonstration dataset is restored by reseeding plus the end-to-end walkthrough after the run, so acceptance never consumes fixtures it did not create. The runner writes its evidence to the UAT results register with a run identifier, timestamps, per-step observations and durations, and the console exposes the same evidence live on the P6 tab; both the command-line runner and the console POST action execute the identical battery."),
    p("Two rules govern the run protocol. First, the merge rule: any failed acceptance step is automatically promoted into the defect log as a severity-two defect - a failed acceptance step blocks the workflow it rehearses - and blocks Gate G6 until it is fixed and the battery re-run clean. Second, the re-test rule: after any defect fix, the entire battery re-runs, not only the failed scenario, so that a fix is proven against the whole acceptance surface rather than against its own symptom. Both rules were exercised in this phase: the first battery run surfaced one failed step, triaged as DEF-06-03, which was fixed in-phase and cleared by a full re-run, as chapter 4 records."),
  ];
}

function chapter3() {
  return [
    h1("3. UAT Scenario Catalogue"),
    p("Eight scenarios cover the principal work of the three administrative tiers and the change request. Together they rehearse the complete registration chain from party onboarding to the registry book, the refusal gates at intake, the annual rent adjustment cycle from study to effect, the complaint pipeline inside its statutory clocks, the committee hearing with court escalation, the electronic payment ledger with its boundary conditions, vacancy monitoring with the penalty ladder, and trilingual service delivery. This chapter records the catalogue; chapter 4 records the execution. Each scenario's steps carry their own legal basis, so the tables in chapter 4 double as a walkthrough of the law in working order."),
    ...tbl({
      caption: "UAT scenario catalogue (as executed)",
      headers: ["ID", "Title", "Actors", "Legal basis", "Objective (abridged)"],
      widths: [8, 24, 14, 20, 34],
      zebra: true,
      rows: E.scenarios.map((s) => [
        s.id, s.title, s.actors.join(", "), s.legalBasis, s.objective.split(". ")[0] + ".",
      ]),
    }),
    p("Three design choices in the catalogue deserve explanation. UAT-02 and parts of UAT-04 and UAT-06 are deliberately negative rehearsals: they attempt the acts the law refuses - a one-year lease, a three-month advance, filing at the wrong office, certifying before the checklist, a stamper performing a registrar act, a complaint on a ground outside the eight statutory grounds, a payment against an unregistered contract - and expect refusal with the article named. UAT-05 rehearses the two-sided nature of appeal justice: a timely appeal must be heard, and a late appeal must be refused, both in the same scenario. UAT-08 exists because of change request CR-01: the owner's instruction to add Afan Oromo made trilingual delivery a first-class acceptance concern, and the scenario inspects the localization catalogue, the model contract sections, the public publication feed, the staff language register and the compliance matrix row that binds them."),
  ];
}

function chapter4() {
  const rows = E.scenarios.map((s) => [
    s.id, s.title, s.verdict, `${s.stepsPassed}/${s.steps.length}`, s.durationMs + " ms",
  ]);
  return [
    h1("4. UAT Execution Results"),
    p(`The battery was executed twice. The first run (identifier ${E.firstRun.runId}) passed seven of eight scenarios; its single failed step was UAT-03 step 5, where ceiling validation was governed by a stale fixture left in the shared demonstration database by a Phase 5 compliance case - an adjustment dated year 2099 at fifteen percent persisted as the latest effected rate set. Triage classified the artifact as test data rather than a rule defect: platform behaviour follows Proclamation Article 8 correctly, since the latest effected rate set necessarily governs. The fix removed the stale row, added fixture cleanup to the compliance case, and made the rehearsal name its applicable rate set explicitly. The full battery then re-ran clean.`),
    ...tbl({
      caption: `Second (final) battery run ${run.runId} - ${new Date(run.generatedAt).toISOString().slice(0, 10)}`,
      headers: ["Scenario", "Title", "Verdict", "Steps passed", "Duration"],
      widths: [10, 46, 12, 16, 16],
      zebra: true,
      rows,
    }),
    p(`The final run ${run.runId} recorded ${S.stepsPassed} of ${S.stepsTotal} steps passed in ${run.durationMs} milliseconds over the live API, with no step failed or skipped. Every scenario passed in the hands of its own role cluster, which is the acceptance claim the plan makes at this gate: real roles can execute real work. The step-level evidence follows; each table lists the action taken, the observed platform response as recorded by the runner, the legal basis of the step, and the result.`),
    ...E.scenarios.flatMap((s) => [
      h2(`4.${E.scenarios.indexOf(s) + 1} ${s.id}: ${s.title}`),
      p(`${s.objective} Actors: ${s.actors.join(", ")}. Traces to use cases ${s.useCases.join(", ")}.`),
      ...tbl({
        caption: `${s.id} step evidence (verdict ${s.verdict}, ${s.stepsPassed}/${s.steps.length} steps passed)`,
        headers: ["No", "Action", "Observed result", "Legal basis", "Result"],
        widths: [5, 30, 39, 18, 8],
        zebra: true,
        rows: s.steps.map((st) => [
          String(st.no), st.action, st.observed, st.legalBasis, st.result,
        ]),
      }),
    ]),
    p("Two observations from the step evidence are worth drawing out. First, the refusal steps returned the violated article in every case - the platform never refuses silently - which is the property that makes the refusal gates auditable in production as they were auditable here. Second, the payment rehearsal (UAT-06) demonstrated the settle-before-ledger ordering with a bank provider reference stored on the receipt, and the automatic ten-percent cash referral opened a case for 1,200 ETB against 12,000 ETB rent exactly as Directive Article 22 prescribes; both behaviours had passed in the Phase 5 suites, and seeing them survive the role-based rehearsal is precisely what user acceptance adds."),
  ];
}

function chapter5() {
  const LS = E.legalSession;
  const dispRows = LS.walkthrough.filter((r) => r.verdict === "CONFIRMED_W_DISPOSITION");
  const moduleRows = {};
  for (const r of LS.walkthrough) {
    for (const m of r.module.split("/")) moduleRows[m.trim()] = (moduleRows[m.trim()] || 0) + 1;
  }
  return [
    h1("5. Legal Validation Session"),
    p("The legal validation session is the phase's second activity and the gate's decisive one: the plan requires the legal side to certify that automated behaviour matches the directive, recording every deviation and its resolution. The session walked the forty-seven-row legal compliance test matrix article by article. For every row it read the source article, reviewed the platform behaviour demonstrated by the named Phase 5 test results and by the Phase 6 role-based rehearsals, and recorded one of three verdicts: confirmed, confirmed with disposition (behaviour matches; a pending external confirmation is carried with an explicit plan and does not change behaviour), or deviation (behaviour diverges from the article and must be resolved before the memorandum can conclude)."),
    ...tbl({
      caption: "Session record",
      headers: ["Field", "Record"],
      widths: [22, 78],
      zebra: true,
      rows: [
        ["Date", LS.session.date],
        ["Venue", LS.session.venue],
        ["Chair", LS.session.chair],
        ["Attendees", LS.session.attendees.map((a) => a.role + " (" + a.designation + ")").join("; ")],
        ["Method", LS.session.method],
        ["Scope", LS.session.scope],
      ],
    }),
    ...tbl({
      caption: "Walkthrough verdict summary (47 rows)",
      headers: ["Verdict", "Rows", "Meaning"],
      widths: [30, 10, 60],
      zebra: true,
      rows: [
        ["Confirmed", String(LS.counts.confirmed), "Automated behaviour matches the source article; named test case(s) pass; where rehearsed, the UAT scenario passed in the role's hands."],
        ["Confirmed with disposition", String(LS.counts.confirmedWithDisposition), "Behaviour matches; a pending external confirmation is carried with a documented disposition and does not alter system behaviour."],
        ["Deviation", String(LS.counts.deviations), "Behaviour diverges from the article. The deviation register below is the complete list; the memorandum cannot conclude while any entry is open."],
      ],
    }),
    p("The two confirmed-with-disposition rows are explicit. TC-D21 walks Directive Article 22, whose offense-level fine figures await the official Amharic text under open item O1; the platform already implements the figures as configurable parameters marked pending official text, so the certification awaits an external text, not a code change. TC-N06 walks non-functional requirement NFR-06 together with change request CR-01: trilingual delivery is implemented and rehearsed in UAT-08, and the certified Afan Oromo legal glossary (open item O-8) is scheduled with the Bureau before the Phase 7 pilot, with the English fallback active meanwhile exactly as NFR-06 prescribes. The full walkthrough - every row with its source, rule, module, test status, UAT scenarios and verdict - is reproduced in the memorandum chapter and in the console's live P6 tab."),
    p("Coverage of the walkthrough across modules is complete: rows span party and property registration (M1-M2), contract management (M3), registration and certification (M4-M5), payments (M6), complaints, appeals and hearings (M7-M9), control and penalties (M10-M11), publications and analytics (M12), platform services and localization (M13), and the non-functional rows NFR-04, NFR-06, NFR-07 and NFR-12. The deviation register that the session hands to the memorandum is empty. No entry requires resolution, and the gate criterion of a legal memorandum with no unresolved deviation is met."),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5 };
