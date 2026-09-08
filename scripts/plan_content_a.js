// plan_content_a.js — Chapters 1-3
const { h1, h2, h3, p, rich, bullet, tbl } = require("./plan_lib");

function chapter1() {
  return [
    h1("1. Executive Summary"),
    p("This document is the master implementation plan for the Residential House Rent Control and Administration System, the information platform that will operationalize Federal Proclamation No. 1320/2016 together with the Addis Ababa City Residential House Rent Control and Administration Directive No. 7/2016 and the Model Rental Agreement published as its annex. It converts the work already completed in this engagement, namely the article-by-article legal analysis, the functional requirements baseline of approximately sixty requirements organized in thirteen modules, the catalogue of twenty-one use cases across seven actor groups, and the detailed landlord onboarding scenario, into one ordered and phase-gated roadmap. Its purpose is that both the project owner and the delivery team can follow a single authoritative sequence of activities, with the assurance that no element discussed so far has been dropped."),
    p("The plan adopts a clearly named development model: the Hybrid Phase-Gated Incremental Model, which combines V-Model verification discipline with agile sprint construction. The V-Model side guarantees legal traceability, because every article of the proclamation and the directive is traced forward to a requirement, to a design element, and to a test case. The agile side delivers the thirteen modules in seven working increments, each demonstrated to the project owner before the next begins. Nine phases, numbered Phase 0 through Phase 8, carry the work from project initiation through requirements consolidation, design, environment setup, incremental construction, testing, user acceptance and legal validation, data migration and piloting, and finally go-live and operations."),
    p("Interaction with the project owner is structured and predictable. Every phase closes with a formal stage gate, from G0 to G9, at which the owner reviews named artifacts, answers specific questions, and grants written approval before work continues. No review package is larger than can be read in a single sitting, and each package opens with a one-page summary. This mechanism is the practical meaning of the requirement for smooth interaction at all stages: at any moment, both sides know exactly which activity is open, which decision is pending, and what must be produced next."),
    p("The system design honors the administrative structure defined by the directive. The Woreda Office is the front desk where contracts are presented, verified against the nine-point checklist, certified, stamped, numbered, and entered into the database. The Sub-city Office consolidates woreda data and monitors implementation. The City Bureau studies and publishes the annual rent adjustment, amends and distributes the model contract, and directs penalty enforcement. The Ministry stands at the federal level, receiving consolidated national data. Although the directive currently at hand is specific to Addis Ababa, the platform is designed as a national system with per-city regulatory configuration, so additional cities can be brought onto the same platform without code changes."),
    ...tbl({
      caption: "The plan at a glance",
      headers: ["Phase", "Focus", "Gate", "Principal deliverable"],
      widths: [10, 44, 8, 38],
      zebra: true,
      rows: [
        ["Phase 0", "Initiation, governance and baseline confirmation", "G0", "Approved project charter and this implementation plan"],
        ["Phase 1", "Requirements consolidation and legal traceability", "G1", "SRS v1.0 with full article-to-requirement traceability"],
        ["Phase 2", "System and software design", "G2", "Architecture, database, security and interface designs"],
        ["Phase 3", "Environments, CI/CD and seed configuration", "G3", "Dev, staging and production environments ready"],
        ["Phase 4", "Incremental module construction (7 sprints)", "G4", "Functionally complete, unit-tested platform"],
        ["Phase 5", "Integration, security and compliance testing", "G5", "System test report and compliance test matrix"],
        ["Phase 6", "User acceptance testing and legal validation", "G6", "Signed UAT certificate from role-based testers"],
        ["Phase 7", "Data migration, training and pilot operation", "G7", "Pilot exit report from selected woredas"],
        ["Phase 8", "Phased go-live, operations and improvement", "G8/G9", "Live service, operations manual, 90-day review"],
      ],
    }),
  ];
}

function chapter2() {
  return [
    h1("2. Regulatory Foundation and Administrative Structure"),
    p("The system is bound by three legal instruments that form one coherent regulatory stack. Understanding how they relate is a precondition for every later engineering decision, because the platform must enforce their rules mechanically rather than leave them to user discretion. This chapter restates the role of each instrument, extracts the operational rules that the directive adds on top of the proclamation, and maps the administrative structure that the system must mirror."),
    h2("2.1 The Three Legal Instruments and How They Interlock"),
    ...tbl({
      caption: "Legal instruments and their contribution to the system",
      headers: ["Instrument", "Legal force", "What it contributes to the system"],
      widths: [30, 18, 52],
      rows: [
        ["Proclamation No. 1320/2016 (Residential House Rent Control and Administration)", "Federal statute; highest authority", "Scope and exclusions; mandatory written, certified and registered contracts; two-year minimum term; annual rent adjustment announced June 1 with effect June 30; exemption clocks for newly built and previously unoccupied houses; two-month advance cap; bank and electronic payment only; evidentiary rules; Ministry and Regulatory Body duties; complaint, appeal and enforcement chain"],
        ["Addis Ababa City Directive No. 7/2016 (implementation guideline)", "City directive under Proclamation Art. 29(2)", "Concrete operating procedure: registration workflow with the nine-point verification checklist; registrar certification acts; stamping and copy issuance; amendment handling; correction procedures; data custody, scanning and tier-wise replication; Bureau, sub-city and woreda duties; complaint intake and control procedure; prohibited acts; administrative penalty schedule"],
        ["Model Rental Agreement (annex to the directive)", "Standard form referenced by the directive", "The exact contract template to digitize: party identity and address blocks, property address and ownership, house status classification, rent in figures and words, term with the two-year minimum note, renewal clause, utility allocation, landlord and tenant obligations, electronic payment clause, certification by the Regulatory Body, signature and three-witness blocks"],
      ],
    }),
    p("The instruments resolve conflicts by hierarchy. Where a contract clause or a local practice contradicts the proclamation, the proclamation prevails; where a form or procedure conflicts with the directive, the directive prevails; and any matter not covered by the model agreement is governed by the proclamation, exactly as clause seven of the model contract states. The system therefore treats the proclamation as its constitutional layer, the directive as its procedure layer, and the model agreement as its data-capture layer. The design keeps every directive-specific value, such as a fine ladder or a notice period, in configuration rather than in program code, so that a revised directive changes configuration, not software."),
    h2("2.2 Directive Rules That Sharpen the Requirements Baseline"),
    p("The directive converts the proclamation's principles into verifiable office procedure. The following rules, each cited to its article, are incorporated into the functional baseline and appear again in the module table in Chapter 4 and in the compliance test matrix in Chapter 8."),
    bullet("At registration the office must complete a nine-point documentary check: no circumstance nullifying the contract; for legacy contracts, signatures of both parties and four witnesses with an unexpired term; no conflict with the proclamation; for new contracts, signatures of landlord, tenant and witnesses; the house lies within the woreda; the documents required by Article 5 are complete; originals and copies match; an office copy of the contract is provided; and names and photographs match the presented identification (Art. 7).", "Registration verification checklist."),
    bullet("The registrar attests that both parties sign willingly; records proxy and agency signatures in the proper form; arranges a sign-language interpreter with an association-stamped statement where a party is deaf; certifies copies by writing name and date, numbering each attached document, and noting that the persons named appeared and signed; applies the round office stamp on completeness; assigns the contract number; and records the contract in the registry book and the computer database (Art. 8).", "Registrar certification acts."),
    bullet("Legacy contracts entered voluntarily are annotated as having been presented and verified before the office, with the same copy-certification discipline (Art. 8(2)).", "Legacy annotation."),
    bullet("A stamp-granting professional re-checks that the contract is registered, issues one certified copy to each party, binds the original into the archive, and enters the contract data into the computer database (Art. 9).", "Stamping and custody."),
    bullet("A renewed or price-adjusted contract must be presented and registered within thirty days; the registrar verifies that any rent increase follows the published adjustment rate and that all other changes are lawful; witnesses who differ from those on the original contract must attach copies of their identification (Art. 10).", "Amendments."),
    bullet("The Bureau studies the city's real situation once a year and sets the permitted rent increase by directive; the increase is announced to the public on June 1 and takes effect from June 30 of the same year; the amended contract must be registered at the office before the adjustment takes effect (Art. 11).", "Annual rent adjustment."),
    bullet("Where registration data are wrong, discovered by own-initiative control or by complaint information, the parties are called and the data corrected; where the error sits inside the contract itself, the parties amend it under the general law of contracts; clerical errors are corrected by the registrar; divorce rulings and name changes are processed upon presentation of a court decision; registrar errors are corrected unconditionally and reported; corrections are issued to the parties, the database is updated, and the Bureau verifies the accuracy of what was done (Art. 12).", "Registration corrections."),
    bullet("Registration is kept in hard and soft copy; a uniform registry book numbered in sequence serves all woreda offices; contracts, proxies, identity photographs, payment documents and other papers are scanned; the woreda office sends scanned registration data to the sub-city office and to the Bureau; data are replicated at each level; backups of the registry, contracts and documents are held in hard and soft form at the woreda, and scanned soft copies at the sub-city office and the Bureau information department; changes made at the woreda are notified upward so that all levels are corrected (Art. 13).", "Data custody and replication."),
    bullet("The Bureau monitors and controls implementation of the proclamation and the directive, amends the model contract when necessary and distributes it to the offices, prepares the registry book and working forms, collects and analyses rent data and shares it with residents and concerned bodies, runs the annual increase study, and creates public awareness. The sub-city office follows up and controls woreda implementation, aggregates woreda data and submits them to the Bureau, and creates awareness in its area. The woreda office distributes the model contract, verifies that presented contracts meet the proclamation and directive requirements, validates increases against the published rate, confirms that rent is paid by bank or other legal electronic means, registers contracts and holds the data, operationalizes the information-technology-supported modern registration procedure, receives complaints and appeals and grants the necessary administrative decision, enforces the penalties of the directive, and creates woreda-level awareness (Arts. 14 to 16).", "Tier responsibilities."),
    bullet("Eight grounds are named: letting a house without a registered contract; paying above the price stated in the registered contract; increasing the price or demanding advance payment beyond what the proclamation allows; terminating the contract term outside what the proclamation allows; a house left without service for more than six months; presenting false information or evidence to improperly obtain the landlord incentive; using the house for a purpose other than residence or for criminal activity; and any other violation of law connected with the rental contract. Anyone may complain, in person, verbally or in writing, by telephone or through any media (Arts. 17 and 18).", "Complaint grounds and channels."),
    bullet("On receipt, the office checks completeness: complainant name and address where given, address of the house, names and addresses of landlord and tenant, the date of the act complained of, and whether the complaint falls within the named grounds; verifies the subject and evidence; registers the complaint in the registry book; may request additional evidence from concerned bodies and investigate; grants the appropriate decision; and communicates the decision to the complainant (Art. 19).", "Complaint reception."),
    bullet("The woreda office controls on the basis of a complaint or on its own initiative; control is performed by an assigned professional carrying identification that states control authority during government working hours, and control is exercised by a team of more than one professional (Art. 20).", "Control and inspection."),
    bullet("Ten acts are prohibited, including renting without registration, late registration through negligence, failing to register amendments, unauthorized increase, eviction before term without legal ground, termination without the required notice, demanding excess advance payment, paying outside bank or legal electronic channels, leaving a formerly rented or fully completed new house without service, and submitting false information to obtain incentives (Art. 21).", "Prohibited acts."),
    bullet("Graduated monetary fines are referenced to the monthly rent written in the contract: fines for registering late beyond the proclamation's period, with a higher fine when the delay exceeds three months; a fine for failing to register an amendment; fines for unauthorized increase, for evicting before term without legal ground, and for demanding advance payment beyond the permitted limit; a fine of ten percent of one month's rent on the tenant for each payment made outside bank or legal electronic channels; and a vacancy-based property tax surcharge applied to a landlord who leaves a formerly rented or fully completed new house without service, rising in bands from five percent for one to two years, ten percent above two to three years, fifteen percent above three to four years, and twenty percent above four to five years, to twenty-five percent above five years. The Bureau filters the data and refers the penalty to the competent enforcement body, and may sue in court where an administrative fine is not paid (Art. 22). One caveat is recorded honestly: the scanned directive is printed in a two-column layout and one or two fine figures are visually ambiguous in the copy provided. The exact ladder will be confirmed at Phase 1 against the official Amharic text and then encoded as configurable parameters, never as constants buried in code.", "Administrative penalties."),
    h2("2.3 The Administrative Structure the System Must Mirror"),
    p("The proclamation creates the Ministry and the Regulatory Body; the directive names the concrete organs for Addis Ababa and distributes duties across three working tiers below the city administration. The platform implements this structure as a configurable organizational tree, in which every user account, every record, and every report is scoped to an organizational unit. Data flow upward by replication and aggregation, while mandates, model contracts, rates and directives flow downward for local execution."),
    ...tbl({
      caption: "Administrative tiers, legal basis and system role",
      headers: ["Tier", "Organ", "Legal basis", "System role"],
      widths: [16, 26, 22, 36],
      zebra: true,
      rows: [
        ["Federal", "Ministry (housing portfolio)", "Proclamation Art. 18", "National data consolidation and publication; policy oversight; receives aggregated statistics from all city bureaus (module M11)"],
        ["Regional / city administration", "City Administration", "Proclamation Art. 19; Directive preamble", "Owns the Regulatory Body for the city; issues the implementing directive; receives city-wide reporting"],
        ["City bureau", "Housing Development and Administration Bureau", "Directive Art. 14; Proclamation Art. 19", "Annual adjustment study and June 1 publication; model contract amendment and distribution; forms and procedures; city analytics; penalty referral direction; Bureau-level data custody and backup"],
        ["Sub-city", "Sub-city housing development and administration office", "Directive Art. 15", "Monitors woreda offices; aggregates woreda registration data and forwards to the Bureau; sub-city awareness; intermediate data custody"],
        ["Woreda", "Woreda housing development and administration office", "Directive Art. 16; Proclamation Arts. 19 to 26", "Registration front desk: document verification, certification, stamping, numbering, database entry; increase validation; payment-method confirmation; complaint and appeal reception with administrative decisions; penalty execution; control teams; scanning and upward transmission"],
      ],
    }),
    h2("2.4 From a City Directive to a National Platform"),
    p("The proclamation binds every city administration in the country, while Directive No. 7/2016 is the Addis Ababa instance of implementation. The correct engineering conclusion is that the platform is national by design and city-configured in operation. Tier names, office labels, the model contract text, the penalty ladder, adjustment rates, and working forms all live in a per-city configuration set maintained through the system administration module. Adding a second city therefore means creating a configuration, replicating the deployment, and connecting its woreda offices, not redeveloping the software. This decision protects the federal investment and keeps the Ministry's national statistics meaningful as coverage grows."),
  ];
}

function chapter3() {
  return [
    h1("3. Software Development Model and Engineering Standards"),
    h2("3.1 The Chosen Model: Hybrid Phase-Gated Incremental"),
    p("The development model is named the Hybrid Phase-Gated Incremental Model. It fuses two proven disciplines. From the V-Model it takes the verification spine: requirements are written so that each can be tested, and no legal article is considered implemented until a test proves it. From agile delivery it takes the construction rhythm: the thirteen modules are built in seven short sprints, each ending in a working, demonstrable increment. Around both, a phase-gate wrapper gives the project owner a formal approval point at the end of every phase, which is precisely the smooth, controlled interaction requested at the start of this project."),
    p("This hybrid is chosen deliberately for a law-enforcement platform. A pure sequential waterfall would delay all feedback until the end, which is dangerous where a misread article could invalidate months of work. A pure Scrum flow, by contrast, optimizes for changing product goals and tends to under-produce the contract-grade documentation that a government system must present to auditors, lawyers, and trainers. The hybrid keeps documentation as a first-class deliverable while preserving the early and continuous feedback of increments."),
    ...tbl({
      caption: "Model comparison and justification",
      headers: ["Criterion", "Pure Waterfall", "Pure Scrum", "Hybrid Phase-Gated Incremental (chosen)"],
      widths: [24, 22, 24, 30],
      zebra: true,
      rows: [
        ["Legal traceability", "Good on paper, late verification", "Weak; documentation often thin", "Strong: article-requirement-test matrix maintained from Phase 1 and tested every sprint"],
        ["Early feedback", "Late", "Early and frequent", "Early: sprint demos from Sprint 1; gate reviews each phase"],
        ["Contract-grade documentation", "Strong", "Variable", "Strong: SRS, design, test and operations documents are gate deliverables"],
        ["Adaptation to legal parameter changes", "Rigid", "Flexible", "Flexible by design: legal values are configuration, absorbed between sprints"],
        ["Fit for government acceptance", "Familiar but risky", "Unfamiliar to many public bodies", "Familiar gate structure plus visible progress; audit-friendly artifacts"],
      ],
    }),
    h2("3.2 How the Phase Gates Work"),
    p("Each phase ends with a gate. The delivery team assembles a review package containing the artifacts named for that gate, a one-page summary, and a short list of decisions requested. The project owner reviews the package, and approval, conditional approval with a recorded action list, or rejection with reasons is given. Work on the next phase does not begin until the gate is passed, so risk is caught at the cheapest possible moment. Gate outcomes, together with all scope decisions, are recorded in a decision register that becomes part of the project file and, later, of the system documentation set."),
    h2("3.3 Engineering Standards Applied"),
    p("The project follows recognized international standards so that quality claims are testable rather than rhetorical. Each standard below is mapped to a concrete application in this project, and conformance evidence appears in the deliverable named beside it."),
    ...tbl({
      caption: "Standards and their application",
      headers: ["Domain", "Standard or practice", "Application in this project"],
      widths: [22, 28, 50],
      zebra: true,
      rows: [
        ["Requirements engineering", "ISO/IEC/IEEE 29148", "SRS v1.0 structure, requirement statements with unique identifiers, and the legal traceability matrix"],
        ["Life-cycle processes", "ISO/IEC/IEEE 12207", "Phase definitions, configuration management, and change control across the nine phases"],
        ["Product quality", "ISO/IEC 25010", "Quality attributes for acceptance: functional suitability, reliability, security, usability in English and Amharic, maintainability, portability"],
        ["Information security", "ISO/IEC 27001 principles and OWASP ASVS", "Threat model, role-based access control per tier, encryption in transit and at rest, audit trail for every registration, correction and decision"],
        ["Project management", "PMBOK-style practices", "Charter, work breakdown, schedule, risk register, decision register, stakeholder map"],
        ["Interface quality", "WCAG 2.1 level AA", "Bilingual interface, keyboard operability, readable forms for registrar workbenches and public portal"],
        ["Source control and delivery", "Git flow, semantic versioning, CI/CD pipelines", "Feature branches, peer review before merge, automated build and test, staged promotion from development to staging to production"],
        ["Testing", "ISTQB-style level model", "Unit, integration, system, security, performance and acceptance levels with defined exit criteria"],
        ["Data handling", "Directive Art. 13 custody model", "Hard and soft dual custody, scanning, tier-wise replication, backups at woreda, sub-city and Bureau levels"],
      ],
    }),
    h2("3.4 The Documentation Set"),
    p("The project produces and maintains a defined documentation set, and each document is a gate deliverable rather than an afterthought. The set comprises: the SRS with the traceability matrix; the high-level and low-level design documents; the database design; the interface specification; the security design and threat model; the test plan with level-wise reports; the UAT script pack generated from the twenty-one use cases; the deployment and cutover runbook; the operations and support manual including the annual adjustment calendar; the training pack for each role and tier; and this implementation plan, which is version-controlled alongside the others. Keeping the set complete is what makes the platform auditable years after go-live."),
  ];
}

module.exports = { chapter1, chapter2, chapter3 };
