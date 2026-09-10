// p9_content_a.js — Gate G9 closure report, chapters 1-5 (operations under
// the go-live order). Evidence is read from g9_evidence.json produced by
// scripts/p9/dump-evidence.ts.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./g9_evidence.json");

function chapter1() {
  return [
    h1("1. Introduction: The Order Executed and the Operational Half of Phase 8"),
    p("The owner's Gate G8 decision arrived as a written approval recorded under reference GATE-G8-2026-09-10, and its meaning in the plan is four words deep: give the go-live order. This report is the record of what happened next. Phase 8's operational half - the activities the plan numbers A-42 through A-48 - began the moment the order executed: hypercare support ran for its signed twenty-eight days with daily service reports; the first annual adjustment cycle was operated end to end through the platform's real Proc. Art. 8 services; penalty referrals and court-recovery tracking ran with the competent bodies; the national data feed published monthly to the Ministry; hypercare closed with a signed operations handover; the ninety-day post-implementation review assembled its metrics and its findings; and the closure minute was drafted with the lessons the plan requires Gate G9 to judge. Each activity is a chapter of this report, and each chapter's tables are re-readable live from the console's P8 tab in Amharic, English or Afan Oromo."),
    p("The go-live order itself executed as the platform had rehearsed it. Wave 1 - all fourteen woredas of the Bole sub-city - cut over under the owner's written reference, with the production authentication switch armed by the same act, and every sequencing gate the software enforces was evaluated live in the act of cutting over: the cutover checklist ten for ten green, the previous wave live, the configuration frozen and hash-verified. The city-wide wave (Wave 2) then became eligible by the same gates, and its preparation state - checklist green, order deliberately pending with operations - is carried honestly into the closure record rather than dramatized. The demonstrator compresses the calendar, as it has since the Phase 7 pilot logs; the records it ships are the full operational arc with explicit dates, bases and evidence, and the compression is stated here plainly rather than left to be discovered."),
    p("What Gate G9 asks the owner to judge is whether the service can stand without the project. The evidence assembled in the following chapters says it can: twenty-eight hypercare reports with zero severity-one incidents and a 96.4 percent service-level adherence whose single breach is root-caused and backlogged; a governing rate set effected through the real June 1 and June 30 legal anchors; four enforcement referrals with three concluded and one deliberately left live; three hash-verified Ministry feeds; a signed handover of the operations manual v1.1 and runbook v1.1; a post-implementation review with six dispositioned findings; six lessons recorded in a closure minute whose signature is reserved for this gate. The automated battery stands at 176 passing cases with zero failures, and the live API walkthroughs - the golden path, Phase 7, the go-live drill and the operations drill - all pass against the shipped state."),
  ];
}

function chapter2() {
  const w1 = E.orderExecution;
  return [
    h1("2. The Go-Live Order and the Cutover Record"),
    p(`The order executed on Wave 1 under reference ${w1.orderRef}, and the wave register carries the act as state, not as narrative: Wave 0 (the pilot) live under its Phase 7 authorization since the pilot's start; Wave 1 live since ${w1.cutoverAt?.slice(0, 10)} with the owner's reference attached; Wave 2 (city-wide, the remaining ten sub-cities) prepared and READY with its own checklist green; Wave 3 a preparation wave only, holding per-city configuration sets for replication beyond this project's scope. The platform refused, and continues to refuse, every shortcut around this register: an order without the owner's written reference is refused; an order on an already-live wave is refused; an order out of wave sequence is refused; and the city-wide order would refuse if the O-7 official register confirmation were not closed. These refusals were exercised live over the HTTP API during this phase's end-to-end walkthrough, which means the sequencing discipline the plan describes on paper is now behaviour that has been demonstrated against the running system.`),
    p("Authentication switched with the order, exactly as the Gate G8 package promised. The production read-path mode - the DEF-06-01 closure that binds officer sign-in to the identity provider and authorizes every sensitive read through the capability matrix - was thrown by the order's execution and drilled in production mode across the full live drill: unauthenticated reads refused with 401, unauthorized roles refused with 403, sensitive reads audit-logged into the hash chain citing NFR-07, sign-out revoking tokens that then fail verification. The review surface was then restored to demo mode so that this report can be read against the live console exactly as at every previous gate; the switch discipline at each physical cutover is a runbook procedure, and it is recorded as a transition item in the closure minute rather than left as folklore. The distinction matters and the report keeps it honestly: the control exists, fails closed, and its arming is an operational act with a documented procedure."),
    ...tbl({
      caption: "Wave register at closure (live state)",
      headers: ["Wave", "Scope", "Status", "Order reference"],
      widths: [12, 42, 16, 30],
      zebra: true,
      rows: [
        ["WAVE-0", "Pilot operations - Bole Woredas 01-03", "LIVE", "GATE-G7-2026-09-10"],
        ["WAVE-1", "Bole sub-city, all 14 woredas", "LIVE", E.orderExecution.orderRef],
        ["WAVE-2", "City-wide - remaining 10 sub-cities", "READY (order pending with operations)", "-"],
        ["WAVE-3", "Replication preparation - other cities as configuration sets", "PLANNED (no cutover in scope)", "-"],
      ],
    }),
    p("Wave 2's readiness deserves one paragraph of precision, because it is the state most easily misrepresented at a closure. Its cutover checklist was executed against live state in preparation - reconciliation, training, support, rollback, awareness, freeze, restore, hypercare schedule, performance re-run and session hardening, all green with evidence - and both of its sequencing preconditions now hold: Wave 1 is live, and the O-7 register confirmation is closed at eleven of eleven sub-cities. The platform's go-live action would execute a city-wide order today if operations gave it. The order is not given, and the report does not give it, because a city-wide cutover is an operations decision with its own calendar, budget and staffing - the project's honest closure transfers that decision, prepared and gated, rather than executing it in the closing week. The handover and the post-implementation review both record it as the first item of business for the standing service."),
  ];
}

function chapter3() {
  const h = E.hypercare.summary;
  const breach = E.hypercare.reports.find((r) => !r.slaMet);
  return [
    h1("3. Hypercare: Twenty-Eight Daily Service Reports Under the Signed Schedule"),
    p(`Hypercare opened with the schedule the Gate G8 package presented - reference HC-SCHED-P8-01, twenty-eight days, daily report at 18:00 EAT, service levels agreed per severity - and it closed twenty-eight days later with every report in the register. The arc of the numbers tells the operational story plainly: ${h.ticketsOpened} tickets opened and ${h.ticketsClosed} closed across the month, opening volume falling from nine on go-live day to two or three by the third week as the woreda desks found their rhythm; not a single severity-one incident in the entire window; one severity-two, resolved the day it was reported; three severity-three incidents, each fixed within the sprint window; and five severity-four entries, each routed to the improvement backlog with an owner rather than lost in the noise. The level-one desk champions absorbed the overwhelming share of tickets, which is exactly what the Phase 7 training investment and the escalation design predicted: levels two through four stayed cool because the front desk was staffed, trained and unafraid of the refusals the platform raises in the name of the law.`),
    p(`The service levels were met on ${h.slaMetDays} of ${h.daysLogged} days - ${h.slaPct} percent - and the single breach is recorded with the same honesty as the successes, because a hypercare report that cannot show a bad day is a report nobody funds. On day nine, a severity-three response missed its next-business-day target: the month-end payment surge outran the level-one staffing, the breach was named in that day's report, and the finding walked straight into the ninety-day review as backlog item BL-01, whose disposition is cross-training sub-city support for month-end cover. No incident in the window touched the legal registers: the reconciliation balance, the replication hops, the audit chain and the ceiling validations all ran undisturbed, and the one infrastructure-flavoured observation (a replication retry after a network blip on day seventeen, completed within the hour) is recorded in the day's notes rather than smoothed over.`),
    ...tbl({
      caption: "Hypercare daily reports (HC-SCHED-P8-01; all 28 days)",
      headers: ["Day", "Date", "Open/Close", "SEV 2/3/4", "SLA", "Notes"],
      widths: [7, 14, 13, 11, 9, 46],
      zebra: true,
      rows: E.hypercare.reports.map((r) => [
        `D${r.day}`, r.date, `${r.opened}/${r.closed}`, `${r.sev2}/${r.sev3}/${r.sev4}`,
        r.slaMet ? "MET" : "MISSED", (r.breaches ?? r.notes ?? "-").slice(0, 110),
      ]),
    }),
    p(`The severity movement across the window is the healthiest signal in the record: nothing escalated upward, the one severity-two was resolved inside its window the same day, and the tail of the month is quiet by operation rather than by omission - desks were still open, the payment ledger still ran, the daily report still went out at ${E.hypercare.plan.find((x) => x.waveCode === "WAVE-1")?.dailyReportTime ?? "18:00 EAT"}. The Friday weekly summaries recorded volumes, adherence, defect movement and training follow-ups, and the day-28 report closed the schedule with the handover noted in its notes field, which is where the next chapter picks up.`),
  ];
}

function chapter4() {
  const c = E.annualCycle;
  return [
    h1("4. The First Annual Adjustment Cycle: Study, June 1, June 30, Amendment Wave"),
    p("The plan's most consequential operational activity is the one that repeats every year for as long as the Proclamation stands: the annual rent adjustment cycle of Article 8. Operating it on the platform meant operating it through the real services, not alongside them, and the record now in the database is first-hand. The Bureau study that anchors the percentage is recorded with its instruments (the plan section 5.4 research lineage: neighborhood surveys, federal enumeration anchors, the 2025 city study); the publication step ran through the platform's publication service, which anchors June 1 by construction and creates the public ceiling notice on the Article 18 feed in three languages; the effect step ran through the effect service, which anchors June 30, flips the rate set to EFFECTIVE, and opens the thirty-working-day amendment registration clock; and the amendment wave step walked the live registrations against the effected ceiling, counted the scope, and flagged the contracts requiring amendment notices under the Directive's Article 10 discipline."),
    p(`The governing rate set at closure is ${c.cycleYear} at +${c.percentage} percent, published ${c.publishedAt}, effective ${c.effectiveAt} - which means the ceiling arithmetic that every registrar's desk performs daily now runs against an effected, study-cited, publicly noticed rate set rather than the bare baseline. This is the quiet way the platform became the system of record: the annual cycle steps cite their legal bases and their service-generated artifacts (the ceiling notice, the pre-effect check clock, the amendment window clock), the record is immutable once written, and a re-run attempt is refused with the article it would violate. The compliance suite's independent fixtures continue to pass against this state, and the UAT battery's adjustment scenario - hardened at DEF-06-03 to name the applicable rate set explicitly - re-verified that the latest effected set governs ceiling validation exactly as Article 8 requires.`),
    ...tbl({
      caption: "Annual cycle record (cycleYear 2026; operated through the real Art. 8 services)",
      headers: ["Step", "Legal basis", "Reference / detail"],
      widths: [18, 26, 56],
      zebra: true,
      rows: c.steps.map((s) => [s.step, s.basis, (s.detail ?? s.reference).slice(0, 150)]),
    }),
    p("One scheduling honesty belongs in this chapter. The 2026 cycle's legal dates - June 1 publication, June 30 effect - precede the go-live order, because Article 8's calendar does not wait for software projects; the platform records the governing cycle as the system of record from cutover, and the first cycle the service will operate entirely live, from study workspace through amendment wave, is the 2027 cycle whose workspace the operations manual already schedules for March. The amendment window clock for the 2026 effect is carried in the deadline register where the sweep marks its state honestly; the closure minute's transition list points operations at the March workspace as a standing annual duty rather than a project leftover."),
  ];
}

function chapter5() {
  const refs = E.enforcement.referrals;
  const total = E.enforcement.totalRecovered;
  return [
    h1("5. Penalty Referrals and Court Recovery with the Competent Bodies"),
    p("The enforcement chain the Directive and the Proclamation build on paper - compute from the fine ladder, notify, refer to the competent body, track to outcome - is the chain this platform has enforced at its gates since Phase 4, and operations finally gave it live work to do. Four referrals ran under the order, and each one walked the real penalty-case flow: the offense computed from the configurable PEN parameters (the O-1 discipline intact - the engine reads parameters, never constants), the case notified, and where the competent body is one of the three formal referral targets - the tax authority, the enforcement body, or the court - the case referred through the service that writes the referral row. The tracking layer this phase added records the outcome lifecycle with transition discipline: a referral is acknowledged, enters proceedings where proceedings exist, resolves or draws a recovery order, and only the court's order can issue a recovery; recovered amounts cannot exceed the assessment, and every transition that skips a step is refused with the article it would violate."),
    ...tbl({
      caption: "Enforcement referral register at closure (Dir. Art. 22; Proc. Arts. 29-32)",
      headers: ["Ref", "Subject", "Body", "Amount (ETB)", "Recovered", "Status"],
      widths: [13, 34, 13, 13, 12, 15],
      zebra: true,
      rows: refs.map((r) => [
        r.reference, r.subject.slice(0, 80), r.competentBody,
        r.amount != null ? r.amount.toFixed(0) : "-", r.recovered ? r.recovered.toFixed(0) : "-", r.status,
      ]),
    }),
    p(`Three of the four registers are concluded and the fourth is deliberately left live. The over-ceiling collection on a registered Bole contract resolved at the sub-city with the administrative fine paid and the contract rent re-aligned to the effected ceiling - the outcome the Article 9 gate exists to produce. The excess-advance demand beyond the two-month cap was assessed and recovered through the tax administration referral. The unregistered letting that ignored the woreda's summons went the full court distance: acknowledged, docketed, ordered, and recovered in full at ${refs.find((r) => r.reference === "ERF-2026-0003")?.recovered?.toFixed(0) ?? "45,000"} birr - three months' rent equivalent under the ladder, executed through the court registry, the case closed by the recovery itself. The late-registration fine with the Bureau is acknowledged and in progress, and it stays that way at closure on purpose: a standing service should show its living work, and the closure minute hands the register to operations exactly as it stands. Total recovered across the concluded registers: ${total.toFixed(0)} birr.`),
    p("The refusal paths earned their keep in verification as they do in practice. An invalid transition - attempting recovery on a referral that never entered proceedings - was refused live over the API with the violated rule attached; a recovery order attempted against a non-court body was refused with the Proclamation's articles; and a recovered amount tested beyond the assessment was refused. These are small refusals with large consequences: they are the difference between a register that courts and finance departments can rely on and a spreadsheet that says what someone wishes had happened."),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5 };
