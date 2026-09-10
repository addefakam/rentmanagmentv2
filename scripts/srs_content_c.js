// srs_content_c.js — Chapter 3 (M8–M13) + Chapter 4 (External Interfaces)
const { h1, h2, p, tbl } = require("./plan_lib");

const H = ["ID", "Requirement", "Legal Source", "Pri."];
const W = [11, 57, 22, 10];

function fr(id, req, src, pri) { return [id, req, src, pri || "Must"]; }

function m8() {
  return [
    h2("3.8 Module M8 - Compliance Monitoring and Inspection"),
    p("The Directive gives the woreda office a double mandate: react to complaints and act on its own initiative. Article 20 structures field control precisely - control is performed by a team of more than one assigned professional, the lead inspector carries a government identification card declaring the control mandate during working hours, and findings must lead to the appropriate administrative decision. The module digitizes this as an inspection case: initiation (complaint-linked or self-initiated), team assignment with credential records, structured field checklists (contract presence, rent conformity with the registered price, advance payment legality, e-payment usage, occupancy status against vacancy rules), evidence capture, and a findings report that feeds the decision workflow. It also supports the standing verification duties of woreda offices under Article 16 - checking that presented contracts use the permitted increase rate and that payments flow through legal electronic channels."),
    ...tbl({
      caption: "M8 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M8-01", "Create inspection cases from complaints or on office initiative, linked to the property, contract, and parties.", "Dir. Art. 20(1); Proc. Art. 20(1)"),
        fr("FR-M8-02", "Assign inspection teams of two or more professionals and record their credential references for the mandate declaration.", "Dir. Art. 20(2-4)"),
        fr("FR-M8-03", "Provide structured field checklists and evidence capture (photos, documents, payment references) from mobile or office devices.", "Dir. Arts. 16, 20"),
        fr("FR-M8-04", "Produce findings reports with automatic classification of violations per the prohibition list and route them to the decision workflow.", "Dir. Art. 21"),
        fr("FR-M8-05", "Support woreda verification duties on presented contracts: increase-rate conformity and electronic-payment conformity checks.", "Dir. Arts. 16(3), 16(4)"),
      ],
    }),
  ];
}

function m9() {
  return [
    h2("3.9 Module M9 - Complaint and Case Management"),
    p("The complaint chain is deadline-driven and multi-channel. Article 18 of the Directive accepts complaints in person, verbally or in writing, by telephone, or through any other media, and Article 19 prescribes the admissibility checklist (complainant identity and address, property address, party names and addresses, date of the violation, and the ground classification) before the case enters the ledger. The Proclamation then sets the clock: the Regulatory Body must investigate and decide within 30 working days, and enforcement cannot start while the case is live. The module implements an omni-channel intake (public portal, office desk, phone log), the eight legal complaint grounds of Directive Article 17 as a controlled classification, a sequential case ledger, an investigation workspace with evidence requests to relevant bodies, decision recording, and the mandatory notification to the complainant. Anonymous reports are accepted but must still carry the property address and violation date to be admissible."),
    ...tbl({
      caption: "M9 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M9-01", "Accept complaints through all legal channels: public portal, in-person desk entry, verbal (recorded by officer), written, and phone; every channel produces the same structured case.", "Dir. Art. 18; Proc. Art. 20(1)"),
        fr("FR-M9-02", "Classify complaints against the eight legal grounds: renting without registration; paying above the registered price; unauthorized increase or excess advance; illegal term termination; house unutilized over six months; false evidence for incentives; non-residential or criminal use; any other legal violation.", "Dir. Art. 17"),
        fr("FR-M9-03", "Run the admissibility checklist and register admissible cases in a sequential case ledger with status tracking.", "Dir. Art. 19(1-3)"),
        fr("FR-M9-04", "Provide an investigation workspace with evidence requests to relevant bodies, findings, and proposed decisions.", "Dir. Art. 19(4)"),
        fr("FR-M9-05", "Enforce the 30-working-day decision deadline with escalation alerts, and record and communicate the decision to the complainant.", "Proc. Art. 20(2); Dir. Art. 19(5)"),
        fr("FR-M9-06", "Keep complainant identity confidential from the respondent while preserving due-process evidence sharing.", "PDPP 1321/2024; Dir. Art. 19"),
      ],
    }),
  ];
}

function m10() {
  return [
    h2("3.10 Module M10 - Appeals and Committee Hearings"),
    p("An aggrieved party may appeal a Regulatory Body decision to the Rent Complaint Hearing Committee within 15 working days, the Committee's decision is the final administrative step, and a dissatisfied party may still go to court within 30 days; meanwhile enforcement of the contested decision is blocked until the decision becomes final. The module manages this second deadline chain automatically: appeal intake with validity check against the 15-working-day window, hearing scheduling with quorum and minutes, decision records with the final-administrative-decision flag, the court escalation window countdown, and the enforcement gate that only unlocks when the case reaches finality. A shared working-day calendar (excluding public holidays per region) drives every deadline in M9, M10, and M11, which is what makes the deadline engine legally reliable."),
    ...tbl({
      caption: "M10 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M10-01", "Accept appeals within 15 working days of a decision, with automatic validity checking and acknowledgment receipts.", "Proc. Art. 24(1)"),
        fr("FR-M10-02", "Support Committee hearing management: scheduling, quorum recording, session minutes, and member conflict-of-interest notes.", "Proc. Art. 24(2)"),
        fr("FR-M10-03", "Record Committee decisions with the final-administrative-decision flag and immediate notification to all parties.", "Proc. Art. 24(3)"),
        fr("FR-M10-04", "Track the 30-day court escalation window after finality and provide certified case-file exports for court submission.", "Proc. Arts. 25, 26"),
        fr("FR-M10-05", "Operate the working-day deadline engine across complaints, appeals, registrations, and amendments, with configurable regional holiday calendars.", "Proc. Arts. 20, 24, 26; Dir. Art. 22(11)"),
      ],
    }),
  ];
}

function m11() {
  return [
    h2("3.11 Module M11 - Enforcement and Penalty Administration"),
    p("Enforcement is where the legal design is most protective of fairness: no administrative fine may be executed while a decision is still appealable, and the fine amounts are fixed by law rather than by the officer's mood. The Proclamation caps contract-related fines at three months' rent of the affected contract, and the Directive details the ladder per offense (for example, three months' rent for unregistered renting, escalating fines for late registration beyond the grace period, one month's rent for unregistered amendments, two months' rent for unauthorized increase, illegal eviction, or excess advance demands, three months' rent for notice-less termination, 10 percent per cash payment, and the vacancy tax escalation executed through the property tax channel). Some scanned figures in the Amharic source are laid out ambiguously, so the module must implement the ladder as configurable parameters confirmed at legal review, not hard-coded numbers. The module computes fines per offense and per responsible party, applies the finality gate from M10, tracks penalty payment, and prepares court referral files for unpaid fines."),
    ...tbl({
      caption: "M11 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M11-01", "Compute administrative penalties per offense type from a configurable, region-specific fine ladder expressed in months of the contract rent (or percentages where legally defined).", "Dir. Art. 22; Proc. Art. 4 [G1-CONFIRM]"),
        fr("FR-M11-02", "Enforce the finality gate: no penalty execution while a complaint or appeal is pending; unlock automatically upon decision finality.", "Proc. Arts. 20(5), 22(5), 25(2)"),
        fr("FR-M11-03", "Track penalty notices, payment status, deadlines, and receipts per responsible party.", "Dir. Art. 22"),
        fr("FR-M11-04", "Prepare court referral case files (decision, evidence index, penalty computation) for voluntarily unpaid fines.", "Dir. Art. 22(11)"),
        fr("FR-M11-05", "Forward vacancy tax surcharge events and filtered owner data to the tax enforcement channel and record the referral outcome.", "Dir. Art. 22(8-9)"),
        fr("FR-M11-06", "Mark contracts concluded unregistered as legally ineffective in public verification while keeping the record available to authorized offices for case handling.", "Proc. Arts. 4, 14"),
      ],
    }),
  ];
}

function m12() {
  return [
    h2("3.12 Module M12 - Reporting, Analytics and National Data Publication"),
    p("The Proclamation assigns the Ministry the duty to collect and publish rental data nationally, and the Directive builds the data pipeline to feed it: woreda offices scan and register, replicate to sub-city and Bureau (Article 13), sub-city offices consolidate and forward (Article 15), and the Bureau analyzes and disseminates (Article 14). The module turns that pipeline into automatic tiered consolidation and a publication layer: operational dashboards per tier (registration coverage, average rents, complaint volumes and outcomes, penalty execution, exemption and vacancy statistics), the annual rent-increase study pack with market analytics supporting the June 1 determination, and the public national data portal where the Ministry publishes anonymized aggregates. All published statistics must pass a privacy filter that suppresses personally identifying combinations before release."),
    ...tbl({
      caption: "M12 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M12-01", "Replicate registration, payment, and case data upward automatically: woreda to sub-city to Bureau to Ministry, with change propagation for corrections.", "Dir. Arts. 13(3-5), 15(2), 16(5)"),
        fr("FR-M12-02", "Provide operational dashboards per tier: registration coverage, rent statistics, complaint and appeal outcomes, penalties, exemptions, and vacancy indicators.", "Proc. Art. 18; Dir. Art. 14(5)"),
        fr("FR-M12-03", "Produce the annual rent increase study pack (market data, situational analysis inputs) supporting the Bureau determination announced June 1.", "Proc. Art. 8(1); Dir. Arts. 11(1), 14(6)"),
        fr("FR-M12-04", "Publish national anonymized data through the public portal: average rents per city, registered contract volumes, and annual statistics.", "Proc. Art. 18(3)"),
        fr("FR-M12-05", "Provide standard and ad-hoc report exports (PDF, spreadsheet) with role-based access and privacy filtering.", "Proc. Art. 18; PDPP 1321/2024"),
      ],
    }),
  ];
}

function m13() {
  return [
    h2("3.13 Module M13 - System Administration, Security, Audit and Configuration"),
    p("This module carries the obligations that keep the platform legally trustworthy over years of operation. The Directive mandates hybrid record keeping - hard and soft copies, scanning of contracts, duplicates, identity photos, and payment documents, backups at every tier, uniform register formats with sequential numbering across all woredas, and change propagation when a woreda corrects data (Article 13). The Proclamation and the standards baseline add security and auditability: every create, read of sensitive data, update, and decision is logged immutably; personal data is protected under the Personal Data Protection Proclamation; and regional variation (each city's directive figures, holiday calendars, fine ladders) lives in versioned configuration rather than code. The module also owns the trilingual user interface (Amharic, English and Afan Oromo, per approved change request CR-01) with dual EC/GC calendars, the notification service that keeps every legal deadline visible to citizens and officers, and the document generation and stamping workflow records required by Articles 8 to 10 of the Directive."),
    ...tbl({
      caption: "M13 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M13-01", "Record an immutable audit trail of all administrative actions and decisions (actor, action, object, before/after, timestamp, office).", "Dir. Art. 13; ISO 27001"),
        fr("FR-M13-02", "Manage scanned documents and attachments (contracts, duplicates, ID photos, payment documents) with hard-copy register cross-references and per-tier backup jobs.", "Dir. Art. 13(1-4)"),
        fr("FR-M13-03", "Enforce uniform register formats and uninterrupted sequential numbering per register across all woredas.", "Dir. Art. 13(3)"),
        fr("FR-M13-04", "Provide versioned regional configuration: directive parameters, fine ladders, increase rates, working-day calendars, and model contract text per jurisdiction.", "Proc. Art. 29; Dir. Art. 22 [G1-CONFIRM]"),
        fr("FR-M13-05", "Deliver trilingual UI (Amharic, English and Afan Oromo) with a language switcher on every screen and fallback to Amharic or English wherever a certified Afan Oromo rendering is not yet available, with dual Ethiopian and Gregorian calendar rendering and storage conversion.", "Dir. Art. 26 (EC dates); usability; CR-01"),
        fr("FR-M13-06", "Operate the notification service (SMS, email, in-app) for registration deadlines, June 1 and June 30 events, appeal windows, hearing schedules, and exemption expiries.", "Proc. Arts. 4, 8, 24; Dir. Art. 6(1)"),
        fr("FR-M13-07", "Record stamp issuance events, back-stamp verification annotations, and archive binding references produced by the certification workflow.", "Dir. Arts. 9, 10(7)"),
      ],
    }),
  ];
}

function chapter4() {
  return [
    h1("4. External Interface Requirements"),
    h2("4.1 User Interfaces"),
    p("The system presents four distinct user experiences on one platform. The public portal serves citizens and visitors in Amharic, English and Afan Oromo (CR-01) with rent statistics, contract and landlord verification lookups, the downloadable model agreement, and complaint submission. The citizen workspace (landlord, tenant, agent) supports registration, contract preparation, payment visibility, and case tracking. The office back-office serves registrars, stampers, inspectors, and case handlers with queue-based workflows, checklist screens mirroring the Directive verification points, and scanner integration. The committee workspace schedules hearings and records decisions, while the Bureau and Ministry consoles provide configuration, dashboards, and publication control. All interfaces follow a single design system, are responsive for mobile use, and meet accessibility basics (contrast, keyboard navigation)."),
    h2("4.2 Software and Communications Interfaces"),
    ...tbl({
      caption: "External system interfaces",
      headers: ["Interface", "Purpose and Direction", "Notes"],
      widths: [26, 44, 30],
      zebra: true,
      rows: [
        ["Banking / e-payment gateway", "Inbound payment notifications; outbound reconciliation queries; validates the Article 13 electronic-only rule", "Contract-dependent (placeholder partner); file-based fallback required"],
        ["SMS gateway", "Outbound deadline and event notifications to parties", "Localizable templates; trilingual (Amharic, English, Afan Oromo) per CR-01"],
        ["Email service", "Outbound formal notices, receipts, hearing schedules", "Delivery logging for audit"],
        ["Document scanning station", "Capture of contracts, IDs, duplicates at woreda offices", "Dir. Art. 13(2); PDF/A archiving"],
        ["Tax system referral", "Outbound vacancy surcharge events and filtered owner data", "Dir. Art. 22(8-9); initial phase manual export acceptable"],
        ["National data exchange (future)", "Bureau to Ministry aggregation; open data publication", "Proc. Art. 18; anonymized aggregates only"],
      ],
    }),
    h2("4.3 Hardware Interfaces"),
    p("Woreda and sub-city offices require A4 document scanners (duplex, 300 dpi minimum) for the mandatory digitization of contracts and attachments, printers for certified copies and official forms, and reliable connectivity to the central platform. Inspectors use tablets or laptops with camera capability for field evidence capture, with offline capture and later synchronization tolerated for areas with unstable connectivity. No specialized hardware is imposed on citizens beyond any smartphone or computer with a browser, keeping public access barriers low."),
  ];
}

module.exports = { m8, m9, m10, m11, m12, m13, chapter4 };
