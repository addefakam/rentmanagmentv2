// p6_content_b.js — Phase 6 report chapters 6-10 (Gate G6 package).
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p6_evidence.json");
const LS = E.legalSession;

function chapter6() {
  return [
    h1("6. Legal Validation Memorandum LVM-G6-2026-01"),
    p("The memorandum below is the session's formal output and the document the gate criterion names. It is reproduced here in full, as issued to the project owner, with its signatories. The owner signs at Gate G6 alongside the UAT certificate; the signatory block deliberately leaves the owner's line open for that signature."),
    ...tbl({
      caption: "Memorandum header",
      headers: ["Field", "Value"],
      widths: [18, 82],
      zebra: true,
      rows: [
        ["Reference", LS.memorandum.reference],
        ["To", LS.memorandum.to],
        ["From", LS.memorandum.from],
        ["Date", LS.memorandum.date],
        ["Subject", LS.memorandum.subject],
      ],
    }),
    h2("6.1 Memorandum body"),
    ...LS.memorandum.body.map((para) => p(para)),
    h2("6.2 Signatories"),
    ...tbl({
      caption: "Memorandum signatories",
      headers: ["Role", "Name", "Capacity"],
      widths: [32, 24, 44],
      zebra: true,
      rows: LS.memorandum.signatories.map((sg) => [sg.role, sg.name, sg.capacity]),
    }),
    p("With the deviation register empty and the two pending external confirmations carried as dispositions, the memorandum concludes that automated behaviour matches Proclamation No. 1320/2016, Addis Ababa Directive No. 7/2016 and the annexed model agreement across the full matrix. This is the legal-side half of the Gate G6 exit condition; the owner-side half is the signed UAT certificate presented in chapter 9."),
  ];
}

function chapter7() {
  return [
    h1("7. Defect Triage and Defect Log"),
    p("Defect triage is the phase's third activity, and its framework was fixed before the battery ran so that findings would land in a prepared structure rather than in ad-hoc judgement. Four severities are defined, each with a definition, a fix schedule and a re-test rule. The merge rule binds the framework to acceptance: any failed UAT step enters the log automatically as severity two, because a failed acceptance step blocks the workflow it rehearses, and it blocks the gate until fixed and re-tested. Severity one blocks any further acceptance activity outright; severity two blocks the gate while open; severity three enters a scheduled disposition with an explicit due phase; severity four records observations and pending external confirmations that do not change behaviour."),
    ...tbl({
      caption: "Severity framework",
      headers: ["Code", "Name", "Definition (abridged)", "Fix schedule"],
      widths: [9, 12, 51, 28],
      zebra: true,
      rows: E.defects.severityDefs.map((d) => [d.code, d.name, d.definition, d.fixSchedule]),
    }),
    ...tbl({
      caption: `Defect log with closure status (open severity-1/2 count: ${E.defects.openSev12})`,
      headers: ["ID", "Severity", "Status", "Title", "Fix schedule / re-test evidence"],
      widths: [10, 9, 13, 34, 34],
      zebra: true,
      rows: E.defects.log.map((d) => [
        d.id, d.severity, d.status, d.title, d.fixSchedule + " Re-test: " + d.reTestEvidence,
      ]),
    }),
    p(`Three defects are recorded, and none is open at severity one or two. DEF-06-01 carries the Phase 5 security finding F-1 (console read-path authorization) as a severity-three item scheduled into the Phase 8 go-live hardening, where real session management binds to the national identity provider; the pilot scope operates inside the trusted office network and no state change is possible without an authorized officer. DEF-06-02 is the pending certification of the Afan Oromo legal glossary (open item O-8), severity four because the NFR-06 fallback keeps service correct while the workshop with the Bureau is scheduled before the Phase 7 pilot. DEF-06-03, the stale compliance fixture surfaced by the first battery run, was fixed in-phase and cleared by the full re-run: the fixture row was removed, the compliance case now cleans up after itself, and the rehearsal names its applicable rate set explicitly. The gate criterion - defect triage with severity definitions and agreed fix schedules, re-tests executed, no open severity-one or severity-two defect - is met.`),
  ];
}

function chapter8() {
  return [
    h1("8. Trilingual Acceptance (CR-01 / NFR-06)"),
    p("Change request CR-01, approved by the owner at Gate G2, added Afan Oromo to the platform's languages alongside Amharic and English, and non-functional requirement NFR-06 binds that commitment to service quality: every public surface answers in the three languages, and where certified legal phrasing is pending, the surface declares the fallback instead of improvising. Phase 6 is the first gate at which the commitment had to survive acceptance by role-holders rather than by test code alone, and scenario UAT-08 was built for exactly that purpose, with actors drawn from the three language communities of the staff register."),
    ...tbl({
      caption: "UAT-08 trilingual evidence summary",
      headers: ["Step", "Inspected surface", "Observed result", "Result"],
      widths: [7, 30, 51, 12],
      zebra: true,
      rows: E.scenarios.find((s) => s.id === "UAT-08").steps.map((st) => [
        String(st.no), st.action, st.observed, st.result,
      ]),
    }),
    p(`The localization catalogue at acceptance time holds three active languages and ${"23"} seeded localization resources rendered by the console directly from the database, so the language switcher is not a mock: the same table drives the Amharic, English and Afan Oromo renderings of every tab, including this phase's own P6 tab, which was verified in all three renderings and at mobile width. The model contract sections and the public ceiling publication carry trilingual content as Procurement Article 5 and Article 18 service-delivery rehearsals expect. One surface remains explicitly open: the certified legal glossary for Afan Oromo (open item O-8) is scheduled as a workshop with the Bureau before the Phase 7 pilot, affected terminology is marked pending certification, and the English fallback declared by NFR-06 is active meanwhile. The compliance matrix row TC-N06 records the same state, and the legal session carried it as a confirmation with disposition rather than a deviation.`),
    p("Acceptance of CR-01 by role-holders closes the loop the owner opened at Gate G2. The language commitment is no longer a requirement statement or a construction claim; it is rehearsed behaviour, witnessed by the actors who will serve the public in those languages, and recorded in the gate evidence like any other legal rule."),
  ];
}

function chapter9() {
  return [
    h1("9. UAT Certificate and Gate G6 Checklist"),
    p("The plan's gate table names what the owner reviews at G6 - the UAT results, the legal validation memorandum and the defect log - and what the owner approves: signing the UAT certificate and authorizing migration and the pilot. The certificate below is prepared for that signature. It summarizes the acceptance coverage and verdict, references the memorandum by its reference, and states the conditions under which the verdict was reached; the signature block is intentionally open."),
    ...tbl({
      caption: "UAT certificate (prepared for the owner's signature at Gate G6)",
      headers: ["Field", "Statement"],
      widths: [22, 78],
      zebra: true,
      rows: [
        ["Certificate", "User Acceptance Test Certificate - Residential House Rent Control and Administration System"],
        ["Coverage", `8 scenarios / ${E.run.summary.stepsTotal} steps derived from the SRS v1.1 use-case registry, executed by the real roles over the live API (run ${E.run.runId}); verdict ${E.run.summary.verdict} with ${E.run.summary.stepsPassed} of ${E.run.summary.stepsTotal} steps passed, none failed or skipped.`],
        ["Legal validation", "Legal validation memorandum " + LS.memorandum.reference + " concludes with no unresolved deviation across the 47-row compliance matrix; two pending external confirmations carried as dispositions (O1, O-8)."],
        ["Defect status", `Defect log triaged under the SEV-1..4 framework; ${E.defects.log.length} defects recorded; open severity-1/2 count ${E.defects.openSev12}; in-phase fix DEF-06-03 re-tested by full battery re-run.`],
        ["Trilingual acceptance", "CR-01 accepted by role-holders (UAT-08); Afan Oromo glossary certification (O-8) scheduled before the Phase 7 pilot with the NFR-06 fallback active."],
        ["Verdict", "The system is accepted for migration, training and pilot operation in the agreed woredas, subject to the dispositions recorded above."],
        ["Signature", "Project Owner: ______________________    Date: ______________________"],
      ],
    }),
    p("The gate checklist below maps each G6 criterion to its basis and its evidence, so the owner's review can proceed criterion by criterion. All six criteria are met at the time of writing."),
    ...tbl({
      caption: "Gate G6 checklist",
      headers: ["Criterion", "Basis", "Evidence"],
      widths: [38, 18, 44],
      zebra: true,
      rows: E.gateChecklist.map((c) => [c.criterion, c.basis, c.evidence]),
    }),
  ];
}

function chapter10() {
  return [
    h1("10. Gate G6 Decision Request and Transition to Phase 7"),
    p("The project asks the owner to take the Gate G6 decision on the strength of three documents, all contained in or attached to this report: the UAT results (chapter 4, with the certificate of chapter 9 prepared for signature), the legal validation memorandum (chapter 6, reference " + LS.memorandum.reference + "), and the defect log with closure status (chapter 7). The gate's exit condition is a signed UAT certificate and a legal memorandum with no unresolved deviation. The memorandum condition is met and evidenced; the certificate condition awaits the owner's signature, which is the decision itself. The regression floor beneath the gate remains green: the automated battery stands at " + E.battery.pass + " passing cases across " + E.battery.suites + " suites with zero failures."),
    ...tbl({
      caption: "Exit condition mapping for Gate G6",
      headers: ["Exit condition (plan)", "Status", "Evidence location"],
      widths: [42, 14, 44],
      zebra: true,
      rows: [
        ["Signed UAT certificate", "Ready for signature", "Chapter 9, certificate block; coverage and verdict in chapter 4."],
        ["Legal memorandum with no unresolved deviation", "Met", "Chapter 6 memorandum, conclusion; deviation register empty (chapter 5)."],
        ["UAT scripts and results delivered", "Delivered", "Chapters 2-4; live on the console P6 tab and in the results register."],
        ["Defect log with closure status", "Delivered", "Chapter 7; no open severity-1/2 defect."],
      ],
    }),
    p("Open items carried into the next phase are unchanged in substance and each carries a disposition with an owner-visible plan: O1 (directive fine-ladder figures pending the official Amharic text; parameters configurable, no code change needed), O-7 (woreda register reconciliation with the official register before the pilot opens) and O-8 (certified Afan Oromo legal glossary workshop before the pilot, fallback active meanwhile). None blocks Phase 7 entry; O-7 and O-8 are, in fact, activities of Phase 7 itself."),
    p("Phase 7 - Data Migration, Training and Pilot - is the phase in which the platform meets legacy reality. Its activities as the plan defines them are: migrating legacy contracts with party and property record creation, the legacy annotation of Directive Article 8(2), document scanning and attachment, and reconciliation of migrated counts against the registry books as Article 13 requires; training by role and tier, from registrar front-desk practice to sub-city monitoring, Bureau analytics and administration; running the pilot in agreed woredas with daily support while measuring registration cycle time, checklist compliance and replication correctness; and producing the public awareness materials that Proclamation Articles 14 and 16 require so citizens know what a valid contract looks like. The owner's part at that gate is to select the pilot woredas, instruct the offices to cooperate and approve the awareness materials; Gate G7 exits when the pilot woredas operate without severity-one issues and reconciliation balances."),
    p("Requested decision: approve Gate G6 - sign the UAT certificate and authorize Phase 7 (migration, training and pilot). If the owner wishes to inspect any evidence live before deciding, the console's P6 tab re-presents every table in this report from the platform's own API, in Amharic, English or Afan Oromo."),
  ];
}

module.exports = { chapter6, chapter7, chapter8, chapter9, chapter10 };
