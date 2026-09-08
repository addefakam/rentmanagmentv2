// plan_content_c.js — Chapters 7-9
const { h1, h2, h3, p, rich, bullet, tbl } = require("./plan_lib");

function chapter7() {
  return [
    h1("7. Step-by-Step Guide for the Project Owner"),
    p("This chapter is written directly for you, the project owner. It strips the plan down to the actions only you can take, phase by phase. Nothing here requires technical knowledge; it requires decisions, access, and judgment. If you follow this table in order, the project will never wait on you longer than necessary, and you will never be surprised by a decision you did not know was yours."),
    ...tbl({
      caption: "Project owner actions by phase",
      headers: ["Phase", "You provide", "You review", "You decide"],
      widths: [12, 32, 30, 26],
      zebra: true,
      rows: [
        ["Phase 0", "Official proclamation, directive and model agreement texts; names of Bureau, sub-city, woreda and IT stakeholders; any budget or deadline constraints", "This implementation plan; the charter", "Approve baseline; appoint product owner; sign G0"],
        ["Phase 1", "Answers to the ambiguity list (especially Directive Art. 22 fine ladder); confirmation of city structure: sub-cities and woredas to be configured", "SRS summary; traceability extract; glossary", "Approve SRS; sign each resolved parameter at G1"],
        ["Phase 2", "Preferences on interface language order and branding; confirmation of integration partners (bank switch, identification service)", "Architecture summary; wireframes of the registration workflow first", "Approve designs; rank wireframe changes at G2"],
        ["Phase 3", "Confirmation of hosting arrangement and responsible IT unit; security policy constraints if any", "Environment walkthrough checklist", "Accept environments; confirm seeded values at G3"],
        ["Phase 4", "Attendance at sprint demos or a delegated reviewer; sample legacy documents for realistic testing", "Each sprint demo; sprint summaries", "Accept each increment; reprioritize backlog between sprints"],
        ["Phase 5", "Access for testers; agreement on test city-scale workload figures", "Compliance matrix summary; security assessment summary", "Accept test evidence; authorize UAT at G5"],
        ["Phase 6", "Nominate role players: at least two registrars, one sub-city monitor, two Bureau analysts, one complaint officer, one committee member", "UAT daily summaries; legal memorandum", "Sign UAT certificate; authorize pilot at G6"],
        ["Phase 7", "Select pilot woredas; instruct offices to cooperate; approve awareness materials", "Migration reconciliation report; pilot weekly notes", "Confirm pilot exit and go-live waves at G7"],
        ["Phase 8", "Give the go-live order; announce internally; open support channel", "Cutover checklist; hypercare daily report", "Go-live at G8; close project at G9"],
      ],
    }),
    p("Two standing rules make this guide work. First, keep every approval written, even if it is a short message; the decision register will record it verbatim. Second, when you disagree with a recommendation, say so at the gate where it appears; late discoveries are the most expensive kind. The delivery team's obligation in return is that no gate package will exceed one sitting of review, and every package opens with a summary page written in plain language."),
  ];
}

function chapter8() {
  return [
    h1("8. Quality Assurance and Compliance Testing"),
    p("Quality on this project has two faces: engineering quality, measured by the ISO/IEC 25010 attributes adopted at design time, and legal compliance, measured by the traceability matrix turned into executable tests. Both are planned here. The test approach follows the standard level model, with each level owning clear entry and exit criteria so that no phase can claim success on assertion alone."),
    h2("8.1 Test Levels"),
    ...tbl({
      caption: "Test levels, objectives and exit criteria",
      headers: ["Level", "Objective", "Basis", "Exit criterion"],
      widths: [18, 30, 26, 26],
      zebra: true,
      rows: [
        ["Unit", "Each component behaves to specification", "Low-level design; SRS rules", "Agreed coverage reached; all green in pipeline"],
        ["Integration", "Modules and external services work together", "Interface specification; sandbox contracts", "All integration cases pass including failure paths"],
        ["System", "End-to-end workflows satisfy the SRS", "Use cases UC-L0 to UC-P4", "No open severity-one or severity-two defects"],
        ["Security", "Access control, audit and data protection hold", "Threat model; OWASP ASVS checklist", "No unresolved high findings"],
        ["Performance", "Woreda and city-scale loads are served within targets", "Phase 1 workload assumptions", "Targets met with agreed headroom"],
        ["UAT", "Real roles can execute real work", "UAT scripts from the use-case catalogue", "Signed UAT certificate"],
        ["Compliance", "Every traced legal rule is proven", "Traceability matrix turned into test cases", "Compliance matrix shows no failed rule"],
      ],
    }),
    h2("8.2 The Legal Compliance Test Matrix"),
    p("The compliance matrix is the project's signature quality instrument. Each row pairs a legal rule with the system behaviour that proves it, and each rule is tested at least once. The examples below show the pattern; the full matrix is built in Phase 1 and executed in Phase 5."),
    ...tbl({
      caption: "Compliance matrix: example rows",
      headers: ["Legal rule", "Source", "System behaviour under test"],
      widths: [34, 18, 48],
      zebra: true,
      rows: [
        ["An unregistered contract has no validity for evidence", "Proclamation Art. 4, 14", "Only registered contracts appear as evidence-grade records; unregistered ones are flagged and fined per the ladder"],
        ["Contract term cannot be less than two years", "Proclamation Art. 6; Model clause 4(2)", "Contract studio rejects a term below two years with the model's own explanatory note"],
        ["Advance payment capped at two months", "Proclamation Art. 12", "Advance above two months cannot be recorded; attempt is audited and reported"],
        ["Rent paid only by bank or legal electronic means", "Proclamation Art. 13", "Ledger accepts only electronic channels; cash attempts raise a flag that feeds the ten-percent fine referral"],
        ["Annual adjustment announced June 1, effective June 30", "Proclamation Art. 8; Directive Art. 11", "Calendar job publishes the rate on schedule; increases before June 30 are rejected"],
        ["Amended contracts registered within thirty days", "Proclamation Art. 10; Directive Art. 10", "Deadline engine opens a thirty-day window and escalates on expiry"],
        ["Legacy contracts annotated as voluntarily verified", "Directive Art. 8(2)", "Migration path stamps legacy records with the verification note and four-witness data"],
        ["Vacancy beyond six months is complaint ground", "Proclamation Art. 8(10); Directive Art. 17", "Vacancy tracking opens phantom-rent computation and complaint linkage"],
        ["Vacancy tax surcharge in bands five to twenty-five percent", "Directive Art. 22(8)", "Referral computation applies the correct band from the configurable ladder"],
        ["Enforcement blocked until a decision is final", "Proclamation Arts. 20, 22, 25", "Enforcement gate stays locked through appeal windows and opens only on finality"],
      ],
    }),
    h2("8.3 Defect Management and Quality Gates"),
    p("Defects are classified by severity and handled by a fixed rhythm: found, logged, triaged daily during test phases, fixed, and re-tested with evidence. A severity-one defect blocks any gate; a severity-two defect blocks go-live; severity-three and lower enter the improvement backlog with owner and target. Exit criteria are stated per level in the table above, and the final release checklist requires that the compliance matrix, the security assessment, and the UAT certificate are all green. This is how the project keeps its central promise: no legal rule is left to trust; each is demonstrated by a test anyone can re-run."),
  ];
}

function chapter9() {
  return [
    h1("9. Deployment, Data Migration and Tiered Rollout"),
    h2("9.1 Environments and Promotion Path"),
    p("The platform runs in three managed environments: development, staging and production. Changes move forward only through the pipeline, and the production promotion requires the gate evidence of Phases 5 and 6. Backups follow the custody model of Directive Article 13: at the woreda level both hard and soft holdings exist by law, and the platform adds automated, encrypted backups at every tier with tested restoration. The staging environment carries a masked copy of production data so that training and rehearsals use realistic records without exposing citizens' information."),
    h2("9.2 Rollout Waves"),
    ...tbl({
      caption: "Rollout waves",
      headers: ["Wave", "Scope", "Purpose", "Exit signal"],
      widths: [10, 30, 34, 26],
      zebra: true,
      rows: [
        ["W1", "Pilot woredas selected at G7", "Prove live operation with daily support", "Two stable weeks; cycle-time targets met"],
        ["W2", "All woredas of the pilot sub-city", "Validate sub-city aggregation and monitoring", "Replication correct; dashboards reconcile"],
        ["W3", "City-wide across Addis Ababa", "Full Bureau operation; city analytics live", "All offices transacting; support load steady"],
        ["W4", "Second city as configuration instance", "Prove national platform design", "Second city onboarded by configuration only"],
      ],
    }),
    h2("9.3 Legacy Data Migration"),
    p("Migration converts the paper inheritance of the rent system into governed data. Legacy contracts are entered through the same verification discipline as new ones, with the annotation that Directive Article 8(2) prescribes for contracts made before the proclamation: a note that the parties appeared and the contract was verified, together with the four-witness data where applicable. Documents are scanned and attached, counts are reconciled against the registry books, and discrepancies are logged and resolved before the wave that covers the originating office. Dual running is used where an office transitions: the paper registry continues until reconciliation proves the digital record complete, exactly as the directive's hard-and-soft custody expects."),
    h2("9.4 Training by Role and Tier"),
    ...tbl({
      caption: "Training plan",
      headers: ["Audience", "Tier", "Focus"],
      widths: [28, 20, 52],
      zebra: true,
      rows: [
        ["Registrars and front-desk officers", "Woreda", "Checklist operation, certification acts, interpreter flow, stamping desk, corrections"],
        ["Control and complaint officers", "Woreda", "Complaint intake, grounds checklist, investigation, decision recording, team control"],
        ["Sub-city monitors", "Sub-city", "Dashboards, aggregation review, escalation to Bureau"],
        ["Bureau analysts and heads", "Bureau", "Adjustment study workspace, June publication, model contract versioning, penalty referral"],
        ["System administrators", "IT unit", "Configuration sets, user and role management, backup and restoration, audit review"],
        ["Public awareness", "Citizens", "What a valid contract is, electronic payment duty, how to complain safely"],
      ],
    }),
    h2("9.5 Cutover Checklist"),
    p("The go-live order at Gate G8 is given only when the cutover checklist is fully green. The checklist covers: final data reconciliation for the wave; training completion for the wave's offices; support roster and escalation tree staffed; rollback plan rehearsed in staging; announcement and awareness materials distributed; configuration frozen; backup and restore verified on production; and the hypercare schedule signed. Each item carries an owner and evidence, so the go-live decision is a review of facts rather than an act of faith."),
  ];
}

module.exports = { chapter7, chapter8, chapter9 };
