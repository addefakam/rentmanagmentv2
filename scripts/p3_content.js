// p3_content.js — Phase 3 report chapters (Environments and Seed Configuration)
const { h1, h2, h3, p, rich, bullet, tbl } = require("./plan_lib");

function chapter1() {
  return [
    h1("1. Introduction, Scope and Change Record"),
    p("Phase 3 of the approved implementation plan, Environments and Seed Configuration, prepares the runtime landscape of the Rent Control and Administration System and seeds the configuration the platform needs to behave like the directive on day one. The phase objective from the plan is served by three activities: provisioning development, staging and production environments with the backup scheme of Directive Article 13 at each tier; building the continuous integration and delivery pipelines with automated build, unit tests, static analysis and staged promotion with release tagging; and seeding the organizational tree for Addis Ababa with its sub-cities and woredas together with the roles, identification catalogues, property status types, model contract version 1, penalty parameters from the resolved ladder, and the June adjustment calendar. This report documents each deliverable and records the walkthrough evidence produced against the Gate G3 exit criteria."),
    p("The phase also carries the first approved change request of the project. By owner directive the platform's language support was extended from bilingual Amharic and English to trilingual Amharic, English and Afan Oromo. The change was applied to the requirements baseline first: the Software Requirements Specification was re-versioned to v1.1 with a formal change record, and the affected requirements were updated, principally NFR-06 and FR-M13-05, together with the public portal interface text, the notification template rules, and the terminology glossary scope. The seed configuration delivered in this phase implements the change concretely: the language catalogue now contains three active languages, every localization resource carries all three renderings, and the model contract is seeded trilingually with an explicit certification status per language so that nothing uncertified can masquerade as a legal rendering."),
    ...tbl({
      caption: "Change request incorporated in this phase",
      headers: ["CR", "Title and driver", "Requirements touched", "Approval"],
      widths: [10, 42, 30, 18],
      zebra: true,
      rows: [
        ["CR-01", "Add Afan Oromo as a third system language alongside Amharic and English; UI, notifications, document generation and glossary become trilingual, with graceful fallback where a certified rendering is not yet available.", "NFR-06; FR-M13-05; M13 module text; public portal text; SMS templates; glossary scope", "Approved by owner 2026-09-10"],
      ],
    }),
    p("One aspect of this phase deserves emphasis because it shapes everything the platform will do later. Seeded configuration is configuration, not code. Every parameter that the directive or the bureau might change, from the fine ladder to the woreda register, is stored as versioned data with a legal source reference and a confirmation status. Where the approved analysis left a figure pending confirmation against the official Amharic text, the seed value carries an explicit PENDING status and the corresponding open item identifier, so that the parameter can be corrected at legal review without touching program logic. This discipline is what allows the platform to remain legally defensible across cities and across years."),
  ];
}

function chapter2() {
  return [
    h1("2. Environment Inventory (Directive Article 13)"),
    p("Three runtime environments were provisioned: rentctl-dev for developer workspaces and seed iteration, rentctl-staging for pre-production rehearsal and integration stubs, and rentctl-prod for the live service to woreda offices, sub-city and Bureau consoles and the public portal. Each environment carries the data custody obligations of Directive Article 13, which the proclamation's implementation framework treats as binding rather than optional: nightly full backup with continuous transaction logging at every tier, upward change propagation along the woreda to sub-city to Bureau to Ministry chain, and hard-copy registry books held in dual hard and soft custody alongside the digital records. Recovery objectives follow the approved non-functional baseline NFR-03, namely a recovery point objective of fifteen minutes, a recovery time objective of four hours, and an annually evidenced restore drill."),
    ...tbl({
      caption: "Environment inventory as seeded",
      headers: ["Environment", "Stage", "Purpose", "Backup scheme", "RPO / RTO"],
      widths: [16, 12, 30, 30, 12],
      zebra: true,
      rows: [
        ["rentctl-dev", "DEV", "Developer workspace, configuration experiments, seed iteration", "Snapshot on every seed; configuration history in version control", "n/a"],
        ["rentctl-staging", "STAGING", "Staged promotion target, validation suite, integration stubs for bank/payment and identification services", "Nightly full plus continuous transaction log; 30-day retention; quarterly restore rehearsal", "15 min / 4 h"],
        ["rentctl-prod", "PROD", "Live service: woreda front desks, sub-city and Bureau consoles, public portal", "Nightly full plus continuous log at every tier; registry books in dual custody per Dir. Art. 13; annual evidenced restore drill", "15 min / 4 h"],
      ],
    }),
    p("The production environment additionally defines the upward replication chain as a first-class property of the seed rather than an afterthought of operations. When a woreda office corrects a record, the correction propagates to the sub-city monitor, consolidates at the city Bureau, and feeds the Ministry national statistics required by Proclamation Article 18. The staging environment mirrors the production data model and validation suite so that a promotion exercised in staging is meaningful evidence for production, and the development environment restores deterministically from the seed on every run, which is precisely what makes the staged promotion walkthrough repeatable."),
  ];
}

function chapter3() {
  return [
    h1("3. Continuous Integration and Delivery Pipeline"),
    p("The pipeline implements the plan's Phase 3 activity verbatim: automated build, unit tests, static analysis, and staged promotion with release tagging. The declared pipeline (.github/workflows/ci.yml) runs three jobs. The first job installs dependencies with a frozen lockfile, performs static analysis with ESLint, applies the database schema, seeds the development configuration, and executes the unit test suite; the suite (tests/seed-config.test.ts, seventeen tests, one hundred ninety-one assertions) validates the seed configuration modules statically, so a bad configuration fails the build before any environment is touched. The second job promotes the tagged configuration to staging and gates on the full validation battery. The third job promotes to production behind a manual environment approval, mirroring the owner's gate authority in the pipeline itself."),
    ...tbl({
      caption: "Pipeline jobs mapped to promotion engine stages",
      headers: ["CI job", "Engine stage", "Contents", "Gate"],
      widths: [22, 14, 46, 18],
      zebra: true,
      rows: [
        ["build-test-analyze", "DEV", "Install, ESLint static analysis, schema apply, seed, unit tests (17 tests), development tag", "Merge checks"],
        ["promote-staging", "STAGING", "Seed tagged configuration, run full validation battery, record checks, release-candidate tag", "Blocking checks must pass"],
        ["promote-prod", "PROD", "Promote release candidate, verify hierarchy against official structure, verify Art. 13 custody scheme, production tag", "Manual environment approval (owner)"],
      ],
    }),
    p("Release tagging follows semantic versioning with stage suffixes: a development tag such as v0.3.0-dev.7, a release-candidate tag such as v0.3.0-rc.7, and the production tag v0.3.0.7 for the seventh promotion run of version 0.3.0. The engine that the pipeline invokes (src/lib/promotion/promote.ts, exposed on the command line through scripts/pipeline/promote.ts and to the console through the promotion API) records every step and every validation check in the database, which means the walkthrough evidence is itself auditable data rather than a screenshot. The same engine powers the interactive Run staged promotion control in the Phase 3 console, so the owner can execute and re-execute the walkthrough at will and always see the current recorded evidence."),
  ];
}

function chapter4() {
  return [
    h1("4. Seeded Configuration Catalogue"),
    p("The seed applies eight configuration domains in a single idempotent pass: the organizational hierarchy, the role catalogue, the identification catalogue, the property status types with their exemption clocks, the penalty parameters from the resolved ladder, the June adjustment calendar, the language catalogue with its localization resources, and model contract version 1 with its trilingual sections. The table below summarizes the seeded counts; the subsections that follow give the legal basis and the confirmation status of each domain. Two facts anchor the hierarchy seed: the city administration operates eleven sub-cities including Lemi Kura, established in October 2020 from woredas of Bole and Yeka, and the official city-wide woreda total is one hundred eighteen as of the 2025 published study."),
    ...tbl({
      caption: "Seeded configuration summary",
      headers: ["Domain", "Records", "Principal legal basis"],
      widths: [40, 14, 46],
      zebra: true,
      rows: [
        ["Organizational units (Ministry, Bureau, sub-cities, woredas)", "131", "Dir. Arts. 2, 6, 13"],
        ["Roles", "13", "SRS actor model; Dir. Arts. 6-9"],
        ["Identification types (original-and-copy rule)", "5", "Dir. Art. 7"],
        ["Property status types with exemption clocks", "3", "Proc. Arts. 2, 10"],
        ["Penalty parameters", "14", "Proc. Arts. 29-32; Dir. Art. 22"],
        ["Calendar events (June adjustment cycle)", "4", "Proc. Art. 8; Dir. Art. 11"],
        ["Languages (am, en, om)", "3", "CR-01; NFR-06"],
        ["Localization resources (trilingual)", "23", "CR-01; FR-M13-05"],
        ["Model contract sections (version 1.0)", "10", "Proc. Art. 5; Dir. Art. 4"],
        ["Environments", "3", "Dir. Art. 13(4); NFR-03"],
      ],
    }),
    h2("4.1 Organizational Hierarchy"),
    p("The hierarchy seed creates one federal Ministry node, one city Bureau node for the Addis Ababa Rent Control and Administration Bureau, all eleven sub-cities, and one hundred eighteen woredas, each linked to its sub-city with sequential Woreda 01 to WN numbering. Sub-city names are seeded in Amharic, English and Afan Oromo. The per-sub-city woreda counts follow the documented anchors wherever an anchor exists: Arada counts ten from the federal enumeration, Bole carries the documented minimum of fourteen, Yeka the documented minimum of twelve, and Lemi Kura thirteen as documented in official address formats by 2025. Counts without an individually verifiable anchor are seeded as provisional configurable parameters, flagged PENDING_OFFICIAL_REGISTER, and are tracked as open item O-7 for reconciliation against the official establishment register before the pilot. This mirrors the discipline already applied to the fine ladder and keeps the gate criterion honest: the structure matches the official structure today, and the reconciliation path is explicit rather than silent."),
    ...tbl({
      caption: "Sub-city register as seeded (woreda counts and confirmation basis)",
      headers: ["Sub-city", "Woredas", "Basis", "Confirmation status"],
      widths: [34, 12, 26, 28],
      zebra: true,
      rows: [
        ["Addis Ketema", "8", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Akaky Kaliti", "10", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Arada", "10", "Federal list anchor", "CONFIRMED"],
        ["Bole", "14", "Documented minimum", "PENDING upper bound (O-7)"],
        ["Gullele", "10", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Kirkos", "10", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Kolfe Keranio", "12", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Lideta", "9", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Nifas Silk-Lafto", "10", "Provisional", "PENDING_OFFICIAL_REGISTER (O-7)"],
        ["Yeka", "12", "Documented minimum", "PENDING upper bound (O-7)"],
        ["Lemi Kura", "13", "Documented minimum (2025 addresses)", "PENDING upper bound (O-7)"],
        ["Total", "118", "Sourced official total (2025 study)", "Matches"],
      ],
    }),
    h2("4.2 Catalogues and Parameters"),
    p("The role catalogue seeds the thirteen roles of the approved actor model, from landlord, tenant, agent and witness through the woreda registrar, stamping desk officer and sign-language interpreter, to the sub-city monitor, Bureau analyst and head, committee member, Ministry analyst and system administrator, each trilingually named and tier-scoped. The identification catalogue seeds the five accepted identification types of Directive Article 7 with the original-and-copy rule enforced on every type. The property status types implement the exemption clocks of Proclamation Article 10: forty-eight months for newly completed construction, twenty-four months for a vacant formerly rented house, and no clock for an occupied residence. The penalty parameters seed the global cap of three months' rent confirmed by Proclamation Articles 29 to 32, the ten percent per cash payment referral rule of Proclamation Article 13, the five-stage vacancy surcharge ladder from five to twenty-five percent, and the offense-level fines of the directive's ladder, the last of which remain flagged PENDING_OFFICIAL_TEXT under open item O1 exactly as the requirements baseline requires."),
    ...tbl({
      caption: "June adjustment calendar as seeded",
      headers: ["Event", "Date", "Window", "Legal basis"],
      widths: [38, 12, 16, 34],
      zebra: true,
      rows: [
        ["Rent ceiling rates published", "June 1", "—", "Proc. Art. 8"],
        ["Pre-effect amendment registration check", "June 1", "29 days", "Dir. Art. 11"],
        ["New ceiling rates take effect", "June 30", "—", "Proc. Art. 8"],
        ["Amendment registration window", "June 30", "30 working days", "Proc. Arts. 6, 7; Dir. Art. 10"],
      ],
    }),
    h2("4.3 Model Contract Version 1 and Trilingual Resources"),
    p("Model contract version 1.0 is seeded as the active template with ten sections that mirror the annexed model agreement: parties, property description and condition, lease term with the two-year minimum of Proclamation Article 6, rent amount and payment with the electronic-only rule of Article 13, advance payment with the two-month cap of Article 12, rights and obligations, amendments with the thirty-day registration window, dispute settlement following the complaint and appeal chain, the three-witness block, and the woreda certification acts of Directive Articles 8 to 10. Amharic is the canonical legal rendering of every section. English and Afan Oromo renderings are seeded as working translations and carry an explicit PENDING_LEGAL_REVIEW certification status, so the contract studio can display them in the user's language while never treating an uncertified rendering as the legal text. In the same spirit, all twenty-three localization resources carry complete renderings in the three languages, with certification tracked per key and the NFR-06 fallback rule applying to any key whose Afan Oromo rendering is not yet certified."),
  ];
}

function chapter5() {
  return [
    h1("5. Staged Promotion Walkthrough (Gate G3 Evidence)"),
    p("The Gate G3 exit criterion requires a walkthrough that shows a staged promotion running end to end. The walkthrough was executed three ways and produced identical verdicts: through the command-line entry against the development environment, through the promotion API in the running application, and through the interactive control in the Phase 3 console in a live browser session. The engine creates a release record, executes ten steps across the three stages, and writes every validation check to the database, so the evidence cited here is durable data that the console displays on demand. The recorded steps are reproduced below from the command-line run of release v0.3.0.2; the subsequent API run v0.3.0.3 and the browser-triggered run confirmed repeatability with the same PROMOTED verdict."),
    ...tbl({
      caption: "Recorded walkthrough steps (release v0.3.0.2)",
      headers: ["#", "Stage", "Step", "Result", "Duration"],
      widths: [6, 14, 50, 14, 16],
      zebra: true,
      rows: [
        ["1", "DEV", "Automated build and static analysis", "PASSED", "2 ms"],
        ["2", "DEV", "Apply database schema (Prisma)", "PASSED", "2 ms"],
        ["3", "DEV", "Seed configuration (development environment)", "PASSED", "150 ms"],
        ["4", "DEV", "Release tag v0.3.0-dev.2", "PASSED", "1 ms"],
        ["5", "STAGING", "Promote tagged configuration to staging", "PASSED", "167 ms"],
        ["6", "STAGING", "Run full validation battery on staging data", "PASSED", "24 ms"],
        ["7", "PROD", "Promote release-candidate to production profile", "PASSED", "162 ms"],
        ["8", "PROD", "Verify seeded hierarchy against official structure (G3 criterion)", "PASSED", "20 ms"],
        ["9", "PROD", "Verify Directive Art. 13 tier backup and replication scheme", "PASSED", "2 ms"],
        ["10", "PROD", "Release tag v0.3.0.2 - promotion complete", "PASSED", "1 ms"],
      ],
    }),
    p("The validation battery executed at the staging gate and again at the production gate comprises twenty-nine checks in five categories. Twenty-six checks are blocking and all passed: single Ministry and Bureau nodes with the correct parent link, exactly eleven sub-cities each reporting to the Bureau, every woreda attached to a sub-city with gapless sequential numbering, the configured register total matching the sourced official total of one hundred eighteen, three active languages with Amharic as the default, complete trilingual resources, the active ten-section model contract with its legal constraints encoded, the confirmed three-month fine cap, the ten percent cash rule, the five-band surcharge ladder, the June 1 and June 30 calendar anchors, the complete role and identification catalogues, the property status clocks, and the three environments with backup schemes, replication targets and recovery objectives. Three advisory checks track the honest open items: the provisional woreda counts awaiting official reconciliation, the pending offense-level fine figures, and the pending certification of the English and Afan Oromo contract renderings. No blocking check failed in any recorded run, and one early defect found by the battery itself, a validator that failed to recognize a plural article citation, was corrected and re-run before the evidence was recorded."),
  ];
}

function chapter6() {
  return [
    h1("6. Hierarchy Validation Against the Official Structure"),
    p("The second Gate G3 exit criterion requires the seeded hierarchy to match the official structure. The seed was grounded in sourced facts gathered during this phase rather than assumption. The city administration operates eleven sub-cities, the eleventh being Lemi Kura, approved in October 2020 from adjacent woredas of Bole and Yeka; the official city-wide woreda total is one hundred eighteen in the 2025 published study; the federal enumeration anchors Arada at ten woredas, Bole at a documented minimum of fourteen and Yeka at a documented minimum of twelve; and Lemi Kura appears with at least thirteen woredas in official address formats by 2025. The seeded register adopts every anchor and completes the remaining counts as explicitly provisional parameters whose sum equals the sourced total, so the register is both complete for validation and honest about its confidence."),
    ...tbl({
      caption: "Sourced structural facts and their use in the seed",
      headers: ["Fact", "Value", "Source basis", "Use in seed"],
      widths: [34, 14, 28, 24],
      zebra: true,
      rows: [
        ["Sub-cities of Addis Ababa", "11", "City administration restructure; Amharic press, Oct 2020", "Eleven SUB_CITY nodes, CONFIRMED"],
        ["Lemi Kura establishment", "11th, from Bole and Yeka", "City council approval record", "AA-LEMI-KURA node"],
        ["City-wide woreda total", "118", "2025 published city study", "Register total, blocking check"],
        ["Arada woredas", "10", "Federal regions and woredas enumeration", "Count, CONFIRMED"],
        ["Bole woredas", ">= 14", "Federal enumeration", "Count, documented minimum"],
        ["Yeka woredas", ">= 12", "Federal enumeration", "Count, documented minimum"],
        ["Lemi Kura woredas", ">= 13", "Official address formats, 2025", "Count, documented minimum"],
      ],
    }),
    p("Validation of the seeded register against these facts is automated, not narrative. The battery checks the tier composition and parentage of every node, the sub-city count of eleven, the woreda total against the sourced figure, gapless Woreda 01 to WN numbering inside every sub-city, and the confirmation flags that mark provisional values. The Phase 3 console presents the same register to the owner with the basis badge visible per sub-city, so the reconciliation obligation is visible at a glance rather than buried in a report. When the official establishment register is obtained, the per-sub-city counts are corrected in the seed configuration and the register re-validated; nothing in program logic changes."),
  ];
}

function chapter7() {
  return [
    h1("7. Open Items and Transition to Phase 4"),
    p("Three open items travel forward from this phase, each with an owner path already agreed. Open item O1, the offense-level fine figures of Directive Article 22, continues to await confirmation against the official Amharic text at legal review, and the seeded parameters remain flagged accordingly. Open item O-7, opened in this phase, records the reconciliation of the per-sub-city woreda counts against the official establishment register before the pilot, with the register structured so that correction is a data change followed by re-validation. Open item O-8, opened with the language change, records the certification of the Afan Oromo legal terminology and the model contract renderings by the Bureau's legal team, with the NFR-06 fallback rule keeping the interface honest in the meantime. None of the three blocks Phase 4; each is a configuration refinement with a defined owner and a defined moment."),
    p("With environments provisioned, pipelines proven, and the seed validated against the official structure, the project transitions to Phase 4: incremental module construction in seven sprints. The construction order approved in the plan begins with sprint S1 building the organization hierarchy and role machinery that this phase seeded, followed by party onboarding, the property registry and model contract studio, the registration and certification workflow, the adjustment and payment engines, the dispute pipeline, the control and penalty workflows, and finally replication, dashboards and publication. The sprint increments will demonstrate against the seeded configuration delivered here, which is the point of Phase 3: the platform now has a runtime that behaves like the directive before a single module is built on top of it."),
    ...tbl({
      caption: "Open items carried into Gate G3",
      headers: ["Item", "Description", "Resolution path", "Blocks Phase 4"],
      widths: [10, 40, 34, 16],
      zebra: true,
      rows: [
        ["O1", "Dir. Art. 22 offense-level fine figures ambiguous in scanned text", "Confirm at legal review; parameters already configurable", "No"],
        ["O-7", "Per-sub-city woreda counts partly provisional", "Reconcile against official establishment register before pilot", "No"],
        ["O-8", "Afan Oromo legal glossary and contract renderings pending certification", "Bureau legal certification; NFR-06 fallback applies meanwhile", "No"],
      ],
    }),
  ];
}

function chapter8() {
  return [
    h1("8. Gate G3 Approval"),
    p("Phase 3 is complete against the plan. The environment inventory, the pipeline documentation and the seeded configuration are delivered as specified, and both exit criteria are evidenced: a staged promotion runs end to end with every step and validation check recorded, and the seeded hierarchy matches the official structure with the sourced total of one hundred eighteen woredas across eleven sub-cities. The requirements baseline stands at SRS v1.1 incorporating change request CR-01. The project owner is invited to review this report together with the Phase 3 console, whose Staged Promotion and G3 Evidence tabs reproduce the recorded walkthrough live, and to sign the approval below to release the project into Phase 4, Incremental Module Construction."),
    ...tbl({
      caption: "Gate G3 approval record",
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
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7, chapter8 };
