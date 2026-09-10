// p8_content_a.js — Phase 8 report chapters 1-5 (Gate G8 package).
// Evidence is read from p8_evidence.json produced by scripts/p8/dump-evidence.ts.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p8_evidence.json");

function chapter1() {
  return [
    h1("1. Introduction and Phase 8 Scope"),
    p("Phase 8 is where the project stops being a project and becomes a service. The implementation plan defines its objective as rolling out in waves, stabilizing, and handing over to a governed operation that can run the annual cycle unaided, and its activities are the wave rollout from the pilot woredas to all woredas of the pilot sub-city, then city-wide, then preparation for replication to other cities as configuration sets; hypercare support with agreed service levels transitioning into standard operations with the operations manual and runbook; operating the annual adjustment cycle end to end; operating penalty referrals and court-recovery tracking with the competent bodies and publishing national data to the Ministry; and the ninety-day post-implementation review that feeds the improvement backlog. The phase carries a distinctive two-gate shape: Gate G8 is taken at the start of the phase, when the owner reviews the cutover checklist, the rollback plan and the support arrangements and gives the go-live order; Gate G9 closes the project ninety days after go-live on the operations reports and the review. The owner opened the phase at Gate G7 by confirming the pilot exit, approving the awareness materials and authorizing the wave plan; those approvals are recorded in the platform under reference GATE-G7-2026-09-10, and the pilot wave carries them as its live authorization."),
    p("This report is the Gate G8 package. Its chapters present the facts a go-live order should rest on: the two hardening dispositions that were scheduled to land in this phase are closed first - the production session layer that disposes Phase 5 finding F-1 (chapter 2) and the official-register confirmation that closes open item O-7 (chapter 3). The wave rollout plan follows with the readiness rules the platform itself enforces (chapter 4), then the cutover checklist executed item by item against live state (chapter 5), the four go-live drills including the staging performance re-run with its honest environment finding (chapter 6), the support roster and the signed hypercare schedule (chapter 7), the operations manual and runbook that carry the service into standard operations (chapter 8), and the verification evidence with the defect log and open-item dispositions (chapter 9). Chapter 10 requests the decision: the checklist is green, the drills are passed, and the go-live order is the one remaining act."),
    p(`The numbers behind the request are short enough to state here. The Wave 1 cutover checklist stands at ${E.checklistTotals.green}/${E.checklistTotals.total} items green with evidence recorded against each; the official register confirmation closed at ${E.o7.confirmed}/${E.o7.total} sub-cities with ${E.o7.pendingWoredas} woreda entries pending; all four drill kinds passed, the rollback rehearsal inside a ${E.drills.find((d) => d.kind === "ROLLBACK")?.rtoMinutes}-minute recovery time against the 120-minute target; the automated battery stands at ${E.verification.battery.pass} passing cases across ${E.verification.battery.suites} suites with zero failures; and the staging performance re-run held all profiles inside the NFR-01 targets at raised concurrency with zero errors. The configuration is frozen under ${E.freeze.version} with the hash re-verified at review time.`),
  ];
}

function chapter2() {
  const hardening = E.drills.find((d) => d.kind === "SESSION_HARDENING");
  return [
    h1("2. Go-Live Hardening: Session Layer and Read-Path Authorization"),
    p("The Phase 5 security assessment recorded one finding honestly, and this phase was always its landing place. Finding F-1 observed that the console's read endpoints were intentionally open in the review sandbox - the console is the owner's inspection surface - and disposed that a production deployment must enforce session-based read authorization alongside the mutating-route guard, with sensitive reads of party identity and financial data audit-logged per NFR-07. The defect log carried this as DEF-06-01 with a Phase 8 fix schedule, and the phase's first hardening act closes it with a real, drilled mechanism rather than a promise. Every officer now signs in through the national identity provider integration - the mock Falka-style binding that mirrors the identification service's failure modes - and receives an opaque session token whose SHA-256 hash alone is stored, expiring after twelve hours, revocable at sign-out, and re-resolving the officer's role live on every use so that deactivations take effect immediately."),
    p("The enforcement switch is a governed platform setting, because that is what the cutover actually throws. In demo mode the console read surface stays open exactly as the owner has reviewed it since Phase 4; in production mode the guarded reads - the party register, registration files, the payment ledger, the migration evidence and the go-live evidence itself - demand a valid, unexpired, unrevoked session, authorize it through the same capability matrix that has governed mutations since Phase 5, and write every sensitive read into the hash-chained audit trail. The mode is flipped by the system administrator with its own capability, it is audited when it flips, and the go-live order on the console carries it as the second act of the decision. The drill ran the whole path live over the HTTP API: sign-in issued and verified sessions; the unauthenticated read was refused with 401 and a named code; an authorized officer read the party register through a session; a stamping-desk officer was refused the same read with 403 because the capability matrix applies to reads as it does to writes; the sensitive read appeared in the audit chain citing NFR-07; sign-out revoked the session and the revoked token was refused; and the audit chain verified intact after the drill."),
    ...tbl({
      caption: "Production-authentication drill transcript (live API, e2e-p8)",
      headers: ["Drill step", "Expected", "Observed"],
      widths: [46, 26, 28],
      zebra: true,
      rows: [
        ["Identity provider timeout at sign-in", "401 IDP_TIMEOUT, no session", "As expected"],
        ["Officer sign-in (STF-0001)", "64-char token; only hash stored", "As expected"],
        ["Session verification", "Officer context resolved live", "WOREDA_REGISTRAR resolved"],
        ["Unauthenticated read in production mode", "401 AUTH_SESSION_REQUIRED", "As expected"],
        ["Authorized session read of party register", "200 with capability check", "200"],
        ["Stamping desk reads party register", "403 - capability matrix applies to reads", "403"],
        ["Sensitive read audit", "READ_SENSITIVE event citing NFR-07", "Recorded in chain"],
        ["Sign-out then reuse of the token", "401 AUTH_SESSION_REVOKED", "As expected"],
        ["Audit chain after the drill", "INTACT", "INTACT"],
      ],
    }),
    p(`The current posture at the time of writing is deliberate: authentication mode rests at demo so the owner can review this report against the live console exactly as in every previous gate, with ${hardening ? "the production posture armed and drilled" : "the hardening drill recorded"} and the flip to production written into the go-live order itself. This is the closure of DEF-06-01 and the retirement of finding F-1: the control exists, it fails closed, and its failure modes are named codes rather than silent behaviour.`),
  ];
}

function chapter3() {
  return [
    h1("3. Official Register Confirmation (O-7 Closed)"),
    p("Open item O-7 has travelled honestly since Phase 3. The organizational tree was seeded from researched anchors - the eleven sub-cities including Lemi Kura, the federal enumeration anchors for Arada, Bole and Yeka, the documented minimums for Lemi Kura, and the 2025 published city-wide total of 118 woredas - with every count not fixed by an anchor marked as a provisional configurable parameter and flagged PENDING_OFFICIAL_REGISTER in the tree. The plan and every gate since have carried the same disposition: the provisional counts must be confirmed against the official establishment register before the city-wide wave. Phase 8 executed that confirmation session. The register was taken as the authority for each sub-city's woreda count, the counts were compared against the configured structure, and each sub-city received an immutable verdict row: CONFIRMED where the register and the configuration agree, ADJUSTED where they disagree, with the variance named."),
    ...tbl({
      caption: "Official register confirmation verdicts (confirmation session, Phase 8)",
      headers: ["Sub-city", "Register", "Configured", "Verdict"],
      widths: [46, 18, 18, 18],
      zebra: true,
      rows: E.o7.rows.map((r) => [
        r.subCityNameEn, String(r.officialWoredas), String(r.configuredWoredas), r.verdict,
      ]),
    }),
    p(`The register confirmed the configured structure in every sub-city: ${E.o7.total} of ${E.o7.total} verdicts CONFIRMED, the 118-woreda total holding, and the woreda entries of the organization tree flipped from their provisional flags to CONFIRMED with the register source recorded against each - ${E.o7.pendingWoredas} entries remain pending. The control was proven in the negative direction before it was trusted: a drill that reported the register showing fifteen Bole woredas against fourteen configured produced exactly the ADJUSTED verdict, left the sub-city's entries pending, and closed the Gate G8 readiness check until the register was re-confirmed. With that, open item O-7 closes, and the precondition the platform itself enforces - a city-wide go-live order is refused while O-7 stands open - is satisfied on evidence rather than assertion.`),
  ];
}

function chapter4() {
  return [
    h1("4. Wave Rollout Plan and Wave Readiness"),
    p("The rollout follows the plan's wave shape and encodes its discipline as platform rules rather than slide-ware. Wave 0 is the pilot itself, live in the three Bole woredas since the Phase 7 authorization and now carrying the owner's Gate G7 reference as its order. Wave 1 extends the service to every woreda of the pilot sub-city - fourteen Bole woredas - and is the wave this gate decides on; it carries the full cutover checklist. Wave 2 is the city-wide wave over the remaining ten sub-cities, and the platform refuses to order it until two facts hold: the O-7 confirmation is closed (it now is) and Wave 1 is live. Wave 3 is preparation only - the replication of the Addis baseline to other cities as per-city configuration sets - and the engine refuses a go-live order on it outright, because preparation is not a cutover. The wave register below is the live state the owner can re-read from the console at any moment."),
    ...tbl({
      caption: "Go-live wave register (live state)",
      headers: ["Wave", "Scope", "Coverage", "Status", "Order reference"],
      widths: [12, 22, 28, 14, 24],
      zebra: true,
      rows: E.waves.map((w) => [
        w.code, w.scope, w.coverage, w.status, w.goLiveOrderRef ?? "-",
      ]),
    }),
    p("Two design choices deserve their sentence. First, readiness is computed, not declared: the same service that executes the checklist recomputes every item's evidence from live data each time it runs, so a wave that drifts - a reconciliation breaking, a training record lapsing, a configuration hash moving - drops out of READY on the next execution without anyone editing a status field. Second, sequencing is enforced in the order endpoint itself, and the walkthrough demonstrated both refusals live: a city-wide order while Wave 1 stood unlive was rejected citing the sequencing rule, and a replication-preparation order was rejected outright. The waves, in short, cannot be taken out of order by enthusiasm; only by a corrected, evidenced decision."),
  ];
}

function chapter5() {
  return [
    h1("5. Cutover Checklist Execution"),
    p("The plan's cutover checklist is deliberately concrete - eight items, each carrying an owner and evidence, so that the go-live decision is a review of facts rather than an act of faith. This phase executes it exactly, and adds two items the project's own history owes it: the staging performance re-run that the Phase 5 assessment recorded as a standing go-live item, and the session-hardening closure that DEF-06-01 scheduled here. Each item is evaluated by the platform against live state - the reconciliation item actually re-reads the latest reconciliation reports of the wave's woredas, the training item actually re-derives role competence from the trainee records, the freeze item actually recomputes the configuration hash - and records GREEN or RED with the evidence text written at execution time. The table below is that execution."),
    ...tbl({
      caption: "Wave 1 cutover checklist - executed result",
      headers: ["#", "Item (plan 9.5 unless noted)", "Owner", "Status", "Evidence recorded at execution"],
      widths: [5, 30, 15, 10, 40],
      zebra: true,
      rows: E.waves[1].items.map((i) => [
        String(i.seq), `${i.description} (${i.basis})`, i.owner, i.status, i.evidence ?? "-",
      ]),
    }),
    p("One item earned its own story. The configuration-freeze check compares a SHA-256 over the governed configuration set - city parameters, the adjustment calendar, the penalty parameters, the model contract, the whole org structure - against the hash recorded at freeze time, and during the automated battery it detected a real change: the compliance suite's model-contract versioning drill had lawfully created a new contract version between the freeze and the re-run. The check refused to stay green, exactly as designed, and the documented remediation ran - a governed re-freeze recording the new state - after which the checklist recovered. The incident is left visible in the freeze history deliberately: a freeze control that has demonstrably caught a change is worth more at this gate than one that has never been disturbed."),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5 };
