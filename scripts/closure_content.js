// closure_content.js — Project Closure Minute (Signed) content chapters.
// The final deliverable of the project: the owner's Gate G9 decision executed,
// the closure minute signed and frozen, and the project record assembled.
// Evidence is read from g9_closure_evidence.json (scripts/p9/execute-g9.ts).
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./g9_closure_evidence.json");
const M = E.decision.minute;

function chapter1() {
  return [
    h1("1. The Owner's Decision and What It Closes"),
    p(`The owner's Gate G9 decision arrived on the Gate G9 Closure Report as a written approval, and the platform records it under the decision reference ${E.decision.decisionRef} - the third formal gate reference in the register, following the pilot authorization GATE-G7-2026-09-10 and the go-live order GATE-G8-2026-09-10. The plan gives Gate G9 one sentence and one deliverable: close the project with lessons recorded, in a closure minute. Approval of the package therefore executes three acts at once: the closure minute CM-P8-G9-01 is signed under the written reference, the project team is released, and the owner confirms the standing service's acceptance of the business-as-usual transitions the minute records. This document is the record of those acts, and with it the program reaches the end of the roadmap the implementation plan drew: nine phases, ten gates, and every gate now carrying the owner's decision.`),
    p("The closing is deliberately a transfer rather than a stop. The platform freezes in the closure state this decision produced - the registers immutable, the audit chain unbroken, the signed minute refusing any second signature - and the standing service continues under operations manual v1.1 and runbook v1.1 with the transitions of chapter four as its opening agenda: the Wave 2 cutover order resting with city operations, the production authentication switch thrown at each physical cutover, the monthly Ministry feed, the 2027 annual cycle workspace, and the improvement backlog under monthly review. Nothing in the record requires the project to exist for the service to run; that was the test Gate G9 posed, and the decision recorded here is the answer to it."),
  ];
}

function chapter2() {
  return [
    h1("2. The Signature Executed on the Platform"),
    p(`The decision was executed through the platform's own Gate G9 action - the plan's activity A-48 - over the live HTTP API, by the same governed route every owner act has taken since the first gate: a signed request carrying the required capability (golive:order), evaluated by the platform's guards, written as an audit event into the hash chain. The closure minute ${M.reference} moved from DRAFT to SIGNED with the signatory and the written decision reference recorded on the minute row itself: signed by ${M.signedBy}, under ${M.g9Ref}, at ${M.signedAt}. The signature is not a narrative claim; it is state, and the state refuses revision - a second signature attempt was made and refused by the platform with the reason "Closure minute already signed", which is the freeze proof the closure requires. The post-closure readiness check was re-run after signing and passes ten of ten criteria, and the audit chain verified intact at ${E.auditChain.checked} of ${E.auditChain.events} events with no broken sequence.`),
    ...tbl({
      caption: "The Gate G9 decision record",
      headers: ["Field", "Value"],
      widths: [28, 72],
      zebra: true,
      rows: [
        ["Gate", "G9 - Close the Project (final gate of ten)"],
        ["Decision", "Approved - sign closure minute CM-P8-G9-01; close the project"],
        ["Written decision reference", M.g9Ref],
        ["Decision channel", "Owner approval on the Gate G9 Closure Report (18-page gate package)"],
        ["Closure minute", `${M.reference} - status ${M.status}`],
        ["Signatory", M.signedBy],
        ["Executed at (platform record)", M.signedAt],
        ["Freeze proof", "Re-signature refused: \"Closure minute already signed.\""],
        ["Post-closure G9 check", "10 / 10 criteria PASS (chapter six)"],
        ["Audit chain", `${E.auditChain.intact ? "INTACT" : "BROKEN"} - ${E.auditChain.checked}/${E.auditChain.events} events hash-verified, no broken sequence`],
      ],
    }),
    p("One property of this record deserves its own sentence: the decision is dated and referenced by the platform at the moment of execution, so the closure carries the same evidentiary weight as every registered act in the system's history - from the first legacy contract annotated under Directive Article 8(2) to the last Ministry feed hop. There is no separate closure paperwork whose authenticity depends on trust; there is a signed minute in a hash-chained register, and this document narrates it."),
  ];
}

function chapter3() {
  return [
    h1("3. Lessons Recorded"),
    p("The plan requires the closure minute to record at least five lessons, and the minute carries six. Each one names the mechanism that taught it rather than praising an abstraction, which is what makes them usable by the next program that reads this register: a lesson that says what worked is a plaque, but a lesson that says which behaviour produced the result is a procedure. They are recorded here verbatim from the signed minute, in the minute's own order and wording."),
    ...M.lessons.map((l, i) => bullet(`Lesson ${i + 1}. ${l}`)),
    p("Read together, the six lessons describe one posture: treat registers as contracts, put the law in the software's refusals, staff the front line first, and let evidence discipline keep every review short. Nothing in them depends on this particular platform's internals; they transfer to any program that must make a regulation executable and then prove, gate by gate, that the execution is faithful."),
  ];
}

function chapter4() {
  return [
    h1("4. Business-as-Usual Transitions to the Standing Service"),
    p("The minute records six transitions - the concrete items the standing service accepts as its opening agenda, each with its state at closure stated plainly. The owner's approval confirms this acceptance on the record. The transitions are reproduced verbatim from the signed minute."),
    ...M.transitions.map((t, i) => bullet(`Transition ${i + 1}. ${t}`)),
    p(`The shape of the list is the shape of the handover: the operational decisions that remain (Wave 2's cutover order, the authentication switch at each physical cutover) rest with city operations under runbook v1.1; the data dependencies that await external acts (the official Amharic fine-ladder figures, the certified Afan Oromo glossary) are wired as configuration and workshop activities that need no code change; and the routine cadences - the monthly Ministry feed, the annual adjustment cycle workspace for 2027, the improvement backlog's monthly review - are already running or scheduled, with their procedures in the operations manual the team handed over signed. The standing service begins with nothing unresolved that the project could have resolved.`),
  ];
}

function chapter5() {
  return [
    h1("5. The Final Open-Item Register"),
    p("A closure is credible only if its open items are stated rather than smoothed. The minute's open-item register is short because the program's gate discipline retired items at the gates where they arose, and every line carries its disposition: nothing is open at any severity, and the two external dependencies (O-1 and O-8) were never code debt - they are official-text and terminology acts that land as data updates and workshops by design."),
    ...M.openItems.map((o) => bullet(o)),
    p("The register's most important line is the last one's shape: a defect history with every entry closed - DEF-06-01..03 from user acceptance, DEF-07-01..02 from the pilot, DEF-08-01..02 from go-live hardening - is the record of a program that fixed what it found at the phase where it could be fixed cheapest. The dispositions were argued at their gates with evidence, and the closure inherits a clean register rather than manufacturing one at the end."),
  ];
}

function chapter6() {
  const snap = E.operationsSnapshot;
  return [
    h1("6. Post-Closure Platform State"),
    p("The readiness check was re-run after the signature, and the platform's posture at closure is ten of ten. The criteria and their bases are reproduced from the live check, so this chapter can be read against the console's P8 tab at any later date and compared line for line."),
    ...tbl({
      caption: "Gate G9 readiness check at closure (post-signature, 10/10 PASS)",
      headers: ["#", "Criterion", "Basis", "Result"],
      widths: [5, 47, 28, 20],
      zebra: true,
      rows: E.postClosureG9Check.map((c, i) => [
        String(i + 1), c.criterion, c.basis, c.pass ? "PASS" : "FAIL",
      ]),
    }),
    h2("6.1 The Operational Snapshot at Closure"),
    p("The registers the check reads are the service's working state, not an exhibit built for the gate. They are summarized here in one table as the platform freezes: the wave register with two waves live under their owner references, hypercare's twenty-eight days with zero severity-one incidents, the 2026 rate set effected through the legal June anchors, the enforcement register with three concluded referrals and 87,000 birr recovered through the court track, three hash-verified Ministry feeds, the signed handover, and the ninety-day review with its six dispositioned findings."),
    ...tbl({
      caption: "Operational registers at closure",
      headers: ["Register", "State at closure"],
      widths: [26, 74],
      zebra: true,
      rows: [
        ["Waves", snap.waves.map((w) => `${w.code} ${w.status}${w.order ? ` (${w.order})` : ""}`).join(" · ")],
        ["Hypercare (WAVE-1)", `${snap.hypercare.daysLogged}/${snap.hypercare.daysPlanned} daily reports; ${snap.hypercare.ticketsOpened} tickets; SEV-1 = ${snap.hypercare.sev1}; SLA ${snap.hypercare.slaPct}%`],
        ["Annual cycle 2026", "EFFECTIVE - published June 1, effected June 30 at +8% through the real Proc. Art. 8 services; amendment wave recorded"],
        ["Enforcement referrals", snap.referrals.map((r) => `${r.reference} ${r.status}${r.recovered ? ` (recovered ${r.recovered.toLocaleString()} ETB)` : ""}`).join(" · ")],
        ["Ministry feeds", snap.feeds.map((f) => `${f.period} (${f.itemCount} items)`).join(" · ") + " - hash-verified, periods immutable"],
        ["Operations handover", `${snap.handover.reference} - ${snap.handover.manualVersion} / ${snap.handover.runbook} - ${snap.handover.status}`],
        ["Post-implementation review", `${snap.pir.reference} - ${snap.pir.findings} findings, all dispositioned (BACKLOG / ACCEPTED / HANDOVER)`],
        ["Closure minute", `${M.reference} - SIGNED under ${M.g9Ref}`],
        ["Audit chain", `${E.auditChain.checked}/${E.auditChain.events} events verified intact`],
      ],
    }),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, E, M };
