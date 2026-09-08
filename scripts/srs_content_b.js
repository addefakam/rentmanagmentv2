// srs_content_b.js — Chapter 3: Functional Requirements (M1–M7)
const { h1, h2, p, tbl } = require("./plan_lib");

const H = ["ID", "Requirement", "Legal Source", "Pri."];
const W = [11, 57, 22, 10];

function fr(id, req, src, pri) { return [id, req, src, pri || "Must"]; }

function chapter3Intro() {
  return [
    h1("3. Functional Requirements"),
    p("This chapter specifies the thirteen functional modules of the system. Module boundaries follow the approved implementation plan and the natural seams of the legal workflow: identity and organization first, then the regulated asset lifecycle (parties, property, contract, price, exemption, payment), then the control lifecycle (inspection, complaint, appeal, enforcement), and finally the cross-cutting reporting and administration modules. Each module opens with a short narrative that explains the business context and the governing legal mechanics, followed by a requirement table. Every requirement is individually testable, carries its legal source, and is prioritized with MoSCoW so that the owner can approve scope incrementally."),
  ];
}

function m1() {
  return [
    h2("3.1 Module M1 - Organization, User and Access Management"),
    p("The system must mirror the administrative reality of the Proclamation and the Directive before any business object is created. The organization model encodes the four administrative levels (Ministry, Regional Bureau, sub-city office, woreda office) with their jurisdictions, so that every property, contract, complaint, and penalty is always attached to exactly one competent office. Access control then distinguishes citizen actors from staff actors: officers inherit permissions from their office and role (registrar, stamper professional, inspector, case handler, committee member, bureau analyst, administrator), while citizens own their personal accounts. This module also implements the separation of duties demanded by the Directive, which assigns verification, registration, stamping, and control to distinct professional roles (Dir. Arts. 8, 9, 20)."),
    ...tbl({
      caption: "M1 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M1-01", "Maintain the four-level organization hierarchy (Ministry, Regional Bureau, sub-city, woreda) with jurisdiction records; every business object must be bound to a woreda jurisdiction derived from the property address.", "Proc. Art. 18; Dir. Arts. 2, 14-16"),
        fr("FR-M1-02", "Provide role-based staff accounts per office with segregation of duties between registrar, stamper, inspector (team-based), case handler, committee member, and administrator roles.", "Dir. Arts. 8(1), 9, 20(2-4)"),
        fr("FR-M1-03", "Provide citizen self-service registration for landlord, tenant, and agent accounts with identity document capture and mobile phone verification.", "Dir. Art. 5(2)"),
        fr("FR-M1-04", "Support delegated administration: a Bureau administrator creates and disables sub-city and woreda staff accounts; woreda office heads manage their local queue assignments.", "Dir. Art. 14; Dir. Art. 16"),
        fr("FR-M1-05", "Enforce authentication with password policy, session timeout, optional two-factor authentication, and full login audit records.", "ISO 27001 alignment; PDPP 1321/2024"),
        fr("FR-M1-06", "Issue and record official control credentials for inspectors (a visible identification reference usable during field control), as required for inspection work performed in government working hours.", "Dir. Art. 20(3)"),
      ],
    }),
  ];
}

function m2() {
  return [
    h2("3.2 Module M2 - Party Registration and Profile Management"),
    p("Before any contract can be registered, the parties themselves must exist in the system with legally sufficient identity information. The model agreement devotes its first two clauses to the full identity blocks of lessor and lessee (name with grandfather name, region, city, sub-city, woreda or kebele, specific location, house number, telephone), and the Directive prescribes the acceptable identity document menu with original and copy verification. This module turns those clauses into a guided registration workflow, the detailed scenario of which was agreed as use case UC-L0 (landlord registration). It also handles agents, who must present legal power of attorney plus the identification of two witnesses, and it keeps the party record stable across name changes, which the Directive says may only be corrected upon a court decision."),
    ...tbl({
      caption: "M2 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M2-01", "Implement the landlord registration workflow (UC-L0): identity fields exactly as in Model Agreement clauses 1-2, contact details, identity document capture, and review confirmation.", "MA cl. 1-2; Dir. Art. 5(2)"),
        fr("FR-M2-02", "Accept the full legal identity document menu (resident ID, office ID, driving license, passport, advocate license, pension ID, student or professional license), each with original-plus-copy verification flags and scanned images.", "Dir. Art. 5(2)"),
        fr("FR-M2-03", "Support agent registration linked to a principal party, requiring the legal power of attorney document and identification of two witnesses, with expiry tracking of the mandate.", "Dir. Art. 5(3)"),
        fr("FR-M2-04", "Maintain tenant profiles with current and historical rental relationships, active contracts, and complaint involvement.", "MA cl. 2; Proc. Art. 18"),
        fr("FR-M2-05", "Detect duplicate party identities and record name or marital status changes only upon presentation of a court decision, notifying the database custodian per the correction procedure.", "Dir. Art. 12(4-6)"),
      ],
    }),
  ];
}

function m3() {
  return [
    h2("3.3 Module M3 - Property Registration and Status Classification"),
    p("The property is the regulated asset, and its legal status is the key that unlocks or removes price freedom. Article 2 of the Proclamation classifies houses as newly built, previously unoccupied, unutilized, or previously rented, and the model agreement requires the status to be stated in clause 4(1) using the three operational categories (existing rental house, newly built rental house, existing house never rented before). Because the exemption clocks of Article 10 and the phantom-rent rule of Article 8(10) both depend on this classification, the module demands supporting evidence at registration and protects against later manipulation: a change of status after first registration raises a compliance case rather than silently updating the record. The property address fields replicate the model agreement clause 3 block, and the woreda of the property determines the only office competent to register its contracts."),
    ...tbl({
      caption: "M3 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M3-01", "Maintain a property inventory with the full address block of Model Agreement clause 3 (region, city, sub-city, woreda or kebele, specific location, house number) plus ownership reference and service type (independent compound or rooms).", "MA cl. 3; Dir. Art. 7(5)"),
        fr("FR-M3-02", "Classify each property with the legal status enum: existing rented, newly built, previously unrented; require supporting evidence documents at classification time.", "Proc. Art. 2(2-4); MA cl. 4(1)"),
        fr("FR-M3-03", "Accept the ownership proof menu: holding certificate, undocumented-possession evidence from the competent organ, court-executed sale document, or inheritance proof; store original-plus-copy verification.", "Dir. Art. 5(4)"),
        fr("FR-M3-04", "Bind each property to exactly one woreda jurisdiction and enforce that its contracts are registered at that woreda office (with Bureau-level override for documented exceptional cases).", "Dir. Arts. 6(2), 7(5)"),
        fr("FR-M3-05", "Track occupancy and vacancy intervals per property; flag houses unutilized for more than six months to trigger the phantom-rent ceiling rule and potential vacancy tax events.", "Proc. Art. 8(10); Dir. Art. 21(9)"),
      ],
    }),
  ];
}

function m4() {
  return [
    h2("3.4 Module M4 - Contract Management and Registration"),
    p("This is the legal heart of the system. Proclamation Article 4 requires every contract to be written, signed, certified, and registered, on pain of invalidity and a fine of up to three months' rent, and gives parties 30 days from signing to register. The Directive then prescribes the exact office workflow: document checklist (nine verification points), registrar certification acts (signature witnessing, interpreter handling for deaf parties, copy-versus-original verification with back-page annotations and sequential document numbers), stamp issuance, computer database entry, and delivery of one certified copy to each party. The module digitalizes that flow end to end, generates the contract text from the official model agreement, and manages the whole contract lifecycle afterwards: amendments within 30 days, renewals, terminations, and the legacy migration campaign of Article 7 with its additional three-month grace window and four-witness requirement."),
    ...tbl({
      caption: "M4 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M4-01", "Generate contracts electronically from the official Model Agreement: all eight clauses plus signature and witness blocks, with clause 5(1-2) and 6(1-5) defaults that cannot be weakened below legal minimums.", "Proc. Art. 5; Dir. Art. 4; MA"),
        fr("FR-M4-02", "Validate the registration application against the Directive document checklist: contract content completeness, signature sets (new: parties plus witnesses; legacy: parties plus four witnesses), proclamation conformity, woreda jurisdiction, document completeness, originals with copies, duplicate copy for the office, and identity photo match.", "Dir. Arts. 5, 7"),
        fr("FR-M4-03", "Provide the registrar certification workflow: confirm free will and signatures, handle proxy and institution signatures, record sign-language interpreter involvement with association letter reference for deaf parties, verify copies against originals with name, date, sequential document number, and back-page annotation.", "Dir. Arts. 8(1), 8(2)"),
        fr("FR-M4-04", "Enforce the 30-day registration window from contract signature with automatic deadline tracking; register late submissions beyond the Directive grace as fine events routed to Module M11.", "Proc. Art. 4; Dir. Art. 22(1-2)"),
        fr("FR-M4-05", "Support the legacy contract migration campaign: pre-Proclamation contracts with four witnesses, special annotation that registration was voluntary and verified, and the additional three-month window of Article 7.", "Proc. Art. 7; Dir. Art. 8(2)"),
        fr("FR-M4-06", "Register contract amendments and extensions within 30 days; validate any rent change against the currently announced permitted increase before acceptance, and re-issue stamped copies.", "Dir. Art. 10(1-7); MA cl. 5"),
        fr("FR-M4-07", "Record renewals and terminations with their legal grounds (including the landlord no-notice grounds a to g), notice evidence, and handover state, keeping the full contract history immutable.", "Proc. Arts. 6, 15-17; MA cl. 6(3)"),
        fr("FR-M4-08", "Issue the unique register number and archive record upon stamping, store the stamped archive reference, and deliver certified copies to lessor and lessee (electronically and in print).", "Dir. Arts. 9(1), 9(5), 10(7)"),
      ],
    }),
  ];
}

function m5() {
  return [
    h2("3.5 Module M5 - Rent Ceiling and Annual Increase Engine"),
    p("Article 8 is the price control engine of the Proclamation: the Regulatory Body studies the market and fixes or adjusts rent ceilings for each city, announces the annual change on June 1, and the change takes hold on June 30. Contracts concluded between those dates must apply the new rate, and a landlord who raises rent mid-term may only do so within the announced adjustment and must notify both the tenant and the Regulatory Body in writing, as the model agreement repeats in clauses 5(1) and 5(2). The module operationalizes the full annual calendar - study data collection, rate determination, June 1 publication, June 30 automatic effect, contract re-registration prompts - and enforces the compliance checks at registration time (Directive Article 16(3) makes price-rate verification a woreda duty). It also encodes the two special price rules: free pricing for first-time rental of newly built houses (Article 9) and the phantom-rent ceiling for houses left unutilized for more than six months (Article 8(10))."),
    ...tbl({
      caption: "M5 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M5-01", "Maintain per-city (and optional sub-city level) rent ceiling records with study data support for the annual determination.", "Proc. Art. 8(1-3); Dir. Arts. 11(1), 14(6)"),
        fr("FR-M5-02", "Automate the annual increase calendar: rate publication on June 1, automatic effectiveness on June 30, and notification to all parties with active contracts plus registration prompts for amendments.", "Proc. Art. 8(4-5); Dir. Art. 11(2-3)"),
        fr("FR-M5-03", "Validate every contract rent and every amendment against the applicable ceiling at registration time; reject or flag amounts above the permitted rate for the property status and date.", "Proc. Art. 8(6-9); Dir. Art. 16(3)"),
        fr("FR-M5-04", "Record mid-term increase notices: landlord declaration, written notice evidence to tenant and Regulatory Body, and linkage to the registered amendment within 30 days.", "MA cl. 5(1-2); Dir. Art. 10"),
        fr("FR-M5-05", "Apply free-pricing flags for first-time rentals of newly built houses and the phantom-rent rule (ceiling equals the last genuine rent for houses unutilized over six months).", "Proc. Arts. 9, 8(10)"),
      ],
    }),
  ];
}

function m6() {
  return [
    h2("3.6 Module M6 - Exemption and Incentive Management"),
    p("Article 10 rewards owners who bring housing to the market, and it does so with clocks that start ticking at legally defined moments: up to four years for newly built houses and two years for previously unoccupied houses, with the clarification agreed in the analysis that the clock is armed when the property status is first evidenced and the first contract is registered. When an exemption expires and the house remains vacant in a shortage city, the additional 25 percent vacancy property tax applies, and the Directive adds an escalating ladder (5 to 25 percent by vacancy duration) executed through the property tax system with the Regulatory Body filtering and forwarding the data. The module arms, counts down, and expires these clocks automatically, warns owners ahead of expiry, computes the surcharge events, and - critically for integrity - treats false status claims as a sanctionable offense with the case routed to enforcement, since the Directive lists fraudulent incentive claims among both the prohibitions and the fine grounds."),
    ...tbl({
      caption: "M6 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M6-01", "Arm the exemption clock automatically at first contract registration (4 years newly built, 2 years previously unoccupied) and display remaining time on the property and contract records.", "Proc. Art. 10(1-2)"),
        fr("FR-M6-02", "Send expiry warnings to the owner and the Regulatory Body at configurable intervals before exemption end, and switch the property to the fully controlled price regime on expiry.", "Proc. Art. 10(2)"),
        fr("FR-M6-03", "Compute vacancy surcharge events (+25 percent property tax reference, and the Directive escalation ladder 5/10/15/20/25 percent by vacancy year band) and forward filtered data to the tax enforcement channel.", "Proc. Art. 10(4); Dir. Art. 22(8-9)"),
        fr("FR-M6-04", "Require evidence for status changes after first registration; route false status or fake evidence claims as penalty cases to Module M11.", "Dir. Arts. 21(10), 22(10)"),
        fr("FR-M6-05", "Maintain an incentive and exemption register with reporting per city for the Bureau and Ministry dashboards.", "Proc. Arts. 10(3), 18"),
      ],
    }),
  ];
}

function m7() {
  return [
    h2("3.7 Module M7 - Electronic Payment and Ledger"),
    p("Articles 12 to 14 form a closed evidence chain: advance payment is capped at two months, rent must move only through banks or other legal electronic means, and it is precisely the combination of the registered contract plus electronic payment records that courts must accept as admissible evidence. The module therefore maintains, for every registered contract, a payment schedule (advance within the cap, monthly rent with the due day chosen in model agreement clause 6(1)), reconciles incoming bank or e-payment notifications against that schedule, and publishes a ledger that both parties can consult. Because cash payment is not merely discouraged but sanctionable (the Directive fine ladder includes a 10 percent penalty per cash payment), the ledger also records cash-payment allegations captured through complaints or inspections and routes them to enforcement. Service charge allocation for water, electricity, telephone, security, and cleaning follows the model agreement clause 4(4) and Article 27 of the Proclamation."),
    ...tbl({
      caption: "M7 functional requirements",
      headers: H, widths: W, zebra: true,
      rows: [
        fr("FR-M7-01", "Generate per-contract payment schedules: advance payment capped at two months, monthly rent with the agreed due day, visible to both parties.", "Proc. Art. 12; MA cl. 6(1)"),
        fr("FR-M7-02", "Integrate with bank and electronic payment channels to record, match, and reconcile rent payments to contracts; recognize only bank or legal electronic channels as valid payment evidence.", "Proc. Arts. 13, 14; Dir. Art. 16(4)"),
        fr("FR-M7-03", "Maintain the electronic payment ledger as the admissible-evidence registry, with tamper-evident entries and downloadable receipts for parties.", "Proc. Art. 14"),
        fr("FR-M7-04", "Track arrears, partial payments, and late payment patterns; expose arrears reports to both parties and the Regulatory Body.", "Proc. Arts. 13-14"),
        fr("FR-M7-05", "Record cash-payment allegations from complaints or inspections and create per-occurrence fine events (10 percent of the payment) for Module M11.", "Dir. Art. 22(7)"),
        fr("FR-M7-06", "Record the service charge allocation (tenant, landlord, or shared) for water, telephone, electricity, security, cleaning, and similar services.", "MA cl. 4(4); Proc. Art. 27"),
      ],
    }),
  ];
}

module.exports = { chapter3Intro, m1, m2, m3, m4, m5, m6, m7 };
