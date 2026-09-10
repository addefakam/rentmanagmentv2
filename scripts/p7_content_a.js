// p7_content_a.js — Phase 7 report chapters 1-5 (Gate G7 package).
// Evidence is read from p7_evidence.json produced by scripts/p7/dump-evidence.ts.
const { h1, h2, p, bullet, tbl } = require("./plan_lib");

const E = require("./p7_evidence.json");

function chapter1() {
  return [
    h1("1. Introduction and Phase 7 Scope"),
    p("Phase 7 is where the platform stops meeting itself and meets legacy reality. The implementation plan defines its objective as bringing the existing stock of rental contracts into the system and proving live operation in real woredas before city-wide exposure, and it names four activities: migrating legacy contracts with the directive's legacy annotation and a reconciliation against the registry books, training by role and tier, running the pilot in agreed woredas with daily support while measuring registration cycle time, checklist compliance and replication correctness, and producing the public awareness materials that Articles 14 and 16 of the Proclamation require so citizens know what a valid contract looks like. The owner opened the phase at Gate G6 by signing the UAT certificate and authorizing migration and the pilot; the pilot configuration in the platform carries that authorization reference."),
    p("The phase's legal centre of gravity is Article 7 of the Proclamation together with Article 8(2) of the Directive: pre-proclamation contracts must be presented at the woreda where the house is located within the thirty-day window plus three grace days, and they are registered as they stand - annotated as legacy, not forced through gates written for new contracts. The platform implements this as a first-class migration flow rather than a data-entry shortcut. Each paper book row becomes verified parties with scanned identification, a property record, and a registration file that passes through the genuine lifecycle - checklist, certification, stamping, registration, registry-book position, upward replication - with the legacy term accepted and the LEGACY_ART7 annotation recording why. The minimum-term rule of Proclamation Article 6 keeps governing new and amended filings; the migration path simply does not retroactively rewrite history."),
    p(`This report is the Gate G7 package, and its chapters follow the plan's deliverables: the migration report with reconciliation (chapters 2 and 3), the training attendance and competence records (chapter 4), and the pilot exit report (chapters 5 and 6). Chapter 7 presents the awareness materials awaiting the owner's approval, chapter 8 consolidates the verification evidence, chapter 9 states the open items and the defect log, and chapter 10 requests the gate decision. At the time of writing the migration register holds ${E.migration.totals.migrated} migrated rows against ${E.migration.totals.bookRows} book rows with all ${E.reconciliation.length} pilot woredas balanced, the pilot exit check passes every criterion, and the automated battery stands at ${E.verification.battery.pass} passing cases across ${E.verification.battery.suites} suites with zero failures.`),
  ];
}

function chapter2() {
  const T = E.migration.totals;
  return [
    h1("2. Legacy Migration and the Article 8(2) Register"),
    p("Migration ran per woreda as a registrar-driven flow, not a bulk import behind the scenes. For every row of the paper register book the migration desk created a landlord and a tenant party with the original-and-copy rule satisfied by scanned documents, a property record anchored to the contract date with no exemption clock (an occupied house is within the adjustment regime by Proclamation Articles 2 and 10), and a registration file written on the active Bureau model contract. The file then walks the same lifecycle a front-desk presentation walks: nine-point checklist with legacy-equivalence notes, certification with a certificate number, the stamping desk, and registration into the registry book with its page and entry position. Each registration closes its thirty-plus-three-day legacy clock and enqueues the three-hop propagation record - woreda to sub-city to Bureau - that Directive Article 13 requires. The registry-book positions of the migrated files continue the same numbering the desk uses for fresh filings, so the paper book and the digital book stay one sequence."),
    ...tbl({
      caption: "Migration register by pilot woreda",
      headers: ["Woreda", "Book", "Rows", "Migrated", "Registered", "Rent range (ETB)", "Term range"],
      widths: [14, 16, 9, 12, 13, 20, 16],
      zebra: true,
      rows: E.migration.woredas.map((m) => [
        m.woredaCode, m.bookRef, String(m.bookRows), String(m.migrated), String(m.registered),
        `${m.minRent.toLocaleString()} - ${m.maxRent.toLocaleString()}`,
        `${m.minTerm} - ${m.maxTerm} years`,
      ]),
    }),
    ...tbl({
      caption: "Migration totals and legal annotations",
      headers: ["Measure", "Value", "Meaning"],
      widths: [30, 12, 58],
      zebra: true,
      rows: [
        ["Paper book rows", String(T.bookRows), "Rows in the pilot woredas' legacy registry books."],
        ["Migration records", String(T.migrated), "Rows migrated to parties + property + registration file."],
        ["Registered legacy files", String(T.registeredLegacy), "Files that completed the full lifecycle to REGISTERED."],
        ["LEGACY_ART7 annotations", String(T.annotations), "One per file, citing Proc. Art. 7 and Dir. Art. 8(2)."],
        ["Legacy clocks closed (30+3 days)", String(T.clocksMet), "Each registration closes its statutory migration window."],
        ["Propagation records (migration)", String(T.migrationReplications), "Three hops per registration per Dir. Art. 13."],
      ],
    }),
    p("Two legal boundaries were proven rather than assumed. First, the legacy exception is narrow: a one-year legacy lease migrates successfully with its annotation - demonstrated by the automated test suite and by the live end-to-end walkthrough, which migrated a one-year book row through the API - while the same one-year term on a new filing is still refused with Proclamation Article 6 named, a refusal the Phase 5 compliance suite and the Phase 6 acceptance battery continue to enforce. Second, migration refuses to run on a book row whose source document has not been scanned and attached: the directive's registration discipline requires the contract and identification to be on file, and the platform treats an unscanned row as an incomplete presentation, not as a data gap to skip. Discrepancy handling follows the same logic: a woreda whose counts do not close simply reports unbalanced, and the exit check blocks until the variance is resolved."),
  ];
}

function chapter3() {
  return [
    h1("3. Migration Reconciliation Against the Registry Books"),
    p("Directive Article 13 makes the registry book the custody anchor of the whole system, and the plan makes reconciliation the measurable proof of migration: migrated counts must balance against the books. The reconciliation compares three numbers per woreda - rows in the paper book, records in the migration register, and registered files on the platform created by that register - and writes an immutable reconciliation report each time it runs, so the balancing act is itself auditable history. The scope definition matters and was sharpened during testing: the paper book reconciles against the migration register, not against every legacy filing a woreda may hold, because compliant front-desk presentations that never entered the paper book are not the book's rows. With that definition the three pilot woredas reconcile exactly: twenty-eight book rows, twenty-eight migration records, twenty-eight registered files, variance zero everywhere."),
    ...tbl({
      caption: "Latest reconciliation reports (all balanced)",
      headers: ["Woreda", "Book rows", "Migrated", "Platform", "Variance", "Balanced", "Note"],
      widths: [14, 11, 11, 11, 10, 11, 32],
      zebra: true,
      rows: E.reconciliation.map((r) => [
        r.woredaCode, String(r.bookCount), String(r.migratedCount), String(r.platformCount),
        String(r.variance), r.balanced ? "Yes" : "No",
        r.balanced ? "Book, register and platform agree." : String(r.note ?? ""),
      ]),
    }),
    p("The negative direction was tested with equal seriousness. A deliberately unmigrated book row drives its woreda's variance to one and flips the reconciliation to unbalanced; a severity-one drill inside the exit check shows the same blocking behaviour at gate level. Reconciliation is therefore not a report that happens to look clean - it is a control that demonstrably fails when the books and the platform disagree, which is what the gate criterion needs it to be. The standing open item O-7 (confirmation of the provisional woreda-structure counts against the official establishment register) is distinct from this reconciliation and remains carried: the pilot operates on the documented structure with provisional counts flagged in the organization tree, and the official register confirmation is scheduled before the city-wide wave of Phase 8."),
  ];
}

function chapter4() {
  return [
    h1("4. Training by Role and Tier"),
    p("The training activity turned the system's role design into human competence. Six courses cover the working roles across the three tiers: registrar front-desk practice and the stamping desk at the woreda tier, sub-city monitoring and replication, Bureau analytics with the rate-publication cycle, Bureau head decisions and penalties, and system administration including backups, staged promotion and audit-chain verification. Every course names its legal basis, so the curriculum doubles as a walk-through of the directive's duty assignments; every session records trainer, venue and date; and every trainee record captures attendance and an assessment score. Competence is a threshold decision, not an impression: a trainee who attended and scored seventy or above is recorded competent, and the figure below the threshold is recorded as needing support - the platform refuses to let encouragement become a pass mark."),
    ...tbl({
      caption: "Training curriculum and competence results",
      headers: ["Course", "Tier / audience", "Hours", "Sessions", "Competent", "Needs support"],
      widths: [30, 22, 8, 10, 14, 16],
      zebra: true,
      rows: E.training.map((c) => [
        `${c.code} - ${c.titleEn}`, `${c.tierScope} · ${c.audienceRole}`,
        String(c.durationHours), String(c.sessions), String(c.competent), String(c.needsSupport),
      ]),
    }),
    p("Coverage is the property the pilot exit depends on: every role in the pilot-critical set - registrar, stamper, sub-city monitor, Bureau analyst, Bureau head, system administrator - holds at least one competent trainee, and the records show it. The suite also records an honest gap: one sub-city monitoring trainee scored below the threshold and is marked as needing support, which is the training record doing its job; the role's coverage does not depend on that individual. Committee members received a refresher session attached to the appeal workflow, reflected in the competence register though not required by the pilot-critical set. Training records are created through the guarded API - the registrar role cannot write them - so the competence register is as protected as any operational record."),
  ];
}

function chapter5() {
  const P = E.pilot;
  return [
    h1("5. Pilot Operation and Measured Metrics"),
    p(`The pilot operated in ${P.subCityName} over woredas ${P.woredaCodes.join(", ")} for two planned working weeks, under the owner's authorization reference ${P.ownerApprovalRef} recorded at Gate G6. Daily support accompanied every pilot day, and each day each woreda logged the three measurements the plan names - registration cycle time, checklist compliance and replication correctness - together with files opened and registered, incidents and their severity, and support notes. The demonstration dataset contains ${P.dayLogs.length} day-log entries; the pattern they encode is the one the plan hoped to see: cycle time falling from the mid-nineties to under forty minutes as practice settled, checklist compliance climbing to one hundred percent, and upward replication correct on every single logged day.`),
    ...tbl({
      caption: "Pilot metrics by woreda",
      headers: ["Woreda", "Days", "Files opened", "Registered", "Cycle first→last (min)", "Avg cycle", "Avg compliance", "Replication", "SEV1"],
      widths: [12, 6, 11, 11, 15, 9, 12, 12, 6],
      zebra: true,
      rows: P.perWoreda.map((w) => [
        w.woredaCode, String(w.days), String(w.filesOpened), String(w.filesRegistered),
        `${w.firstCycle}→${w.lastCycle}`, String(w.avgCycle), `${w.avgCompliance}%`,
        w.replicationOk ? "100%" : "defect", String(w.sev1),
      ]),
    }),
    p("Incident discipline held. The only recorded incident across the pilot window is a severity-four observation - console slowness under a morning load spike, resolved the same day - logged honestly with its severity rather than smoothed over, because the exit check's severity-one gate is only meaningful if lower severities are visible in the same log. Support notes record the coaching that daily support actually does: checklist item ordering on the first day, the load observation on the second. No severity-one incident occurred, which chapter 6 carries into the exit check; the negative drill proving that one severity-one entry flips the exit to not-ready was executed in the test suite and cleaned up afterwards."),
  ];
}

module.exports = { chapter1, chapter2, chapter3, chapter4, chapter5 };
