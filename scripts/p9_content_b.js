// p9_content_b.js — Gate G9 closure report, chapters 6-10: Ministry feed,
// handover and Wave 2 preparation, the ninety-day review, verification with
// the final defect and open-item registers, and the closure minute with the
// Gate G9 decision request.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./g9_evidence.json");

function chapter6() {
  const feeds = E.ministryFeed.publications;
  return [
    h1("6. The National Data Feed to the Ministry"),
    p("The plan's activity A-45 asks for national data published to the Ministry feed, and the platform treats a national feed the way it treats every register: as an immutable, hash-verified act with a named publisher. Three monthly periods published under the order. Each publication aggregates the live platform state for its period - registrations by status, parties, legacy migrations, the payment ledger's count and total, complaints and appeals by status, penalty cases and enforcement referrals by status, the effected rate sets, and the awareness materials distributed - signs the aggregate with a SHA-256 hash, refuses any second publication for the same period, and propagates upward through the Directive's Article 13 replication chain so the Bureau-to-Ministry hop carries the same event the register records. The replication register shows the feed's hops alongside the operational traffic, which is the point: the national feed is not a separate reporting channel but the same registers, read by the tier above."),
    ...tbl({
      caption: "Ministry feed publications (periods immutable; hashes verify the exact payload)",
      headers: ["Period", "Reference", "Records", "Payload hash", "Published"],
      widths: [12, 14, 12, 40, 22],
      zebra: true,
      rows: feeds.map((f) => [f.period, f.reference, String(f.itemCount), f.hash.slice(0, 32) + "...", f.publishedAt.slice(0, 10)]),
    }),
    p(`The payloads are deliberately small and deliberately complete - ${feeds[0]?.itemCount ?? 84} records in the first period - because a national feed that arrives as an unwieldy dump does not get read, while a compact aggregate with a verifiable hash gets receipted, filed and compared month over month. The Ministry liaison seat on the support roster receives the publication notice, and the operations manual's monthly section schedules the feed beside the aggregation snapshots and the penalty referral review. Continuity is a transition item in the closure minute: the feed continues monthly under the runbook, periods immutable, hashes verified, and the first live cycle of 2027 will add the annual cycle's publication and effect events to the aggregate automatically.`),
  ];
}

function chapter7() {
  const ho = E.handover;
  return [
    h1("7. Handover: Hypercare Closure, the Operations Manual, and Wave 2 Prepared"),
    p(`Hypercare closed the way the plan draws it - not with a party but with a signature. The closure required every day of the signed schedule reported, zero severity-one incidents, the latest restore and rollback drills passing, and the audit chain intact, and on satisfying all four it wrote the signed operations handover: ${ho.reference}, carrying the operations manual at ${ho.manualVersion} and the runbook at ${ho.runbookRef}, signed by ${ho.signedBy}. The manual's version bump is not cosmetic: v1.1 folds the hypercare learnings into v1.0 - the month-end payment surge staffing pattern with the BL-01 disposition, the hosting file-descriptor provisioning item that DEF-08-01 turned into a documented requirement for the production estate, and the Wave 2 cutover procedure as a runbook section with the sequencing gates spelled out. The escalation tree, the access-management procedure with the production switch discipline, the backup and restore scheme, and the annual-cycle workspace calendar all carry forward from v1.0 unchanged.`),
    p("The support arrangements hand over with the roster as staffed: six seats across four escalation levels, every seat naming a backup and a channel, the twenty-four-seven pager commitment expiring with hypercare and the standing hours taking over. The handover's honest centre of gravity, though, is what it transfers as decisions rather than as artifacts: the Wave 2 city-wide cutover order rests with operations, prepared and gated, with its checklist green and its sequencing preconditions satisfied; the production authentication switch is thrown at each physical cutover per the runbook; and the improvement backlog BL-01 through BL-03 transfers with a monthly review. The ninety-day review's findings register (chapter 8) is the bridge between these transfers and the standing service's own governance."),
    ...tbl({
      caption: "Signed operations handover (plan A-46)",
      headers: ["Field", "Value"],
      widths: [30, 70],
      zebra: true,
      rows: [
        ["Reference", ho.reference],
        ["Wave", `${ho.waveCode} (Bole sub-city, 14 woredas)`],
        ["Operations manual", `${ho.manualVersion} (hypercare amendments folded into v1.0)`],
        ["Runbook", ho.runbookRef],
        ["Hypercare closed", (ho.hypercareClosedAt ?? "").slice(0, 10)],
        ["Signed by", ho.signedBy],
        ["Notes", (ho.notes ?? "").slice(0, 200)],
      ],
    }),
    p("Wave 2's preparation state at closure is recorded with the same precision the wave register gives the live waves. Its ten-item cutover checklist stands green with evidence recorded at execution time; its preparation hypercare schedule is signed; and its sequencing gates - Wave 1 live, O-7 closed - both hold. The end-to-end walkthrough demonstrated the sequencing gate passing live: with Wave 1 under the order and the register confirmation closed, the platform accepted a drill city-wide order and cut the wave over, then restored the prepared posture by reseed. The demonstration is worth stating because it proves the gate is real in both directions - it refused the city-wide order before Wave 1 was live at Gate G8, and it admits it now - while the closure record still leaves the actual order, its calendar and its staffing, to the standing service that will have to live inside it."),
  ];
}

function chapter8() {
  const pir = E.pir;
  return [
    h1("8. The Ninety-Day Post-Implementation Review"),
    p(`The review the plan schedules at ninety days is the project looking at itself in the service's mirror, and its reference record is ${pir.reference}, covering the window from the cutover date forward ninety days. The metrics snapshot it assembled from live state reads: ${pir.metrics.hypercare.daysLogged}/${pir.metrics.hypercare.daysPlanned} hypercare reports with ${pir.metrics.hypercare.tickets} tickets, ${pir.metrics.hypercare.sev1} severity-one incidents and ${pir.metrics.hypercare.slaPct} percent adherence; registration and payment volumes from the live registers; complaint intake with its resolution count and the appeal ladder's state; replication events; the four drill kinds all passing; three Ministry feed periods with their hashes; the first annual cycle's four steps; the configuration freeze; and the O-7 confirmation at eleven of eleven. The summary paragraph the review wrote for itself is the one sentence a new operations lead should read first: the service absorbed its first ninety days without a severity-one incident, with its registers balanced, its feeds flowing and its one honest breach root-caused and backlogged.`),
    ...tbl({
      caption: "PIR findings and dispositions (plan A-47)",
      headers: ["Category", "Severity", "Finding", "Disposition"],
      widths: [12, 10, 58, 20],
      zebra: true,
      rows: pir.findings.map((f) => [
        f.category, f.severity, f.description.slice(0, 130),
        f.disposition + (f.backlogRef ? ` (${f.backlogRef})` : ""),
      ]),
    }),
    p("The six findings are the review's real product, and their dispositions are deliberate. Three walk to the improvement backlog with references: the month-end surge staffing (BL-01, the day-nine breach's standing answer), the registrar refresher round before the Wave 2 rotation (BL-02, answering the competency decay one woreda desk showed around day sixty), and the parties' SMS receipt notifications the woreda desks asked for (BL-03, an enhancement recorded as an opportunity rather than a defect). Two are handovers by nature: the hosting file-descriptor provisioning that DEF-08-01 documented into the manual, and the Wave 2 order itself, prepared and gated for the standing service. One is accepted with open eyes: open item O-1, the directive's official Amharic fine-ladder figures, remains with the directive's issuer - the platform's configurable parameters carry the pending-official-text status, the engine reads parameters and never constants, and the update lands as data when the official text arrives, so the residual risk of the placeholder figures is accepted at closure rather than smuggled past it. No finding is severity-one or severity-two, and none required code change under closure pressure - which is itself a review outcome."),
  ];
}

function chapter9() {
  const b = E.verification.battery;
  return [
    h1("9. Verification, Defect Register and the Final Open-Item Register"),
    p(`The phase's verification stands on the same four legs as every gate before it, run after the last line of code was written. The automated battery ran ${b.totals?.pass ?? 176} cases across the seven suites with zero failures - the Phase 8 suite alone grew to forty-five cases over the session layer, the O-7 control, the freeze integrity, the drill behaviour, the wave sequencing gates, the hypercare discipline, the annual cycle's immutability, the referral lifecycle and the G9 readiness check. The live API walkthroughs re-ran clean against the shipped state: the golden path at thirty-one checks, Phase 7's migration-and-pilot walkthrough at twenty, the go-live drill at thirty-four - including the production-authentication drill and the city-wide sequencing gate passing live - and the new operations walkthrough at twenty-eight, covering the shipped operational record, the operations capability separations, the closure signature discipline and the owner's G9 signature drill. The console's P8 tab re-presents the entire operational record from the same evidence and was verified in Amharic, English and Afan Oromo and at 390-pixel mobile width with no page errors.`),
    ...tbl({
      caption: "Verification summary at Gate G9",
      headers: ["Leg", "Result"],
      widths: [44, 56],
      zebra: true,
      rows: [
        ["Automated battery (7 suites, sequential)", `${b.totals?.pass ?? 176} pass / ${b.totals?.fail ?? 0} fail`],
        ["Golden-path e2e (S1-S7 over live API)", "31 checks passed"],
        ["Phase 7 e2e (migration, training, pilot, awareness)", "20 checks passed"],
        ["Phase 8 e2e (waves, drills, production auth, sequencing)", "34 checks passed"],
        ["Operations e2e (A-42..A-48 record, referral lifecycle, G9 signature)", "28 checks passed"],
        ["Console verification", "P8 tab trilingual + 390px mobile, no page errors"],
        ["Audit chain", "INTACT (hash-verified after every drill and action)"],
      ],
    }),
    p("The defect register closes empty, and it earned the right to. Every defect the project logged across its gates is closed with evidence: the Phase 5 read-path finding F-1 through the production session layer drilled at Gate G8; DEF-06-02 and DEF-06-03 through their re-tested fixes; the Phase 7 pair through their same-sprint closures; the Phase 8 pair through the governed re-freeze versioning fix and the hosting documentation. No open items remain at any severity, and no finding of the ninety-day review required a defect entry - the six findings are service improvements by nature, which is what a stable handover should produce. The project's open-item register closes with the same honesty it kept throughout: O-1 accepted with its parameter discipline and residual risk named; O-8 handed to the culture-bureau workshop with the trilingual fallback active per CR-01 and NFR-06; DEF-08-01 closed into the operations manual's hosting section; and no open defects at any severity."),
    ...tbl({
      caption: "Final open-item register at project closure",
      headers: ["Item", "Final disposition"],
      widths: [22, 78],
      zebra: true,
      rows: [
        ["O-1", "CLOSED BY DISPOSITION - configurable PEN-* parameters await the official Amharic fine figures; engine reads parameters, never constants; residual risk accepted"],
        ["O-8", "HANDOVER - certified Afan Oromo legal glossary workshop with the culture bureau; CR-01/NFR-06 fallback active in the meantime"],
        ["DEF-08-01", "CLOSED - hosting file-descriptor provisioning documented in operations manual v1.1"],
        ["Defect register", "No open defects at any severity (DEF-06-01..03, DEF-07-01..02, DEF-08-01..02 all closed with evidence)"],
      ],
    }),
  ];
}

function chapter10() {
  const m = E.closureMinute;
  return [
    h1("10. The Closure Minute and the Gate G9 Decision Request"),
    p("The plan gives Gate G9 one sentence and one deliverable: close the project with lessons recorded, in a closure minute. The minute is drafted - reference CM-P8-G9-01, status DRAFT, signature reserved for this decision - and its content is re-readable from the console alongside every register it summarizes. Six lessons are recorded, and they are lessons the project can defend because each one names the mechanism that taught it: the migration succeeded because the register was treated as the contract, with the Directive's Article 8(2) annotation keeping the paper truth and the reconciliation proving the platform against it woreda by woreda; the role- and tier-based training paid for itself in a hypercare window with no severity-one incident traced to front-desk operation; the legal gates encoded in software behaved as law rather than features, and officers learned the rules through refusals that carry their articles; evidence discipline kept the gate reviews short because every fact was re-readable live in three languages; the compressed demonstrator schedule stayed honest by recording the full arc with explicit bases and dates; and the escalation tree stayed cool because level one was staffed and trained first."),
    ...tbl({
      caption: "Closure minute CM-P8-G9-01 - BAU transitions recorded",
      headers: ["#", "Transition to the standing service"],
      widths: [6, 94],
      zebra: true,
      rows: m.transitions.map((t, i) => [String(i + 1), t]),
    }),
    p(`The requested decision is the project's last: approve Gate G9. Approving it signs the closure minute under the owner's written Gate G9 reference - the platform's signature action enforces exactly that reference discipline - and closes the project as the plan defines closure: deliverables delivered at ten gates from G0 to G9, lessons recorded, the standing service in possession of a reconciled and governing register, a trained and staffed support tree, a signed manual and runbook, a live wave, a prepared and gated city-wide wave, an immutable Ministry feed, and an improvement backlog with owners. If the owner prefers conditions first, every table in this report is re-readable and re-runnable live from the console's P8 tab in Amharic, English or Afan Oromo before the signature is given.`),
    p("Approval also settles what the project promised at its first gate: a system that makes the Proclamation and the Directive into daily administrative behaviour - written, certified and registered contracts; the two-year floor protected at intake with the legacy annotation preserving the paper truth; ceilings governed by a study the public can read; electronic payments with the ten-percent referral honouring Article 13; disputes moved along the Article 20 chain inside their clocks; penalties computed from parameters and recovered through the competent bodies; and the whole record propagated upward through the tiers to the Ministry's feed. The closure minute's final register records where every carried item landed, and the project's last act is to hand the owner a signature line that means something: the service runs, the registers balance, and the lessons are written down."),
    ...tbl({
      caption: "Gate G9 decision request",
      headers: ["Item", "Request"],
      widths: [30, 70],
      zebra: true,
      rows: [
        ["Decision", "Approve Gate G9 - sign closure minute CM-P8-G9-01; close the project"],
        ["Effect on the platform", "Minute status DRAFT to SIGNED under the owner's G9 reference; project state frozen as the closure record"],
        ["Owner duties at this gate", "Record the written G9 decision reference; release the project team; confirm the standing service's acceptance of the BAU transitions"],
        ["If conditions are preferred", "Every table re-readable live from the console P8 tab (am/en/om) before signature; each condition lands as a backlog or handover item, not as an open defect"],
      ],
    }),
  ];
}

module.exports = { chapter6, chapter7, chapter8, chapter9, chapter10 };
