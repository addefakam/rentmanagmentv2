// srs_content_a.js — Chapter 1 (Introduction) + Chapter 2 (Overall Description)
const { h1, h2, h3, p, rich, bullet, tbl } = require("./plan_lib");

function chapter1() {
  const out = [];
  out.push(h1("1. Introduction"));
  out.push(p("This Software Requirements Specification (SRS) defines the complete, verifiable functional and non-functional requirements of the Residential House Rent Control and Administration System. It is the Phase 1 deliverable of the approved Hybrid Phase-Gated Incremental implementation plan, and it consolidates every requirement discussed and agreed during the legal analysis, functional requirement definition, and use case modelling activities of this project. The SRS is written so that every single requirement can be traced back to at least one binding legal provision in the Proclamation, the implementing Directive, or the official Model Rental Agreement, which guarantees that the future system cannot drift away from the law during design and construction."));
  out.push(p("The document is the single baseline against which architecture (Phase 2), module construction (Phase 4), and the legal compliance test pack (Phase 5) will be produced. Any later change to a requirement must pass through the change control procedure defined in the implementation plan and must re-confirm the legal source cited here. The primary audience of this SRS is the project owner (the client and designated product owner), the regulatory body business experts who will confirm operational accuracy, and the engineering team that will design, build, and test the system."));

  out.push(h2("1.1 Purpose"));
  out.push(p("The purpose of this document is to specify, in verifiable and testable language, what the Rent Control and Administration System must do to fully implement Proclamation No. 1320/2016 and its subsidiary instruments. It translates legal obligations into system capabilities, assigns each capability a unique requirement identifier, and records the exact article numbers that make the capability mandatory. This removes ambiguity between business expectation and engineering interpretation, and it allows the owner to approve requirements one by one at Gate G1."));

  out.push(h2("1.2 Project Scope"));
  out.push(p("The system digitalizes the entire regulated residential rental lifecycle: party registration (landlords, tenants, agents), property registration with legal status classification, written contract preparation using the official model agreement, contract certification and registration at the competent woreda office, rent ceiling publication and annual increase administration, exemption clock management for newly built and previously unoccupied houses, electronic payment recording, complaint intake and investigation, committee appeals, administrative penalties and enforcement, tiered data consolidation, and national data publication by the Ministry."));
  out.push(p("In line with Article 3(3) of the Proclamation, the system explicitly excludes hotels, resorts, guest houses, and commercially licensed rental services from its regulatory scope. The system supports the three-tier administrative structure: the Federal Ministry sets policy and publishes national data; regional city administrations (Bureaus) act as regulatory bodies issuing implementation directives and rent adjustments; and sub-city and woreda housing offices deliver front-line registration, inspection, and case handling services to citizens."));

  out.push(h2("1.3 Definitions and Acronyms"));
  out.push(...tbl({
    caption: "Definitions and acronyms used in this SRS",
    headers: ["Term", "Definition"],
    widths: [24, 76],
    zebra: true,
    rows: [
      ["Proclamation", "Residential House Rent Control and Administration Proclamation No. 1320/2016, the parent law (32 articles)."],
      ["Directive", "Addis Ababa City Residential House Rent Control and Administration Directive No. 7/2016, issued under Proclamation Article 29(2); regional counterpart directives are expected in other cities."],
      ["Model Agreement", "The official Model Rental Agreement annexed to the Directive and published under Proclamation Article 5; the mandatory content template for every written rental contract."],
      ["Regulatory Body", "The city administration organ mandated to control rental contracts and prices (Proclamation Art. 19; Directive Art. 2(6)) - in Addis Ababa, the Housing Development and Administration Bureau and its offices."],
      ["Bureau / Sub-city / Woreda", "The three administrative service tiers defined by the Directive: the Bureau (city level), sub-city housing offices, and woreda housing offices."],
      ["Registrar", "The contract registrar professional at a woreda office who verifies documents and registers contracts (Directive Arts. 8-9)."],
      ["FR / NFR", "Functional Requirement / Non-Functional Requirement, identified as FR-Mxx-nn and NFR-nn."],
      ["MoSCoW", "Requirement prioritization scheme: Must have, Should have, Could have, Won't have (this release)."],
      ["EC / GC", "Ethiopian Calendar / Gregorian Calendar. The system must display and store both."],
      ["Legacy contract", "A rental contract concluded before the Proclamation entered into force, subject to the 30+3 day migration window of Article 7."],
    ],
  }));

  out.push(h2("1.4 Reference Documents"));
  out.push(...tbl({
    caption: "Binding and informative references",
    headers: ["Ref", "Document", "Role"],
    widths: [10, 58, 32],
    zebra: true,
    rows: [
      ["R1", "Proclamation No. 1320/2016 - Residential House Rent Control and Administration (English translation)", "Binding legal source"],
      ["R2", "Addis Ababa City Residential House Rent Control and Administration Directive No. 7/2016 (Amharic, incl. annexed Model Agreement)", "Binding legal source"],
      ["R3", "The New Residential House Rental Model Agreement (Amharic)", "Binding content template"],
      ["R4", "Project Master Implementation Plan v1.0 (this project)", "Governing process document"],
      ["R5", "ISO/IEC/IEEE 29148 - Requirements engineering", "Informative standard"],
      ["R6", "ISO/IEC 25010 - Product quality model", "Informative standard"],
      ["R7", "ISO/IEC 27001 - Information security management", "Informative standard"],
      ["R8", "Ethiopia Personal Data Protection Proclamation No. 1321/2024", "Binding for personal data handling"],
    ],
  }));

  out.push(h2("1.5 Document Conventions"));
  out.push(p("Functional requirements are grouped into thirteen modules numbered M1 to M13 that mirror the module structure approved in the implementation plan. Each requirement carries an identifier of the form FR-Mxx-nn, a testable statement, the legal source that mandates it, and a MoSCoW priority. The legal source uses compact citations: Proc. for the Proclamation, Dir. for the Directive, and MA for the Model Agreement, followed by article or clause numbers. Non-functional requirements use NFR-nn identifiers and are organized by the ISO/IEC 25010 quality characteristics. Where a legal figure was partly ambiguous in the scanned Directive text, the requirement is still stated normatively but the exact numeric value is declared a configurable parameter and listed in Chapter 10 for confirmation at the legal review."));
  out.push(p("Statements marked with [G1-CONFIRM] require explicit owner confirmation at the Gate G1 review before they are frozen into the design baseline. This convention keeps the interaction between the owner and the project smooth and prevents silent assumptions from entering the build."));

  return out;
}

function chapter2() {
  const out = [];
  out.push(h1("2. Overall Description"));

  out.push(h2("2.1 Product Perspective"));
  out.push(p("The system is a new national-capable government platform that replaces the manual, paper-based contract registers currently used in woreda housing offices. The Directive itself anticipates this digitalization: Article 14(4) obliges the Bureau to introduce an information technology supported modern contract registration system, Article 16(6) obliges every woreda office to implement it, and Article 13 already prescribes the hybrid record keeping model (hard copy plus soft copy, scanning, backups, and data replication to the sub-city and the Bureau) that the software must automate. The Proclamation completes the mandate at federal level through Article 19(5), which directs the Regulatory Body to build a modern, IT supported rental housing information system."));
  out.push(p("The platform is therefore not a single-office tool but a multi-tenant, jurisdiction-aware system: every woreda office operates the same registration workflow on shared data, sub-city offices consolidate, Bureaus regulate and publish price adjustments, and the Ministry aggregates nationally. The product comprises a public portal for citizens, an office back-office for registrars and inspectors, a committee workspace for appeal hearings, and an analytics and publication layer for the Bureau and the Ministry."));

  out.push(h2("2.2 Administrative and Deployment Context (Three-Tier Structure)"));
  out.push(p("The deployment and authorization model follows exactly the three-tier administrative structure agreed in the implementation plan. The table below states each tier, its legal duties, and the primary system capabilities it consumes."));
  out.push(...tbl({
    caption: "Three-tier administrative structure and system mapping",
    headers: ["Tier", "Legal Duties (source)", "Primary System Capabilities"],
    widths: [20, 40, 40],
    zebra: true,
    rows: [
      ["Federal: Ministry", "Policy, national data collection and publication (Proc. Art. 18); national platform mandate via Regulatory Bodies (Proc. Art. 19(5))", "National dashboards, consolidated registry, public national data publication (M12), national configuration and standards (M13)"],
      ["Regional / City: Bureau (Regulatory Body)", "Issue directives, improve model contract, annual rent increase study announced June 1 effective June 30, awareness, supervision (Dir. Arts. 11, 14; Proc. Art. 8)", "Rent increase engine, directive parameter configuration, model contract publishing, tier-2 dashboards, complaint oversight (M5, M12, M13)"],
      ["City Intermediate: Sub-city Office", "Follow up and control woreda offices, consolidate woreda data, forward to Bureau, sub-city awareness (Dir. Art. 15)", "Consolidated registers, data replication target, supervision reports (M12, M13)"],
      ["Front Line: Woreda Office", "Register and certify contracts at the woreda where the house is located, verify documents and prices, receive complaints and appeals, enforce penalties, scan and forward data (Dir. Arts. 6, 16, 17-19, 22)", "Registration and certification workflow, complaint intake, inspection, penalty administration, scanning and upload (M4, M8, M9, M11)"],
    ],
  }));
  out.push(p("Data authority flows upward and service delivery flows downward: a contract is registered once, at the woreda where the property lies, and the record is automatically replicated to the sub-city office and the Bureau as required by Directive Article 13(3). This one-registration-many-consumers principle eliminates duplicate registration and gives every tier a consistent, real-time view of the same legal facts."));

  out.push(h2("2.3 Actor Profiles"));
  out.push(...tbl({
    caption: "System actors and their goals",
    headers: ["Actor", "Description and Primary Goals"],
    widths: [26, 74],
    zebra: true,
    rows: [
      ["Landlord", "Registers identity and property, prepares and signs the model agreement, obtains certification and register number, declares permitted rent increases, receives payments electronically."],
      ["Tenant", "Verifies the landlord and contract are registered, pays rent only through bank or legal electronic means, files complaints for overcharging or illegal eviction, appeals decisions."],
      ["Agent", "Acts under legal power of attorney with two witnesses for either party during registration (Dir. Art. 5(3)); manages a portfolio of represented parties."],
      ["Regulatory Body Officer", "Registrar, stamper, inspector, and analyst roles at woreda, sub-city, and Bureau levels; verify documents, register contracts, conduct team inspections, decide complaints, and enforce penalties."],
      ["Rent Complaint Hearing Committee", "Hears appeals within 15 working days, issues the final administrative decision, records minutes and outcomes."],
      ["Ministry", "Collects and publishes national rental data, monitors regional performance, defines national parameters and standards."],
      ["Public (unregistered visitor)", "Consults published average rents and statistics, verifies that a contract or landlord is registered, downloads the model agreement, reports violations."],
    ],
  }));

  out.push(h2("2.4 Operating Environment"));
  out.push(p("The system runs as a web application accessed through standard browsers, with responsive layouts so that office staff on desktops and citizens on mobile phones share one platform. Woreda offices are equipped with document scanners and printers because Directive Article 13(2) requires scanning of contracts, duplicates, identity photos, and payment documents; the back-office therefore includes a scan-capture station workflow. Public services must remain usable under low-bandwidth conditions common in the deployment geography, so pages are lightweight and documents are compressed. SMS and email gateways deliver legally meaningful deadline reminders, and the platform exposes controlled APIs for the banking channel integration required by the electronic payment mandate."));
  out.push(p("Because Ethiopian administrative dates follow the Ethiopian Calendar while international integrations use the Gregorian Calendar, the environment must support dual-calendar rendering and storage. All timestamps are stored in UTC with an explicit EC/GC conversion layer; this is elaborated in NFR-06."));

  out.push(h2("2.5 Legal and Regulatory Constraints"));
  out.push(p("The following binding legal rules constrain every design decision. They are stated here once and referenced by individual requirements in Chapter 3."));
  out.push(...tbl({
    caption: "Binding legal constraints on system behavior",
    headers: ["#", "Constraint", "Source"],
    widths: [6, 72, 22],
    zebra: true,
    rows: [
      ["C1", "A rental contract must be written, signed, certified by the Regulatory Body, and registered; an unregistered contract produces no legal effect and exposure to a fine of up to three months' rent.", "Proc. Arts. 4; Dir. Arts. 8-9, 22"],
      ["C2", "Registration must occur within 30 days of signing, extendable by up to 3 months for legacy contracts under Article 7.", "Proc. Arts. 4, 7; Dir. Art. 10"],
      ["C3", "Contracts must follow the published Model Agreement content; the Bureau may improve the model.", "Proc. Art. 5; Dir. Art. 4"],
      ["C4", "Minimum contract term is two years; renewal must be written.", "Proc. Art. 6; MA cl. 4(2-3)"],
      ["C5", "Annual rent increase is announced June 1 and takes effect June 30; mid-term increases must follow the announced rate and be notified in writing to the tenant and the Regulatory Body.", "Proc. Art. 8; Dir. Art. 11; MA cl. 5"],
      ["C6", "First-time rental of newly built houses is freely priced; exemption clocks are 4 years (newly built) and 2 years (previously unoccupied); vacancy beyond exemption in shortage cities attracts +25% property tax.", "Proc. Arts. 9, 10"],
      ["C7", "Advance payment is capped at two months' rent; rent must be paid only by bank or other legal electronic means; the registered contract plus electronic payment records are the admissible evidence.", "Proc. Arts. 12-14; MA cl. 6"],
      ["C8", "Complaints may be submitted in person, verbally, in writing, by phone, or any other media; the Regulatory Body decides within 30 working days; appeal lies to the Committee within 15 working days; court within 30 days; enforcement is blocked until the decision is final.", "Proc. Arts. 20-26; Dir. Arts. 17-19"],
      ["C9", "Scope exclusions: hotels, resorts, guest houses, and commercially licensed rentals are out of scope.", "Proc. Art. 3(3)"],
      ["C10", "Personal data must be processed lawfully under the Personal Data Protection Proclamation.", "PDPP 1321/2024"],
    ],
  }));

  out.push(h2("2.6 Assumptions and Dependencies"));
  out.push(p("The plan assumes that each participating city administration will enact or has enacted its own implementation directive mirroring the Addis Ababa Directive, so the system encodes regional variation as configuration rather than code. It assumes banking partners can expose payment notification channels (statement files or API callbacks) sufficient to reconcile tenant rent payments to contracts, and that an SMS/email gateway contract will be available before Phase 6 pilot. Identity verification depends on the presented document menu of Directive Article 5(2) in the pilot phase, with optional integration to a national digital ID service left as a future enhancement. Finally, the project assumes the owner will nominate business focal persons from the Bureau for the weekly sprint reviews defined in the implementation plan, which keeps every stage interactive."));

  return out;
}

module.exports = { chapter1, chapter2 };
