// p7_content_b.js — Phase 7 report chapters 6-10 (Gate G7 package).
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p7_evidence.json");

function chapter6() {
  return [
    h1("6. Gate G7 Exit Check"),
    p("The plan's exit criterion for this phase is compact: the pilot woredas operate without severity-one issues and reconciliation balances. The platform implements the criterion as a live, re-runnable exit check with six constituent checks, so the owner reviews evidence rather than assurances. All six pass at the time of writing; the table records each criterion, its basis and the measured detail behind the pass."),
    ...tbl({
      caption: "Pilot exit check - all criteria",
      headers: ["Exit criterion", "Basis", "Result", "Measured detail"],
      widths: [26, 18, 9, 47],
      zebra: true,
      rows: E.exit.checks.map((c) => [
        c.criterion, c.basis, c.pass ? "PASS" : "FAIL", c.detail,
      ]),
    }),
    p("The check is computed live from the database by the same service the console uses, so it can be re-run at any moment during the owner's review; the P7 tab shows it beside the day logs it summarises. Its two hard gates - severity-one count at zero and reconciliation balanced in every pilot woreda - are exactly the plan's words, and its supporting gates make the softer risks visible: replication correctness at one hundred percent, role-and-tier training coverage complete, awareness materials prepared under both legal bases, and the pilot itself opened under a recorded owner authorization. A pilot that has not been opened, or opened without the G6 reference, fails the first check; a single severity-one entry or a one-row variance flips the verdict, and both behaviours were demonstrated in testing before being reported here as passes."),
  ];
}

function chapter7() {
  return [
    h1("7. Public Awareness Materials (Proc. Arts. 14, 16)"),
    p("Article 16 of the Proclamation obliges the Bureau to inform landlords and tenants of the proclamation's provisions, and Article 14's service-delivery duties extend to the channels citizens actually use. Four awareness items were prepared for the owner's review, spanning a poster on what a valid contract looks like, a radio announcement on rights and duties, an SMS campaign on the legacy registration window, and a portal article explaining the annual ceiling. Trilingual delivery is enforced at the data layer, not by convention: the service refuses to create an awareness item whose Amharic, English or Afan Oromo title is missing, which is change request CR-01 and NFR-06 expressed as a refusal the same way the rental rules are."),
    ...tbl({
      caption: "Awareness materials awaiting owner approval",
      headers: ["Basis", "Channel", "English title", "Amharic title", "Afan Oromo title", "Status"],
      widths: [11, 9, 22, 20, 20, 18],
      zebra: true,
      rows: E.awareness.map((a) => [
        a.basis, a.channel, a.titleEn, a.titleAm, a.titleOm,
        a.status === "APPROVED" ? `Approved (${a.ownerApprovalRef})` : "PENDING OWNER APPROVAL",
      ]),
    }),
    p("The materials stand pending the owner's approval, which is the plan's own division of labour: the owner instructs offices, selects pilot woredas and approves awareness materials at this gate. Approval through the platform requires an owner reference and is capability-guarded to the Ministry analyst and Bureau head roles; the live walkthrough exercised the refusal of an approval without a reference before recording a referenced approval. The Afan Oromo renderings carry the standing open-item O-8 caveat - pending the certified legal glossary workshop, terminology follows the NFR-06 English fallback where certification has not yet landed - so approving the materials now approves their channel plan and content architecture, with certified terminology flowing in at the workshop without structural change."),
  ];
}

function chapter8() {
  const V = E.verification;
  return [
    h1("8. Verification Evidence"),
    p(`Phase 7 changed the platform's schema and its service layer, so the verification burden was regression as much as novelty. The automated battery now spans ${V.battery.suites} suites and stands at ${V.battery.pass} passing cases with ${V.battery.fail} failures, executed suite-by-suite in a fixed order for determinism; the six new Phase 7 suite covers the migration engine, the reconciliation control, training competence logic, pilot boundaries and the awareness refusals with negative cases alongside positive ones. The Phase 7 end-to-end walkthrough exercised the new flows over the live HTTP API with acting officers' staff codes - twenty checks covering migration intake including a one-year legacy term, role-separation refusals on migration and training, reconciliation to balance, competence thresholding, the pilot day log with its out-of-scope woreda refusal, and the awareness approval flow - and restored the shipped demonstration state afterwards. The Phase 4 golden-path walkthrough re-ran clean at thirty-one checks, confirming the schema extension broke nothing behind it.`),
    ...tbl({
      caption: "Verification summary",
      headers: ["Instrument", "Result", "What it proves"],
      widths: [26, 14, 60],
      zebra: true,
      rows: [
        ["Automated battery (6 suites)", `${V.battery.pass} pass / ${V.battery.fail} fail`, "Migration, reconciliation, training, pilot and awareness rules alongside the full regression floor, run sequentially for determinism."],
        ["Phase 7 E2E walkthrough", `${V.e2eP7.checks} checks passed`, "Live API flows with RBAC refusals; 1-year legacy term accepted with annotation; state restored by reseed."],
        ["Golden-path E2E regression", `${V.e2eGoldenPath.checks} checks passed`, "The S1-S7 demo path still completes after the schema extension."],
        ["Console review surface", "Verified", V.console],
      ],
    }),
    p("One quality defect surfaced during verification and was fixed in-phase: the battery runner had executed test files in parallel against the shared database, and the Phase 7 suite's write patterns exposed the order-dependence. The runner now executes one suite per process sequentially, which is the deterministic mode a gate battery needs, and the full battery was re-run green under the new discipline. The fix is recorded in the defect log with its re-test evidence."),
  ];
}

function chapter9() {
  return [
    h1("9. Open Items and Defect Log"),
    p("Three open items travel with this gate, each with a disposition and none blocking the pilot's verdict. O1 (directive fine-ladder figures pending the official Amharic text) stays confined to configurable parameters and does not touch pilot behaviour. O-7 (official woreda register reconciliation) is deliberately scheduled ahead of the Phase 8 city-wide wave: the pilot ran on documented-structure woredas with provisional counts flagged in the organization tree, and the reconciliation this phase performed - migration against registry books - is a different control that passed. O-8 (certified Afan Oromo legal glossary) keeps its NFR-06 fallback active; the workshop with the Bureau is the remaining step, and the awareness items and console surfaces are structured to absorb certified terminology without change."),
    ...tbl({
      caption: "Phase 7 defect log with closure status",
      headers: ["ID", "Severity", "Status", "Defect", "Fix"],
      widths: [10, 9, 13, 36, 32],
      zebra: true,
      rows: E.defects.map((d) => [
        d.id, d.severity, d.status, d.title, d.fix,
      ]),
    }),
    p("Both defects are severity-four and closed with re-test evidence: the battery-runner serialization fix (the full battery re-ran green at one hundred thirty-one passes) and the reconciliation-scope sharpening described in chapter 3, which was a definitional correction validated by tests rather than a behavioural fault. No severity-one or severity-two defect exists in this phase, and the carried Phase 5/6 dispositions - the console read-path hardening scheduled at Phase 8 (DEF-06-01) and the glossary certification tied to O-8 (DEF-06-02) - remain on their agreed schedules."),
  ];
}

function chapter10() {
  return [
    h1("10. Gate G7 Decision Request and Transition to Phase 8"),
    p("The project asks the owner to take the Gate G7 decision on the plan's own terms. The gate reviews the migration reconciliation report, the training attendance and competence records, and the pilot exit report - all contained in this document and all live on the console's P7 tab - and the owner's part at this gate was to select the pilot woredas, instruct the offices to cooperate and approve the awareness materials. The pilot woredas were configured under the G6 authorization; the awareness materials in chapter 7 are presented for that approval now, and approving them (or amending them) is part of this decision."),
    ...tbl({
      caption: "Exit condition mapping for Gate G7",
      headers: ["Exit condition (plan)", "Status", "Evidence location"],
      widths: [42, 14, 44],
      zebra: true,
      rows: [
        ["Pilot woredas operate without severity-one issues", "Met", "Chapter 5 metrics (SEV1 = 0 across all day logs); chapter 6 exit check; negative drill proven in tests."],
        ["Reconciliation balances", "Met", "Chapter 3 reports: 28/28/28 with zero variance in every pilot woreda."],
        ["Migration report with reconciliation delivered", "Delivered", "Chapters 2-3; migration register and reports live on the console."],
        ["Training attendance and competence records delivered", "Delivered", "Chapter 4; every pilot-critical role covered by a competent trainee."],
        ["Pilot exit report delivered", "Delivered", "Chapters 5-6 with the re-runnable exit check."],
        ["Awareness materials prepared (Arts. 14, 16)", "Delivered, approval requested", "Chapter 7; approval action available at the gate."],
      ],
    }),
    p("Phase 8 - Go-Live, Operations and Continuous Improvement - is the phase this gate authorizes next. Its activities as the plan defines them are the wave rollout from the pilot woredas to all woredas of the pilot sub-city, then city-wide, with preparation for replication to other cities as configuration sets; hypercare support with agreed service levels transitioning into a governed standard operation with the operations manual and runbook; operating the annual adjustment cycle end to end - study workspace, June 1 publication, June 30 effect, amendment wave and compliance follow-up; operating penalty referrals and court-recovery tracking with the competent bodies; and the ninety-day post-implementation review that feeds the continuous improvement backlog and closes the project at Gate G9. Phase 8 is also where the two scheduled dispositions land: console read-path authorization hardening (DEF-06-01) and the official-register confirmation of the woreda structure (O-7) before city-wide exposure, together with session-based production authentication binding to the national identity provider."),
    p("Requested decision: approve Gate G7 - confirm the pilot exit, approve the awareness materials, and authorize the go-live wave plan of Phase 8. As before, the console's P7 tab re-presents every table in this report from the platform's own API, in Amharic, English or Afan Oromo, for live inspection before the decision."),
  ];
}

module.exports = { chapter6, chapter7, chapter8, chapter9, chapter10 };
