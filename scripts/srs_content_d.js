// srs_content_d.js — Chapters 5–11
const { h1, h2, p, tbl } = require("./plan_lib");

function chapter5() {
  return [
    h1("5. Non-Functional Requirements"),
    p("Non-functional requirements follow the ISO/IEC 25010 quality model so that each quality characteristic is verifiable at the Phase 5 test stage. Numeric targets below are the acceptance baseline for the pilot deployment; they may be raised by the owner at Gate G2 but never silently lowered during construction. Where a target depends on deployment scale, it is stated for one full city (all sub-cities and woredas) as the unit of scale."),
    ...tbl({
      caption: "Non-functional requirements (ISO/IEC 25010 based)",
      headers: ["ID", "Characteristic", "Requirement and Acceptance Target"],
      widths: [10, 20, 70],
      zebra: true,
      rows: [
        ["NFR-01", "Performance", "Interactive screens respond within 3 seconds at the 95th percentile under a full-city load of 500 concurrent office users and 5,000 public portal users; registration submission completes within 5 seconds end to end."],
        ["NFR-02", "Availability", "99.5 percent availability during declared office hours for office functions and 99.0 percent around the clock for the public portal; planned maintenance outside office hours with 48-hour notice."],
        ["NFR-03", "Recoverability", "Backups per tier per Directive Art. 13(4): nightly full plus continuous transaction logging; recovery point objective 15 minutes, recovery time objective 4 hours; annual restore drill evidenced."],
        ["NFR-04", "Security", "OWASP ASVS Level 2 controls; TLS 1.2+ in transit; encryption at rest for personal and financial data; role-based access with least privilege; secrets management; annual penetration test before go-live."],
        ["NFR-05", "Privacy", "Personal data processing limited to legal purposes under PDPP 1321/2024; consent and purpose registry; anonymization gate before any publication; data subject request workflow with statutory response times."],
        ["NFR-06", "Locale and calendar", "Full Amharic, English and Afan Oromo interfaces (approved change request CR-01) with a language switcher on every screen and graceful fallback where a certified Afan Oromo rendering is pending; trilingual terminology glossary so interface labels, forms, notices and generated documents use the directive's own words; dual Ethiopian and Gregorian calendar display with unambiguous storage (UTC instants plus EC dates for legal records); Ethiopian numeric formatting for currency."],
        ["NFR-07", "Auditability", "One hundred percent of state-changing actions and sensitive reads logged immutably; logs retained at least 7 years; audit export per case and per user on demand."],
        ["NFR-08", "Scalability", "Architecture sized for national rollout: at least 10 regions, 100 sub-cities, and 1,000 woreda offices without architectural change; horizontal scaling of stateless services."],
        ["NFR-09", "Usability", "A registrar completes a standard contract registration in 15 minutes or less after two days of training; task-success rate above 90 percent in UAT scenarios; context help cites the governing legal article on each screen."],
        ["NFR-10", "Maintainability and portability", "Modular services per the M1-M13 boundaries; configuration over code for regional variation; automated CI/CD with regression suite; runs on mainstream Linux servers and mainstream browsers."],
        ["NFR-11", "Traceability", "Every requirement, design element, code module, and test case carries its trace links to this SRS and to the legal source; the trace matrix is regenerated at every gate."],
        ["NFR-12", "Data quality and integrity", "Sequential register numbering enforced database-side; contract records immutable after certification with corrective entries via the Article 12 correction workflow only."],
      ],
    }),
  ];
}

function chapter6() {
  return [
    h1("6. Use Case Registry"),
    p("The use case model agreed during the analysis phase comprises 21 use cases across six actor groups. The registry below restates each use case with its owning module and legal anchor, forming the functional backbone for sprint planning in Phase 4 and for scenario-based UAT in Phase 5. Use case UC-L0 (landlord registration) was elaborated step by step with the owner and is treated as the reference pattern for all registration-style workflows."),
    ...tbl({
      caption: "Use case registry (21 use cases)",
      headers: ["ID", "Use Case", "Primary Actor", "Module", "Legal Anchor"],
      widths: [9, 37, 18, 12, 24],
      zebra: true,
      rows: [
        ["UC-L0", "Landlord registration and profile creation", "Landlord", "M2", "MA cl. 1; Dir. Art. 5"],
        ["UC-L1", "Register property and declare legal status", "Landlord", "M3", "Proc. Art. 2; MA cl. 3-4"],
        ["UC-L2", "Prepare, sign, and register rental contract", "Landlord + Tenant", "M4", "Proc. Arts. 4-6; Dir. Arts. 6-9"],
        ["UC-L3", "Declare permitted rent increase / amend contract", "Landlord", "M5, M4", "Proc. Art. 8; MA cl. 5; Dir. Art. 10"],
        ["UC-T1", "Verify landlord and contract registration", "Tenant", "M12", "Proc. Arts. 4, 14"],
        ["UC-T2", "Pay rent electronically and view ledger", "Tenant", "M7", "Proc. Arts. 12-14"],
        ["UC-T3", "File complaint (overcharge, illegal eviction)", "Tenant", "M9", "Proc. Art. 20; Dir. Arts. 17-18"],
        ["UC-R1", "Verify documents and register contract", "Regulatory Officer", "M4", "Dir. Arts. 7-9"],
        ["UC-R2", "Conduct team inspection", "Regulatory Officer", "M8", "Dir. Art. 20"],
        ["UC-R3", "Decide complaint case", "Regulatory Officer", "M9", "Proc. Art. 20; Dir. Art. 19"],
        ["UC-C1", "Hear appeal and issue final decision", "Committee", "M10", "Proc. Art. 24"],
        ["UC-M1", "Publish national data and annual statistics", "Ministry", "M12", "Proc. Art. 18"],
        ["UC-P1", "View published rents and statistics", "Public", "M12", "Proc. Art. 18(3)"],
        ["UC-P2", "Verify contract authenticity / register number", "Public", "M11", "Proc. Arts. 4, 14"],
        ["UC-P3", "Report suspected violation", "Public", "M9", "Dir. Art. 18"],
        ["UC-P4", "Download official model agreement", "Public", "M4", "Proc. Art. 5; Dir. Art. 4"],
        ["UC-R4", "Administer penalties and enforcement", "Regulatory Officer", "M11", "Dir. Art. 22; Proc. Art. 4"],
        ["UC-R5", "Migrate legacy contracts (30+3 day campaign)", "Regulatory Officer + Landlord", "M4", "Proc. Art. 7; Dir. Art. 8(2)"],
        ["UC-T4", "Appeal decision to Committee", "Tenant / Landlord", "M10", "Proc. Art. 24"],
        ["UC-M2", "Configure regional parameters and calendars", "Ministry / Bureau", "M13", "Proc. Art. 29; Dir. Art. 22"],
        ["UC-R6", "Consolidate and forward tier data", "Sub-city / Bureau", "M12", "Dir. Arts. 13, 15, 16"],
      ],
    }),
  ];
}

function chapter7() {
  return [
    h1("7. Legal Traceability Matrix"),
    p("This chapter is the compliance backbone of the SRS. It demonstrates, provision by provision, that no binding rule of the three legal documents is left without a system capability. The matrix is maintained as a living artifact: at every subsequent gate it is regenerated from the design and test repositories so that the owner can verify end-to-end coverage (requirement, design, code, test). The tables below cover the load-bearing provisions; the complete clause-level matrix for the model agreement follows in Table 12."),
    h2("7.1 Proclamation Coverage"),
    ...tbl({
      caption: "Proclamation provisions to system capabilities",
      headers: ["Proc. Article", "Legal Content (summary)", "Module(s)", "FRs"],
      widths: [13, 47, 16, 24],
      zebra: true,
      rows: [
        ["Art. 2(2-4)", "Property status classification", "M3", "FR-M3-02"],
        ["Art. 3(3)", "Scope exclusions", "All", "Ch. 1.2"],
        ["Art. 4", "Written, certified, registered contracts; 30-day window; fine up to 3 months rent", "M4, M11", "FR-M4-02/04, FR-M11-01"],
        ["Art. 5", "Model agreement publication", "M4, M13", "FR-M4-01, FR-M13-04"],
        ["Art. 6", "Minimum 2-year term; written renewal", "M4", "FR-M4-01/07"],
        ["Art. 7", "Legacy contract migration 30+3 days", "M4", "FR-M4-05"],
        ["Art. 8", "Ceilings; annual increase June 1/30; phantom rent >6 months", "M5", "FR-M5-01..05"],
        ["Art. 9", "Free first-time pricing of new houses", "M5", "FR-M5-05"],
        ["Art. 10", "Exemption clocks; +25% vacancy tax; incentives", "M6", "FR-M6-01..05"],
        ["Art. 12", "Advance cap 2 months", "M7", "FR-M7-01"],
        ["Art. 13", "Bank / e-payment only", "M7, M8", "FR-M7-02, FR-M8-05"],
        ["Art. 14", "Admissible evidence = registered contract + e-payment records", "M7, M11", "FR-M7-03, FR-M11-06"],
        ["Arts. 15-17", "Termination regime incl. no-notice grounds a-g", "M4", "FR-M4-07"],
        ["Art. 18", "Ministry duties; national data publication", "M12", "FR-M12-04"],
        ["Art. 19", "Regulatory Body duties; IT system mandate 19(5)", "M1, M13", "FR-M1-01, platform itself"],
        ["Arts. 20-26", "Complaints, deadlines, Committee, court, enforcement gate", "M9, M10, M11", "FR-M9-05, FR-M10-01..05, FR-M11-02"],
        ["Art. 29", "Regional implementation directives", "M13", "FR-M13-04"],
      ],
    }),
    h2("7.2 Directive Coverage"),
    ...tbl({
      caption: "Directive provisions to system capabilities",
      headers: ["Dir. Article", "Legal Content (summary)", "Module(s)", "FRs"],
      widths: [13, 47, 16, 24],
      zebra: true,
      rows: [
        ["Art. 4", "Contract content; model annexed; Bureau may improve", "M4", "FR-M4-01"],
        ["Art. 5", "Documents at registration (IDs, POA, ownership proofs)", "M2, M3", "FR-M2-02/03, FR-M3-03"],
        ["Art. 6", "Public call; in-person at woreda; computer-typed form", "M4, M13", "FR-M4-02, FR-M13-05"],
        ["Art. 7", "Nine-point document verification checklist", "M4", "FR-M4-02"],
        ["Art. 8", "Registrar certification acts; legacy annotation", "M4", "FR-M4-03/05"],
        ["Art. 9", "Stamping; database entry; certified copies", "M4, M13", "FR-M4-08, FR-M13-07"],
        ["Art. 10", "Amendments within 30 days; increase validation", "M4, M5", "FR-M4-06, FR-M5-03"],
        ["Art. 11", "Annual increase study; June 1 / June 30", "M5", "FR-M5-01/02"],
        ["Art. 12", "Registration corrections; court-decision changes", "M2, M13", "FR-M2-05"],
        ["Art. 13", "Hard+soft records; scanning; tier replication; backups; uniform registers", "M12, M13", "FR-M12-01, FR-M13-02/03"],
        ["Arts. 14-16", "Bureau, sub-city, woreda duties; IT mandates 14(4), 16(6)", "M1, M12", "FR-M1-04, FR-M12-01"],
        ["Art. 17", "Eight complaint grounds", "M9", "FR-M9-02"],
        ["Art. 18", "Multi-channel complaint submission", "M9", "FR-M9-01"],
        ["Art. 19", "Admissibility checklist; ledger; decision notice", "M9", "FR-M9-03..05"],
        ["Art. 20", "Team control with credentials", "M8", "FR-M8-01/02"],
        ["Art. 21", "Prohibited acts list", "M8, M11", "FR-M8-04"],
        ["Art. 22", "Administrative penalties ladder; tax escalation; court referral", "M11", "FR-M11-01..05"],
      ],
    }),
    h2("7.3 Model Agreement Field Mapping"),
    ...tbl({
      caption: "Model Agreement clauses to digital form fields",
      headers: ["MA Clause", "Digital Form Element", "Validation / Automation"],
      widths: [16, 42, 42],
      zebra: true,
      rows: [
        ["cl. 1 (lessor)", "Landlord identity block", "From registered party profile; cannot diverge"],
        ["cl. 2 (lessee)", "Tenant identity block", "From registered party profile"],
        ["cl. 3 (property)", "Property address and ownership block", "From registered property; woreda routing"],
        ["cl. 4(1)", "House status selector", "Three-value enum; drives exemption clock"],
        ["cl. 4(2)", "Rent (words and figures) and term", "Term at least 2 years; rent vs ceiling check"],
        ["cl. 4(3)", "Renewal clause", "Renewal workflow requires written renewal"],
        ["cl. 4(4)", "Service charge payer", "Enum tenant/landlord/shared; Art. 27 reference"],
        ["cl. 5(1-2)", "Increase clauses", "Locked to announced annual rate; notice tasks"],
        ["cl. 6(1)", "Advance and monthly due day", "Advance capped at 2 months; schedule generation"],
        ["cl. 6(2-5)", "Tenant obligations", "Static legal text; e-payment clause locked"],
        ["cl. 7", "Gap-filler reference to Proclamation", "Static text"],
        ["cl. 8", "Certification effect clause", "Contract effective only after regulator certification"],
        ["Signatures + 3 witnesses", "Signature and witness blocks", "Witness IDs captured; legacy contracts require 4"],
      ],
    }),
  ];
}

function chapter8() {
  return [
    h1("8. Data Requirements"),
    p("The persistent data model centers on nine master entities: Party, Agent Mandate, Property, Contract, Contract Amendment, Payment, Case (complaint, inspection, appeal), Penalty, and Exemption. Supporting entities cover the organization hierarchy, staff accounts and roles, documents and scans, register number sequences, notifications, configuration versions per jurisdiction, and the immutable audit log. Every legal record stores both its Ethiopian Calendar legal date and its UTC instant. Retention follows the legal value of records: contracts, registers, decisions, and penalty files are retained permanently in the archive tier; operational logs follow the NFR-07 retention; personal data is retained no longer than the legal purpose requires, per the privacy regulation. All register counters are allocated centrally so that numbering remains gapless and uniform across woredas even during offline operation with deferred synchronization."),
    p("Data migration deserves special emphasis: the legacy contract campaign (Proclamation Article 7) requires bulk intake of pre-existing paper contracts during the pilot, so the model includes a staging area for migrated contracts with source-document scans, the four-witness records, and the legacy annotation flag, keeping migrated records distinguishable from born-digital ones without any difference in legal effect."),
  ];
}

function chapter9() {
  return [
    h1("9. Verification and Acceptance Approach"),
    p("Verification follows the V-model commitment of the implementation plan: every requirement in Chapter 3 maps to at least one acceptance criterion in its module test pack, and every legal constraint in Chapter 2.5 maps to a compliance test case in the legal test pack. Three test layers are planned. Unit and integration verification during construction sprints checks requirement-level behavior. System testing executes the full business scenarios from the use case registry, including the deadline engine behavior across June 1, June 30, the 30-day registration window, the 15-working-day appeal window, and the 30-working-day decision window. Acceptance testing is scenario-based UAT executed by nominated Bureau and woreda business focal persons, using the same forms and checklists they use today, so that legal fidelity is confirmed by the people who operate the law."),
    p("The Gate G1 exit criteria are: (a) all Must-priority requirements approved by the owner; (b) every [G1-CONFIRM] item resolved; (c) the traceability matrix showing 100 percent coverage of the binding provisions listed in Chapter 7; and (d) no open severity-one ambiguities. Meeting these criteria freezes the requirements baseline for Phase 2 architecture."),
  ];
}

function chapter10() {
  return [
    h1("10. Open Items and Regional Configuration Parameters"),
    p("The following items are intentionally declared open rather than silently assumed. Each has an owner and a resolution deadline at or before Gate G2 so that design work is never blocked while still preventing unconfirmed figures from being hard-coded."),
    ...tbl({
      caption: "Open items register",
      headers: ["#", "Open Item", "Impacted FRs", "Resolution Path"],
      widths: [6, 44, 20, 30],
      zebra: true,
      rows: [
        ["O1", "Directive Art. 22 fine ladder exact figures (scanned two-column layout partly ambiguous)", "FR-M11-01", "Confirm against official Amharic text at legal review; encode as configurable parameters"],
        ["O2", "Regional directive variants for cities outside Addis Ababa", "FR-M13-04", "Collect per-city directives before regional rollout (Phase 6)"],
        ["O3", "Banking / e-payment partner APIs and file formats", "FR-M7-02", "Tender and integration spike during Phase 2; file-based fallback defined"],
        ["O4", "SMS gateway provider and template approvals", "FR-M13-06", "Procurement during Phase 3; templates approved by Bureau communications"],
        ["O5", "Archival retention periods harmonization (7-year default vs any city archive rule)", "NFR-07, FR-M13-02", "Confirm with Bureau records office at Gate G2"],
        ["O6", "Sub-city level rent ceiling granularity (city-wide vs sub-city rates)", "FR-M5-01", "Bureau study team decision before first June 1 cycle"],
      ],
    }),
  ];
}

function chapter11() {
  return [
    h1("11. Approval and Change Control"),
    p("This SRS becomes the frozen Phase 1 baseline when the owner signs the Gate G1 approval below. After freezing, any change follows the change control procedure of the implementation plan: a change request describing the driver (legal amendment, operational correction, or enhancement), an impact analysis across the traceability matrix, and explicit owner approval before the baseline is updated and re-versioned. Minor editorial corrections that do not alter behavior may be applied by the project librarian with traceable version notes."),
    ...tbl({
      caption: "Approved change requests affecting this baseline",
      headers: ["CR", "Title and driver", "Requirements touched", "Approval"],
      widths: [10, 42, 30, 18],
      zebra: true,
      rows: [
        ["CR-01", "Add Afan Oromo as a third system language alongside Amharic and English. Driver: owner directive of 2026-09-10; the platform serves Oromo-speaking landlords, tenants and officers, so public portal, office workbenches, notifications and generated documents must render in all three languages, with certified legal terminology and fallback where a rendering is not yet certified.", "NFR-06; FR-M13-05; M13 module text; public portal interface text; SMS and notification template rules; terminology glossary (bilingual to trilingual)", "Approved by owner 2026-09-10"],
      ],
    }),
    ...tbl({
      caption: "Gate G1 approval record",
      headers: ["Role", "Name", "Signature", "Date"],
      widths: [30, 30, 22, 18],
      zebra: true,
      rows: [
        ["Project Owner / Product Owner", "", "", ""],
        ["Regulatory Body Business Focal", "", "", ""],
        ["Project Manager", "", "", ""],
        ["Lead Business Analyst", "", "", ""],
      ],
    }),
    ...tbl({
      caption: "Document version history",
      headers: ["Version", "Date", "Author", "Change Summary"],
      widths: [12, 18, 28, 42],
      zebra: true,
      rows: [
        ["0.9", "2026-09-08", "Business Analysis Team", "Draft consolidated from legal analysis, FR workshop, and use case model"],
        ["1.0", "2026-09-08", "Business Analysis Team", "Issued for Gate G1 owner review and approval"],
        ["1.1", "2026-09-10", "Business Analysis Team", "CR-01 applied: Afan Oromo added as third language across UI, notifications, document generation and glossary; trilingual localization requirements recorded (NFR-06, FR-M13-05); issued for Gate G3 package"],
      ],
    }),
  ];
}

module.exports = { chapter5, chapter6, chapter7, chapter8, chapter9, chapter10, chapter11 };
