// p8_content_b.js — Phase 8 report chapters 6-10 (Gate G8 package).
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p8_evidence.json");

const fmtPct = (n) => `${n}`;

function chapter6() {
  const rollback = E.drills.find((d) => d.kind === "ROLLBACK");
  const restores = E.drills.filter((d) => d.kind === "RESTORE");
  const perf = E.perf.profiles;
  return [
    h1("6. Go-Live Drills: Rollback, Restore, Hardening and the Staging Re-run"),
    p("Four drills stand between the checklist's green ticks and the go-live order, and each executes real platform operations rather than rehearsed prose. The backup-and-restore verification takes a fresh FULL backup under the Directive's Article 13 scheme, snapshots the row counts of nine governed tables at backup time, re-derives them from the restored state, and compares; the tamper variant proves the comparison fails when the restored state disagrees with the snapshot, so the drill's PASS is a discriminating result and not a formality. The rollback rehearsal then walks the documented path - freeze wave writes, restore the last-good state, verify the audit chain, confirm the registry reconciliation still balances, re-open - and records the recovery time: ".concat(`${rollback?.rtoMinutes} minutes against the 120-minute target`, ". The negative drill left its trace in the register honestly (a deliberately doctored snapshot produced a FAIL row beside the clean PASS), which is precisely the evidence a rollback plan should be able to show.")),
    ...tbl({
      caption: "Drill register (latest per kind)",
      headers: ["Kind", "Result", "Recovery time", "Evidence of record"],
      widths: [18, 12, 16, 54],
      zebra: true,
      rows: ["ROLLBACK", "RESTORE", "SESSION_HARDENING", "PERF_RERUN"].map((kind) => {
        const d = E.drills.find((x) => x.kind === kind);
        return [
          kind, d?.result ?? "-", d?.rtoMinutes != null ? `${d.rtoMinutes} min` : "-",
          d?.notes ?? "-",
        ];
      }),
    }),
    p("The staging performance re-run was the standing item the Phase 5 assessment left on this checklist, committed there in writing: the same harness, raised concurrency, before city-wide exposure. The first raised attempt taught a real lesson and is recorded as DEF-08-01 with its root cause: the sandbox development server was repeatedly killed at forty and ninety concurrent users, and the cause was not the application but the environment's 1024 file-descriptor ceiling, which a load of that breadth exhausts. With the server re-provisioned at 8192 descriptors, the raised profiles ran clean at zero percent errors - the interactive p95 at 1,157 milliseconds under forty concurrent officers and 2,499 milliseconds at city-peak ninety, inside the three-second NFR-01 target at nearly double the Phase 5 concurrency, and the registration path's p95 at ninety milliseconds against its five-second budget. The provisioning lesson is written into the operations manual as a hosting requirement, which is how a sandbox finding becomes an operations control."),
    ...tbl({
      caption: "Staging performance re-run - raised concurrency (NFR-01 targets: 3,000 ms interactive / 5,000 ms registration)",
      headers: ["Profile", "Concurrency", "Requests", "p50 (ms)", "p95 (ms)", "Errors"],
      widths: [22, 16, 16, 14, 16, 16],
      zebra: true,
      rows: perf.map((pr) => [
        String(pr.profile), String(pr.virtualUsers ?? pr.samples), String(pr.requests ?? pr.samples),
        String(pr.p50), String(pr.p95), `${fmtPct(pr.errorRatePct ?? 0)}%`,
      ]),
    }),
    p(`The session-hardening drill completes the four: its transcript is chapter 2's table, recorded into the drill register with the live walkthrough's results, so the checklist's hardening item cites a register entry rather than a chapter. All four drill kinds stand at PASS at the time of writing, ${restores.length >= 1 ? `including ${restores.length} restore verifications` : "including the restore verification"} executed through the platform's own backup service.`),
  ];
}

function chapter7() {
  const hc = E.hypercare[0];
  const sla = hc ? JSON.parse(hc.slaJson) : {};
  return [
    h1("7. Support Arrangements and the Hypercare Schedule"),
    p("Go-live is a support commitment before it is a technical act, and the plan's checklist says so: the roster and escalation tree must be staffed, and the hypercare schedule must be signed, before the order is given. The roster seats six across four escalation levels, every seat naming a backup and a channel, from the woreda front-desk champions through the sub-city escalation point and the Bureau's operations group to the Ministry liaison, with the platform operations pager running around the clock for the hypercare period. The schedule is signed into the platform - reference HC-SCHED-P8-01, twenty-eight days, a daily report at 18:00 East Africa Time to the owner and tier leads, weekly summaries on Fridays - and its service levels are recorded beside it, so the hypercare reports that follow go-live measure themselves against agreed figures rather than moods."),
    ...tbl({
      caption: "Support roster and escalation tree",
      headers: ["Level", "Role", "Assignee", "Backup", "Hours"],
      widths: [8, 26, 26, 22, 18],
      zebra: true,
      rows: E.roster.map((r) => [
        `L${r.escalationLevel}`, r.role, r.assignee, r.backup, r.hours,
      ]),
    }),
    ...tbl({
      caption: `Hypercare schedule ${hc?.reference ?? "-"} (signed ${hc ? new Date(hc.signedAt).toISOString().slice(0, 10) : "-"})`,
      headers: ["Parameter", "Agreed value"],
      widths: [30, 70],
      zebra: true,
      rows: [
        ["Duration", `${hc?.days ?? "-"} days from the go-live order`],
        ["Daily report", `${hc?.dailyReportTime ?? "-"} to the owner and tier leads`],
        ...Object.entries(sla).map(([k, v]) => [k, String(v)]),
      ],
    }),
    p("The weekly summary's contents are fixed in advance - volumes, service-level adherence, defect movement, training follow-ups - because a hypercare report that defines its own metrics after the fact is a story rather than a control. When hypercare closes, the closure is itself a recorded act: the schedule flips to CLOSED with the handover minute, and that closure is one of the artefacts Gate G9 reviews."),
  ];
}

function chapter8() {
  return [
    h1("8. Operations Manual and Runbook"),
    p("The handover deliverable of this phase is the operations manual and its runbook, prepared at version OPS-MANUAL-v1.0 and RUNBOOK-v1.0 alongside this report, and structured so that a governed standard operation can run the annual cycle unaided - the plan's exact words for the phase objective. The manual's sections follow the service's real rhythms. Daily operations cover the front-desk filing, certification and stamping desks, the payment-ledger reconciliation and the deadline sweep. Weekly operations cover the replication review across the Directive's three hops, backup verification, the audit-chain verification and the hypercare report. Monthly operations cover the tier aggregation snapshots, the penalty-referral review with the competent bodies and the Ministry feed. The annual cycle is written as the calendar it legally is: the rate-study workspace from March, the June 1 publication under Proclamation Article 8, the June 30 effect, the amendment wave and the compliance follow-up - the same cycle the platform has exercised since Phase 4 and the pilot has operated live."),
    ...tbl({
      caption: "Operations manual v1.0 - section map",
      headers: ["Section", "Contents"],
      widths: [30, 70],
      zebra: true,
      rows: [
        ["Daily operations", "Front-desk filing, certification and stamping desks; payment ledger reconciliation; statutory deadline sweep"],
        ["Weekly operations", "Replication review (Dir. Art. 13 hops); backup verification; audit-chain verification; hypercare report"],
        ["Monthly operations", "Tier aggregation snapshots; penalty referral review with competent bodies; Ministry feed"],
        ["Annual cycle", "Rate study workspace (March-May); June 1 publication (Proc. Art. 8); June 30 effect; amendment wave; compliance follow-up"],
        ["Backup and restore", "Dir. Art. 13 scheme; FULL/INCREMENTAL runs; count-level restore verification drill"],
        ["Escalation tree", "Woreda desk -> sub-city -> Bureau -> Ministry; 24/7 platform pager during hypercare"],
        ["Access management", "Staff register; capability matrix; session issuance and revocation (production authentication)"],
        ["Configuration governance", "Freeze/hash discipline; per-city configuration sets for replication (Wave 3); file-descriptor provisioning"],
      ],
    }),
    p("Two items in the manual exist because this phase earned them. The access-management section documents the production session layer of chapter 2 as an operating procedure - who signs in, how sessions expire and revoke, what the audit trail records - so the DEF-06-01 control survives its authors. The configuration-governance section carries both the freeze/hash discipline this gate exercised (including the governed re-freeze remediation) and the file-descriptor provisioning requirement that DEF-08-01 turned from a sandbox surprise into a hosting checklist item. The signed handover of the manual, and the closure of hypercare into these procedures, are Gate G9 artefacts; at this gate the manual stands prepared, versioned and consistent with everything the platform actually does."),
  ];
}

function chapter9() {
  return [
    h1("9. Verification Evidence, Defect Log and Open Items"),
    p(`The phase's verification stands on the same four legs as every gate before it, run after the last line of code was written. The automated battery ran ${E.verification.battery.pass} cases across ${E.verification.battery.suites} suites with zero failures - the Phase 8 suite alone contributes thirty cases over the session layer, the O-7 control, the freeze integrity, the drill behaviour and the go-live order's refusal paths. The live end-to-end walkthrough executed thirty-four checks over the HTTP API, including the full production-authentication drill and the go-live order drill, and restored the shipped demonstration state by reseed; the Phase 4 golden path re-ran at thirty-three checks with no regression under the new schema and read guards. The console's P8 tab was verified in Amharic, English and Afan Oromo and at 390-pixel mobile width with no page errors, and the audit chain verified intact after every drill with ${E.auth.auditEvents} events in the chain.`),
    p("Two defects were found and fixed in-phase, both severity four and both closed with re-test evidence. DEF-08-01 was the staging re-run's environment ceiling described in chapter 6 - a file-descriptor provisioning limit, not an application fault - fixed by re-provisioning and converted into an operations control. DEF-08-02 was a collision in configuration-freeze versioning when re-freezing on the same day at the same item count, fixed with collision-safe versions and covered by the governed re-freeze drill. Neither blocks the gate; the gate criterion for defects - no open severity-one or severity-two items - is met with none open at any severity."),
    ...tbl({
      caption: "Defect log - Phase 8",
      headers: ["ID", "Severity", "Status", "Title and fix"],
      widths: [12, 10, 16, 62],
      zebra: true,
      rows: E.defects.map((d) => [d.id, d.severity, d.status, `${d.title}. Fix: ${d.fix}`]),
    }),
    p("The open items close or carry with explicit dispositions. O-7 closes in this phase on the register confirmation of chapter 3. DEF-06-01 closes with the session layer of chapter 2; DEF-06-02 (the Afan Oromo glossary certification, item O-8) carries into operations with the NFR-06 fallback active and the console surfaces built to absorb certified terminology without change - the workshop with the Bureau remains the honest remaining step, scheduled in the improvement backlog rather than pretended here. O1 (the directive's fine-ladder official text) carries as it has since Phase 1, confined to configurable parameters with the provisional figures flagged in the penalty register. None of the carried items touches the go-live decision, and each names its owner and route."),
    ...tbl({
      caption: "Open items and dispositions at Gate G8",
      headers: ["Item", "Status", "Disposition"],
      widths: [16, 16, 68],
      zebra: true,
      rows: [
        ["O-7", "CLOSED", "Official register confirmation session: 11/11 sub-cities CONFIRMED; org tree flipped to CONFIRMED with source recorded."],
        ["DEF-06-01 (F-1)", "CLOSED", "Production session layer implemented, drilled live, armed behind the auth-mode switch thrown with the go-live order."],
        ["O-8 / DEF-06-02", "CARRIED", "Afan Oromo legal glossary certification; NFR-06 fallback active; workshop scheduled in the operations improvement backlog."],
        ["O1", "CARRIED", "Fine-ladder official Amharic text; confined to configurable parameters flagged PENDING_OFFICIAL_TEXT."],
      ],
    }),
  ];
}

function chapter10() {
  return [
    h1("10. Gate G8 Decision Request and Transition to Gate G9"),
    p("The plan gives Gate G8 four words of substance: give the go-live order. The facts it should rest on are assembled, executable and re-readable from the console's P8 tab in Amharic, English or Afan Oromo: the cutover checklist is ten for ten green with evidence recorded at execution time; the four drills passed, including a rollback rehearsal inside its recovery-time target and a staging performance re-run inside every NFR-01 target at raised concurrency with zero errors; the official register confirmation is closed and the city-wide precondition it guards is therefore satisfiable in sequence; the support roster is staffed to four escalation levels with the hypercare schedule signed; the configuration is frozen, hash-verified and governed; and the read-path authorization that this project honestly deferred since Phase 5 now exists, is drilled, and arms itself with the order. The owner's duties at this gate, as the plan records them, were to give the go-live order, announce internally and open the support channel - the platform side of all three is prepared."),
    p("The requested decision: approve Gate G8 - give the go-live order for Wave 1 (all fourteen woredas of the Bole sub-city) under the owner's written order reference, switching the platform's authentication to production mode as the order executes. On the order, the phase continues into its operational half: hypercare opens with the signed schedule and reports daily against its service levels; the annual adjustment cycle is operated end to end with its first-cycle record; penalty referrals and court-recovery tracking run with the competent bodies and the national feed publishes to the Ministry; Wave 2 (city-wide) is prepared under its sequencing gates; and at ninety days the post-implementation review assembles the service reports, the improvement backlog and the lessons that Gate G9 - the project's close - will judge. If the owner prefers conditions first, each checklist item's evidence is re-runnable live from the console before the order is given."),
  ];
}

module.exports = { chapter6, chapter7, chapter8, chapter9, chapter10 };
