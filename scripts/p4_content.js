// p4_content.js — Phase 4 report chapters (Sprints S1-S7, evidence, G4 package)
const { h1, h2, p, bullet, tbl, rich } = require("./plan_lib");

function chapter1() {
  return [
    h1("1. Introduction and Phase 4 Scope"),
    p("Phase 4 turned the approved SRS v1.1 into working software. Following the phase-gated incremental model, the thirteen modules were built in seven sprints, and each sprint ends in a demonstrable increment that the project owner can operate in the platform console. The construction followed the sprint plan of the approved implementation plan exactly: S1 organization and parties, S2 properties and the model contract studio, S3 registration and certification, S4 rent adjustment and payments, S5 complaints and deadlines, S6 control and penalties, and S7 data management and reporting. Every increment is backed by the same legal traceability discipline that governed the requirements phases, so each function in the rule engine cites the article it implements."),
    p("The change request CR-01, approved by the owner before Phase 3, remains fully in force throughout this phase. The platform is trilingual in its user interface, its seeded catalogues and its document-oriented records: Amharic as the canonical legal rendering, English for federal working purposes, and Afan Oromo per the owner directive, with the Afan Oromo legal glossary tracked as open item O-8 and the interface falling back to English per NFR-06 until certification completes. The console language switcher demonstrates this in every tab, and all operational records carry trilingual catalogue references where the law names things, such as identification types, property statuses, complaint grounds and penalty parameters."),
    p("This report is the Gate G4 package. It documents what each sprint built, the legal rules encoded in the domain engine, the verification evidence at three levels (unit tests, end-to-end API walkthrough, browser verification), the closure of the module traceability matrix, and the honest register of open items carried into Phase 5. The Gate G4 exit criteria of the plan are tested at the end of this report."),
  ];
}

function sprintChapter(no, title, sprintCode, modules, intro, rules, evidence) {
  return [
    h1(`${no}. ${title}`),
    p(intro),
    ...tbl({
      caption: `${sprintCode} legal rules encoded in the domain engine`,
      headers: ["Rule", "Behavior", "Legal basis"],
      widths: [26, 48, 26],
      zebra: true,
      rows: rules,
    }),
    h2(`${no}.1 Verification evidence`),
    ...evidence.map((e) => bullet(e[1], e[0])),
  ];
}

function chapter2() {
  return sprintChapter("2", "Sprint S1: Organization Hierarchy, Roles and Party Onboarding", "S1", "M13, M1",
    "Sprint S1 delivered the administrative backbone and the front door of the platform. The organization hierarchy browser exposes the seeded structure of one ministry, one city bureau, eleven sub-cities and 118 woredas, with the confirmation badges that distinguish officially anchored counts from provisional ones. The role catalogue binds the thirteen SRS actor definitions to their tier scopes, and eight demonstration staff accounts show how a registrar at Bole Woreda 01, a bureau analyst and a ministry analyst each sit inside the hierarchy. Party onboarding enforces the identification original-and-copy rule at creation time, collects the deaf-party accessibility data that feeds the interpreter flow of the registration sprint, and requires the full proxy documentation set, including two witness names, whenever the party type is an agent.",
    [
      ["Identification original-and-copy rule", "A party cannot be created unless the officer recorded that the original identification was seen and a copy attached; verification act requires the same.", "Dir. Art. 7"],
      ["Proxy documentation", "Agent parties require proxy identification and two named witnesses on the proxy documents before creation succeeds.", "Dir. Art. 7"],
      ["Registrar verification act", "Parties start PENDING and must be VERIFIED by a registrar before they can hold a property or join a contract.", "Proc. Art. 4"],
      ["Deaf-party accessibility data", "The party record captures deaf and sign-language status so later filing stages can enforce the interpreter flow.", "Dir. Art. 8(1)"],
      ["Per-city configuration set", "City parameters (minimum lease years, prepayment cap, currency, work week) travel in a configurable set rather than hard-coded policy.", "Dir. Art. 14"],
    ],
    [
      ["Unit tests:", "six assertions cover the original-and-copy rule, the proxy two-witness completeness and the city configuration parameters."],
      ["API walkthrough:", "landlord and tenant created at Bole Woreda 01, verified by the registrar act, and carried through all later sprints."],
      ["Console:", "the Admin tab renders the org tree with basis badges and the Parties tab performs live onboarding and verification."],
    ]);
}

function chapter3() {
  return sprintChapter("3", "Sprint S2: Property Registry and Model Contract Studio", "S2", "M2, M3",
    "Sprint S2 delivered the property registry with automatic exemption clocks and the versioned model contract studio. A property can only be registered at the woreda where the house is located, and only for a verified landlord, which enforces the directive registration venue rule in code. The status classification seeds the exemption engine: a newly completed house receives a four-year clock from completion, a vacant house a two-year clock from vacancy, and an occupied house none, with the computed end date and its legal basis stored on the record. The four ownership evidence types accepted by the directive, holding certificate, confirmation for undocumented holdings, court-sale documents and inheritance transfer, are first-class selections on the form. The contract studio implements the Bureau amendment lifecycle: an amendment issues a new immutable version, copies all ten trilingual sections, marks changed sections as pending legal review, and supersedes the previous version rather than editing it.",
    [
      ["Registration venue", "Property creation rejects any woreda-less or non-woreda registration; the house registers where it stands.", "Dir. Art. 6"],
      ["Exemption clocks", "New construction 48 months from completion, vacant 24 months from vacancy, occupied none; end date and basis computed and stored.", "Proc. Art. 10"],
      ["Ownership evidence types", "Holding certificate, undocumented confirmation, court-sale document, inheritance transfer, each with a reference.", "Dir. Art. 6"],
      ["Contract versioning", "Amendments create a new version with copied sections; the superseded version stays immutable for historical filings.", "Proc. Art. 5; Dir. Art. 4"],
    ],
    [
      ["Unit tests:", "eight assertions cover the 48- and 24-month clocks, the occupied no-clock case, the exemption boundary test and the property status seeds."],
      ["API walkthrough:", "an occupied property registered at Bole Woreda 01 with a holding certificate reference and no exemption clock, later used by the contract and control increments."],
      ["Console:", "the Assets tab shows the live exemption end dates next to each property and the contract studio with the active version and its ten sections."],
    ]);
}

function chapter4() {
  return sprintChapter("4", "Sprint S3: Registration and Certification Workflow", "S3", "M4",
    "Sprint S3 is the heart of the proclamation: the path from presented contract to registered, certified lease. Filing a registration file runs the statutory validation chain in one transaction: the contract must be written on the active Bureau model contract version, both parties must be verified, the lease term must reach at least two years, the advance payment cannot exceed two months, the electronic payment method must be confirmed at the woreda, and exactly three witnesses with identification must be named. When a deaf party is present the filing rejects until the interpreter flow with a named interpreter is recorded. Legacy contracts filed under the transition rule receive the annotation automatically and open a thirty-three-day clock. The registrar then walks the nine-point checklist, certifies, stamps, and registers: registration assigns the woreda-scoped sequential file number at creation, the certificate number at certification, and the registry book position with fifty entries per page at registration, and queues the upward replication of the registry change.",
    [
      ["Minimum two-year term", "Filing rejects a lease whose end date falls short of two years from start.", "Proc. Art. 6"],
      ["Advance payment cap", "Filing rejects prepayment above two months of the monthly rent.", "Proc. Art. 12"],
      ["Electronic payment confirmation", "The payment method must be confirmed at the woreda at filing; channels are electronic only.", "Proc. Art. 13; Dir. Art. 16(4)"],
      ["Three witnesses", "Exactly three named witnesses with identification are required, per the model agreement.", "Model agreement"],
      ["Interpreter flow", "A deaf party forces the interpreter flow with a named interpreter before filing succeeds.", "Dir. Art. 8(1)"],
      ["Legacy annotation", "Pre-proclamation contracts receive the Art. 7 annotation and a 30+3 day registration clock; registration closes the clock.", "Proc. Art. 7; Dir. Art. 8(2)"],
      ["Nine-point checklist", "The registrar verifies nine items in directive order; certification blocks on any failing item.", "Dir. Arts. 6-9"],
      ["Numbering and registry book", "Woreda-scoped sequential file numbers, certificate numbers, and book entries paginated at fifty per page.", "Dir. Art. 9"],
    ],
    [
      ["Unit tests:", "five assertions cover the two-year gate, the prepayment cap, the payment confirmation requirement and the witness count."],
      ["API walkthrough:", "a file presented, all nine checklist items passed, certified as CERT-AA-BOLE-W01-2026-0002, stamped, registered at book page 1 entry 2 with replication queued; a one-year lease and a 3-month prepayment were both rejected by the legal gates."],
      ["Console:", "the Registration tab renders the checklist with live pass state and the registrar act buttons that enable in strict order."],
    ]);
}

function chapter5() {
  return sprintChapter("5", "Sprint S4: Rent Adjustment Engine and Payment Ledger", "S4", "M5, M6",
    "Sprint S4 delivered the annual rate machinery and the electronic payment ledger. The adjustment engine drafts a percentage from the Bureau study, publishes it on the June 1 calendar date, and brings it into effect on June 30, opening the pre-effect amendment registration check window during June and the thirty-working-day amendment registration window after effect, all recorded in the deadline engine. Increase validation applies the percentage to the last registered rent of a contract to compute the ceiling, blocks any increase above it, and refuses to apply the regime to a house whose exemption window still covers the effect date. The payment ledger records receipts against registered contracts only, enforces the two-month cap on advance payments at entry time, restricts channels to the legal electronic set, and implements the cash discipline of the directive: a cash entry is flagged, and the engine automatically computes the ten-percent referral case that feeds the penalty sprint.",
    [
      ["June 1 publication", "Publishing stamps the June 1 date and opens the pre-effect amendment check window in the deadline engine.", "Proc. Art. 8; Dir. Art. 11"],
      ["June 30 effect", "Effect stamps June 30 and opens the 30-working-day amendment registration window.", "Proc. Art. 8; Dir. Art. 10"],
      ["Ceiling and increase validation", "Ceiling equals last registered rent plus the adjustment percentage; increases above the ceiling are blocked; exempt houses are out of scope.", "Proc. Arts. 8-10"],
      ["Advance payment cap at entry", "A three-month prepayment entry is rejected outright.", "Proc. Art. 12"],
      ["Electronic-only ledger", "Receipts carry the channel; cash entries set the violation flag.", "Proc. Art. 13"],
      ["Automatic cash referral case", "Each cash payment auto-computes ten percent of one month's rent as a penalty case.", "Dir. Art. 22"],
    ],
    [
      ["Unit tests:", "seven assertions cover the June dates, the working-day amendment window, ceiling arithmetic, increase validation and the ten-percent computation."],
      ["API walkthrough:", "adjustment 2026 drafted, published, and effective; ceiling on the demo contract computed as 12,960 birr; a 12,500 birr increase validated and a 14,000 birr increase blocked; electronic and cash receipts recorded with the cash case auto-created."],
      ["Console:", "the Rent and Payments tab drives the full adjustment lifecycle with a dedicated increase-validation panel and shows cash flags in red on the ledger."],
    ]);
}

function chapter6() {
  return sprintChapter("6", "Sprint S5: Complaints, Appeals and the Deadline Engine", "S5", "M8, M12",
    "Sprint S5 delivered the dispute pipeline with its statutory clocks. Intake enforces the eight-grounds checklist from the directive and accepts all four channels, written, verbal, telephone and online, with the statement of facts recorded for the complaint register; the register reference and the thirty-working-day decision clock are assigned at intake. Completeness verification, investigation and decision advance in strict order, and the decision action closes the decision clock and opens the fifteen-day appeal window. Filing an appeal validates the window against the decision date and rejects late filings; the committee schedule, hearing and decision follow, and the court escalation path remains available, with every transition mirrored in the deadline register. The deadline engine holds every statutory clock in one place and sweeps overdue clocks into an escalated state, which is the reminder and escalation duty of the directive made operational.",
    [
      ["Eight-grounds intake", "Ground codes must come from the seeded eight-grounds checklist; the register requires a statement of facts.", "Dir. Arts. 17-18"],
      ["Decision window", "The decision clock runs thirty working days from receipt, skipping weekends.", "Proc. Art. 22"],
      ["Appeal window", "Appeals filed more than fifteen days after the decision are rejected with the deadline stated.", "Proc. Art. 24"],
      ["Committee and court path", "Schedule, hearing, decision and court escalation follow the dispute chain; the complaint closes with the committee decision.", "Proc. Arts. 25-26"],
      ["Escalation sweep", "Open clocks past due become OVERDUE with the escalated flag in one sweep.", "Dir. Art. 19"],
    ],
    [
      ["Unit tests:", "six assertions cover the working-day decision due date, the fifteen-day appeal boundary and the committee window."],
      ["API walkthrough:", "a telephone complaint on the over-ceiling ground advanced intake, verification, investigation and an UPHOLD decision; the appeal was filed in time, scheduled, heard and decided by the committee; the sweep escalated two stale clocks."],
      ["Console:", "the Complaints tab offers the next legal action per record and the Deadline panel lists every clock with its basis and working-day marker."],
    ]);
}

function chapter7() {
  return sprintChapter("7", "Sprint S6: Compliance Control and Penalty Enforcement", "S6", "M7, M9",
    "Sprint S6 delivered the control and enforcement instruments. Control teams are formed at sub-city level with named members, and every visit records whether the team presented its identification, which the directive makes a duty; a visit with observed vacancy beyond six months updates the property vacancy record. The penalty engine computes three families of cases from the seeded parameter ladder: offense fines as multiples of the monthly rent, the ten-percent cash referral rule arriving automatically from the ledger, and the vacancy surcharge bands of the directive, five percent above one year without service rising to twenty-five percent above five years, applied to the annual rent of the house. Every fine passes through the three-month global cap of the proclamation with the cap flag recorded. Case progression models the enforcement life cycle, notify, pay, refer to the tax authority, the enforcement body or the court, and court recovery tracking closes the loop.",
    [
      ["Team identification duty", "A visit cannot be recorded unless the team identification was shown.", "Dir. Art. 20"],
      ["Vacancy monitoring", "Observed vacancy beyond six months is flagged on the property record.", "Dir. Art. 20"],
      ["Vacancy surcharge bands", "Above 1-2 years: 5 percent; 2-3: 10; 3-4: 15; 4-5: 20; above 5: 25 percent of annual rent.", "Dir. Art. 22(8-9)"],
      ["Global fine cap", "Administrative fines cap at three months' rent of the affected contract; the cap application is recorded.", "Proc. Arts. 29-32"],
      ["Referral targets", "Cases refer to the tax authority, the enforcement body or the court, and referred cases enter court recovery.", "Dir. Art. 22; Proc. Arts. 29-32"],
    ],
    [
      ["Unit tests:", "nine assertions cover the five vacancy bands, the annual-rent surcharge base, the cap boundary and the capped offense fine."],
      ["API walkthrough:", "a team formed at Bole, a visit with 30 months observed vacancy, a surcharge case computed at 10 percent as 14,400 birr, the automatic cash case notified and paid at 1,200 birr, and the surcharge case referred to the tax authority."],
      ["Console:", "the Control and Penalties tab computes cases from the seeded ladder and walks the notify, pay, refer and recovery actions."],
    ]);
}

function chapter8() {
  return sprintChapter("8", "Sprint S7: Data Custody, Aggregation and Public Publication", "S7", "M10, M11",
    "Sprint S7 delivered the data custody and reporting tier. Replication implements the upward change propagation of the directive: any record injected at a woreda propagates one hop to its sub-city, two hops to the bureau and three to the ministry, and every registry registration enqueues its replication batch automatically, with each hop recorded in the replication log. Backup runs execute against the environment schemes seeded in Phase 3 and record success with the scheme note and the recovery-point check. The aggregation engine computes period snapshots per org unit over its descendant woredas, covering registered contracts, active files, complaints received and decided, and penalties imposed, which realizes the sub-city aggregation duty, the bureau city analytics and the ministry national feed in one mechanism. The publication feed carries ceilings, the calendar, awareness material and statistics to the public portal, and the two seeded awareness items from the proclamation duty to inform citizens what a valid contract looks like are already live.",
    [
      ["Upward propagation", "Woreda records hop to sub-city, bureau and ministry; every hop is logged with direction and payload summary.", "Dir. Art. 13"],
      ["Backup per scheme", "Backup runs record type, location, success and the recovery-point check against the environment scheme.", "Dir. Art. 13"],
      ["Tier aggregation", "Period snapshots per org unit aggregate descendant woredas for all five indicator families.", "Dir. Art. 13; Proc. Art. 18"],
      ["Public feed", "Ceiling, calendar, awareness and statistics items publish to citizens in three languages.", "Proc. Arts. 14, 16, 18"],
    ],
    [
      ["Unit tests:", "four assertions cover the hop counts per tier and the numbering pagination."],
      ["API walkthrough:", "a complaint record propagated 1-2-3, a full backup succeeded on the production environment, a bureau snapshot computed for 2026-09, and a statistics item published to the feed."],
      ["Console:", "the Data and Reports tab shows the snapshot stat row, the replication log with hop chains, backup actions per environment and the publication editor."],
    ]);
}

function chapter9() {
  return [
    h1("9. Verification Evidence"),
    p("Verification ran at three levels, in the order the plan prescribes for each sprint. The unit level holds 51 passing tests: 34 Phase 4 tests over the legal rule engine and the Phase 4 seed catalogues, plus the 17 Phase 3 seed tests that continue to guard the configuration. The integration level is a scripted end-to-end walkthrough of 32 checks over the live HTTP API that follows one landlord, one property and one contract through every sprint from onboarding to publication, including the negative tests where the law must refuse: the one-year lease, the three-month prepayment, the over-ceiling increase and the late-stage validations. The presentation level is the browser walkthrough of the console in which the owner-visible golden paths were operated by hand, including party creation, the trilingual switcher and the promotion re-run."),
    ...tbl({
      caption: "Verification levels and outcomes",
      headers: ["Level", "Instrument", "Outcome"],
      widths: [22, 44, 34],
      zebra: true,
      rows: [
        ["Unit", "bun test over law.ts, seed catalogues (tests/phase4-domain.test.ts, tests/seed-config.test.ts)", "51 pass, 0 fail, 302 assertions"],
        ["API integration", "scripts/e2e-demo.ts over the running server, all seven sprints plus negative legal gates", "32 checks pass; rejects verified for Arts. 6, 12, 8-9"],
        ["Presentation", "Agent Browser walkthrough: tabs, forms, checklist, language switcher am/en/om, promotion run, mobile 390px viewport", "All golden paths operated; no console errors; screenshots archived"],
        ["Regression", "Phase 3 staged promotion re-executed after the Phase 4 schema change", "v0.3.0.6 PROMOTED; 29/29 validation checks at staging and production"],
      ],
    }),
    p("Two defects were found and fixed during verification, neither of which reached the owner surface. The month arithmetic in the date engine overflowed short months, so January 31 plus one month produced March 3; the engine now clamps to the month end, which is also the legally safer reading for clocks anchored at month end. A snapshot helper returned an unresolved promise into a date constructor, which produced an invalid range on first aggregation; it was corrected and the walkthrough re-run. The lint gate is clean across the app, the scripts and the tests."),
  ];
}

function chapter10() {
  return [
    h1("10. Traceability Closure"),
    p("The plan requires each sprint to close its slice of the traceability matrix. The table below maps every module of the SRS baseline to its sprint increment, the engine functions that encode its rules, and the verifying tests. Every requirement family of SRS v1.1, including the CR-01 trilingual requirement carried in all catalogue seeds and the interface switcher, now has forward coverage from requirement to code to test, which completes the chain that Gate G5 will exercise article by article in the compliance test matrix."),
    ...tbl({
      caption: "Module to increment to verification closure",
      headers: ["Module", "Sprint", "Engine surface", "Verification"],
      widths: [30, 10, 34, 26],
      zebra: true,
      rows: [
        ["M1 Party registration and identity", "S1", "isPartyIdentityComplete, isProxyDocumentationComplete", "unit + walkthrough + console"],
        ["M2 Property registry and status", "S2", "computeExemptionEndsAt, isExempt", "unit + walkthrough + console"],
        ["M3 Model contract studio", "S2", "amendModelContract (versioning, supersede)", "walkthrough + console"],
        ["M4 Registration and certification", "S3", "validateLease, validateWitnesses, checklist, certify, stamp, register, numbering", "unit + walkthrough + console"],
        ["M5 Rent ceiling and adjustment", "S4", "publicationDate, effectDate, amendmentWindowEndsAt, ceilingAfterAdjustment, validateIncreaseAgainstCeiling, isAdjustmentApplicable", "unit + walkthrough + console"],
        ["M6 Electronic payment ledger", "S4", "cashPenaltyAmount, ledger with flags", "unit + walkthrough + console"],
        ["M7 Compliance monitoring", "S6", "control teams and visits, vacancy monitoring", "walkthrough + console"],
        ["M8 Complaint, appeal, dispute", "S5", "complaintDecisionDue, appealDeadline, isAppealFiledInTime, committeeHearingDue", "unit + walkthrough + console"],
        ["M9 Penalty and enforcement", "S6", "vacancySurchargeBand, vacancySurchargeAmount, capFine, offenseFineAmount", "unit + walkthrough + console"],
        ["M10 Data replication and backup", "S7", "replicationHopCount, enqueueReplication, runBackup", "unit + walkthrough + console"],
        ["M11 Reporting and publication", "S7", "computeSnapshot, publication feed", "walkthrough + console"],
        ["M12 Notification and deadlines", "S5", "DeadlineTrack register, sweepDeadlines", "walkthrough + console"],
        ["M13 Administration and configuration", "S1", "org tree, roles, staff, CityConfig parameters", "console + seed tests"],
        ["CR-01 Trilingual (NFR-06)", "all", "Language catalogue, LocalizationResource, UI switcher am/en/om with fallback", "browser walkthrough + seed tests"],
      ],
    }),
  ];
}

function chapter11() {
  return [
    h1("11. Open Items Carried into Phase 5"),
    p("Four open items travel forward, none of which blocks Phase 5 entry. They are registered here exactly as they stand in the console evidence tab so that the compliance testing phase can close them against the official texts and registers rather than inheriting silent assumptions. Each item already has its disposition encoded in the platform, which is why the platform remains legally conservative wherever an official figure or register has not been confirmed."),
    ...tbl({
      caption: "Open items register",
      headers: ["Item", "Description", "Disposition in this build"],
      widths: [10, 45, 45],
      zebra: true,
      rows: [
        ["O1", "Directive Art. 22 fine-ladder figures partly ambiguous in the scanned two-column layout", "Encoded as configurable penalty parameters marked PENDING_OFFICIAL_TEXT; confirm against the official Amharic text and at the G6 legal validation"],
        ["O-7", "Woreda counts for some sub-cities provisional (for example Lemi Kura growth since establishment)", "Seeded with PENDING_OFFICIAL_REGISTER badges; reconcile against the official register before the pilot"],
        ["O-8", "Afan Oromo legal glossary certification under CR-01", "Interface and catalogue renderings live with fallback per NFR-06; certification tracked as its own workstream"],
        ["O-9", "Committee hearing window encoded as a thirty-day configuration parameter", "Verify against Proclamation Arts. 24-26 official text during the Phase 5 compliance matrix"],
      ],
    }),
    h1("12. Gate G4 Package and Requested Decision"),
    p("The plan exits Phase 4 when all seven increments are demonstrated, the platform is functionally complete against the SRS, and no severity-one or severity-two defects remain open. All three conditions are evidenced: the seven sprint chapters above each name their increment and its demonstration surface, the traceability chapter closes the module matrix forward from requirement to test, and the verification chapter records the passing unit, integration and presentation levels with the two found defects fixed and the regression promotion green. The console carries the same checklist so the owner can review the evidence interactively before deciding."),
    p("Requested decision: approve Gate G4 and release Phase 5, Integration, Security and Compliance Testing, in which the platform is proven against the bank and identification sandboxes, the security assessment runs against the agreed level, and every traced article is exercised by a named test case with the compliance matrix attached to the test report."),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7, chapter8, chapter9, chapter10, chapter11 };
