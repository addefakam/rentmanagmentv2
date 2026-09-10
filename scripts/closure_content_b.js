// closure_content_b.js — Project Closure Minute (Signed), chapters 7-8.
// Chapter 7: the project record (gate ledger, verification totals, deliverables).
// Chapter 8: the signature block that closes the program.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

function chapter7() {
  return [
    h1("7. The Project Record"),
    p("The gate ledger is the program's spine, and it closes complete: ten gates, each with its deliverable, its decision, and its evidence - from the roadmap the implementation plan drew, through the requirements and architecture baselines, the constructed modules, the integration and security verification, user acceptance with a legal validation memorandum, the migration and pilot, go-live hardening, and the operational half that ended in the signed minute of chapter two. Three gates carry formal written decision references (the pilot authorization, the go-live order, and this closure); the earlier gates carry the owner's approvals recorded in their gate packages and the project's worklog, which the audit trail of the gate reviews supports."),
    ...tbl({
      caption: "Gate ledger G0-G9 (complete)",
      headers: ["Gate", "Deliverable judged", "Decision and reference"],
      widths: [10, 52, 38],
      zebra: true,
      rows: [
        ["G0", "Implementation Plan - Hybrid Phase-Gated Incremental SDLC, 9 phases / 10 gates / 48-activity checklist", "Approved - plan baselined"],
        ["G1", "SRS v1.0 - 13 modules, 74 FRs, 12 NFRs, 21 use cases, legal traceability", "Approved - requirements frozen"],
        ["G1+", "SRS v1.1 - CR-01 change: Afan Oromo as third language (NFR-06)", "Approved - baseline revised"],
        ["G2", "Architecture and design - three-tier administration, rule engine, security design", "Approved - design frozen"],
        ["G3", "Environments, CI/CD staged promotion, seeded configuration (131 org units, 118 woredas)", "Approved - Phase 4 authorized"],
        ["G4", "Sprints S1-S7 - 13 modules, 17 APIs, trilingual console", "Approved - Phase 5 authorized"],
        ["G5", "Integration, security (ASVS L2), 47-row legal compliance matrix, performance", "Approved - Phase 6 authorized"],
        ["G6", "UAT 8 scenarios / 50 steps, legal memorandum LVM-G6-2026-01, UAT certificate", "Approved - certificate signed; migration authorized"],
        ["G7", "Legacy migration w/ Dir. Art. 8(2) annotation, Art. 13 reconciliation, training, pilot, awareness (Arts. 14/16)", `Approved - ${"GATE-G7-2026-09-10"}; Wave 0 pilot live`],
        ["G8", "Go-live hardening (DEF-06-01 session layer, O-7 register confirmation), checklist 10/10 GREEN, drills", `Approved - ${"GATE-G8-2026-09-10"}; go-live order executed`],
        ["G9", "Operations under the order, hypercare 28/28, first annual cycle, referrals, feed, handover, 90-day PIR, closure minute", `Approved - ${"GATE-G9-2026-09-11"}; minute SIGNED, project closed`],
      ],
    }),
    h2("7.1 Verification Totals Across the Program"),
    p("The numbers a reviewer would ask for, gathered once so the closure does not depend on memory: the automated battery closed at 176 passing cases with zero failures across seven suites; the live HTTP walkthroughs closed with the golden path 31/31, the Phase 7 suite 20/20, the Phase 8 operations drill 34/34, and the Gate G9 drill 28/28; user acceptance ran 50 of 50 steps across eight role-based scenarios; the legal compliance matrix walked 47 rows with 45 confirmations and 2 confirmations-with-disposition and zero deviations; the migration reconciled to the paper registers woreda by woreda under the Directive's Article 8(2) annotation; and the audit chain closes intact at 814 events with every hash re-verified. Each figure is re-readable from its gate package and from the platform's own registers, which was the point of building the platform as the evidence system."),
    h2("7.2 The Deliverable Record"),
    ...tbl({
      caption: "Project deliverables (as delivered to the owner)",
      headers: ["Document", "Gate"],
      widths: [78, 22],
      zebra: true,
      rows: [
        ["Rent_Control_System_Implementation_Plan.docx - SDLC plan, 48-activity checklist, risk register, owner guide", "G0"],
        ["Rent_Control_System_SRS_v1.0.docx - requirements baseline with legal traceability", "G1"],
        ["Rent_Control_System_SRS_v1.1.docx - CR-01 trilingual revision", "G1+"],
        ["Rent_Control_System_Phase3_Report.docx - environments, CI/CD, seeded configuration", "G3"],
        ["Rent_Control_System_Phase4_Report.docx - 13 modules, 17 APIs, trilingual console", "G4"],
        ["Rent_Control_System_Phase5_Report.docx - integration, security, 47-row compliance matrix", "G5"],
        ["Rent_Control_System_Phase6_Report.docx - UAT, legal memorandum, UAT certificate", "G6"],
        ["Rent_Control_System_Phase7_Report.docx - migration, training, pilot, awareness materials", "G7"],
        ["Rent_Control_System_Phase8_Report.docx - go-live hardening, cutover checklist, drills, operations manual", "G8"],
        ["Rent_Control_System_Gate_G9_Closure_Report.docx - operations record and closure request", "G9"],
        ["Rent_Control_System_Project_Closure_Minute.docx - this document: the signed closure", "G9"],
      ],
    }),
    p("Beyond the documents, the deliverable the owner keeps is the running platform itself: the Next.js console in three languages, the rule engine that refuses what the Proclamation and the Directive forbid and records why, the registers that made the gates short, and the operations manual and runbook that carry the procedures forward. The documents explain the platform; the platform is the system of record."),
  ];
}

function chapter8() {
  const M = require("./g9_closure_evidence.json").decision.minute;
  return [
    h1("8. The Signature"),
    p("The program closes on this page. The owner's decision - recorded on the platform under the written reference below, frozen against revision by the signed minute's own refusal of a second signature, and witnessed by the hash-chained audit event the execution wrote - is transcribed here in the form the plan's gate model requires. With the signature, the project team is released, the standing service accepts the transitions of chapter four, and the Residential House Rent Control and Administration System becomes what its Proclamation asked it to be: administered law, running daily, in the language of the people it serves."),
    ...tbl({
      caption: "Closure signature block",
      headers: ["Field", "Value"],
      widths: [34, 66],
      zebra: false,
      rows: [
        ["Project", "Residential House Rent Control and Administration System (Proclamation No. 1320/2016; Addis Ababa Directive No. 7/2016; Model Rental Agreement)"],
        ["Closure minute", `${M.reference} - ${M.status} (platform register)`],
        ["Written decision reference", M.g9Ref],
        ["Decision", "Gate G9 approved - project closed; team released; BAU transitions accepted"],
        ["Signed by", M.signedBy],
        ["Date of decision", M.signedAt],
        ["Witnessed by", `Audit event CLOSURE_MINUTE_SIGN in the platform hash chain - ${require("./g9_closure_evidence.json").auditChain.checked} events verified intact`],
      ],
    }),
    p("The registers remain open for the service that inherits them: the Wave 2 order with city operations, the monthly feed, the 2027 cycle workspace, and the backlog under review. The project's last act is to hand them over - signed, reconciled, and running."),
  ];
}

module.exports = { chapter7, chapter8 };
