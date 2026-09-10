// ============================================================================
// matrix.ts — Phase 5 LEGAL COMPLIANCE TEST MATRIX (the plan's signature
// quality instrument). Every binding rule of the three source documents is
// paired with at least one named, executable test case. Test results are
// attached by scripts/quality/run-all.ts into results.json, which /api/quality
// and the Phase 5 report consume.
//
// Verification kinds:
//   AUTOMATED   — executed by the named test case on every run
//   PARAMETRIC  — the rule is encoded as a configurable seed parameter; the
//                 test asserts presence, structure and legal basis
//   DOCUMENTARY — the rule describes a duty outside software behaviour; the
//                 platform records the audit surface for it (tested via the
//                 named cases that touch the same records)
// ============================================================================

export type VerifyKind = "AUTOMATED" | "PARAMETRIC" | "DOCUMENTARY";

export type MatrixRow = {
  id: string;
  source: string; // exact citation
  rule: string;
  module: string;
  kind: VerifyKind;
  tests: string[]; // test case names (must exist in the test suites)
  openItem?: string; // disposition of open items O1 / O-7 / O-8 / O-9
};

export const COMPLIANCE_MATRIX: MatrixRow[] = [
  // ---------------------------------------------------------------------
  // Proclamation No. 1320/2016
  // ---------------------------------------------------------------------
  { id: "TC-P02", source: "Proc. Art. 2(2-4)", rule: "Residential property status classified as new construction, previously-rented vacant, or occupied; drives the exemption clock.", module: "M2", kind: "AUTOMATED", tests: ["TC-P02 property status enum and routing"] },
  { id: "TC-P03", source: "Proc. Art. 3(3)", rule: "Houses administered by federal/city organs are outside this proclamation's rent-ceiling regime; scope recorded in city configuration.", module: "M13", kind: "PARAMETRIC", tests: ["TC-P03 scope exclusion recorded in city configuration"] },
  { id: "TC-P04", source: "Proc. Art. 4", rule: "Rental of residential houses requires a written, certified and registered contract; unregistered contracts have no legal effect; payments attach only to registered files.", module: "M4", kind: "AUTOMATED", tests: ["TC-P04 certification chain enforced before registration", "TC-P04 payment rejected before the contract is registered"] },
  { id: "TC-P05", source: "Proc. Art. 5; Dir. Art. 4", rule: "The Bureau publishes the model rental agreement; the studio amends it under version control without touching superseded versions.", module: "M3", kind: "AUTOMATED", tests: ["TC-P05 model agreement versioning under Bureau control"] },
  { id: "TC-P06", source: "Proc. Art. 6", rule: "Minimum lease term of two years; shorter terms are refused at intake.", module: "M4", kind: "AUTOMATED", tests: ["TC-P06 two-year minimum term enforced"] },
  { id: "TC-P07", source: "Proc. Art. 7; Dir. Art. 8(2)", rule: "Legacy (pre-proclamation) contracts are registered during the 30+3 day campaign with a legacy annotation distinguishing migrated records.", module: "M4", kind: "AUTOMATED", tests: ["TC-P07 legacy registration carries the legacy annotation"] },
  { id: "TC-P08", source: "Proc. Art. 8; Dir. Art. 11", rule: "Annual rent adjustment studied, published June 1, effective June 30; increases beyond the ceiling refused.", module: "M5", kind: "AUTOMATED", tests: ["TC-P08 June calendar and increase ceiling enforced"] },
  { id: "TC-P09", source: "Proc. Art. 9", rule: "First-time pricing of new (never-rented) houses is free; the adjustment engine skips houses inside the exemption window.", module: "M5", kind: "AUTOMATED", tests: ["TC-P09 exemption window suspends adjustment applicability"] },
  { id: "TC-P10", source: "Proc. Art. 10", rule: "Exemption clocks: 48 months for new construction, 24 months for previously-rented vacant houses; vacancy surcharge bands 5-25 percent by vacancy years.", module: "M2/M9", kind: "AUTOMATED", tests: ["TC-P10 exemption clocks and vacancy surcharge bands"] },
  { id: "TC-P12", source: "Proc. Art. 12", rule: "Advance payment capped at two months' rent.", module: "M6", kind: "AUTOMATED", tests: ["TC-P12 prepayment above two months rejected"] },
  { id: "TC-P13", source: "Proc. Art. 13; Dir. Art. 22", rule: "Rent is payable only through bank or legal electronic channels; cash payments auto-open the 10 percent referral case; electronic transfers settle at the gateway before any ledger entry.", module: "M6", kind: "AUTOMATED", tests: ["TC-P13 electronic settlement precedes ledger entry; cash auto-refers", "TC-INT-02 bank decline leaves the ledger untouched", "TC-INT-03 gateway timeout leaves the ledger untouched and is retry-safe"] },
  { id: "TC-P14", source: "Proc. Art. 14", rule: "In any proceeding the registered contract and electronic payment records are the admissible evidence; the ledger therefore refuses entries outside registered contracts.", module: "M6/M9", kind: "AUTOMATED", tests: ["TC-P04 payment rejected before the contract is registered"] },
  { id: "TC-P15", source: "Proc. Arts. 15-17", rule: "Termination regime including no-notice grounds; termination without statutory notice is a sanctionable offense (3 months' rent).", module: "M4/M9", kind: "PARAMETRIC", tests: ["TC-P15 noticeless termination maps to the 3-month offense fine"] },
  { id: "TC-P18", source: "Proc. Art. 18(3)", rule: "National statistics and ceiling rates are published for the public; publication is a Ministry-role capability.", module: "M11/M12", kind: "AUTOMATED", tests: ["TC-P18 publication is a Ministry capability (RBAC)", "TC-P18 publication is denied to non-Ministry roles (RBAC)"] },
  { id: "TC-P19", source: "Proc. Art. 19(5); Dir. Arts. 14(4), 16(6)", rule: "The regulatory body establishes the IT system that registers contracts, records payments and produces statistics; this platform is that system and boots from the seeded hierarchy.", module: "M13", kind: "AUTOMATED", tests: ["TC-P19 platform boots from the seeded hierarchy"] },
  { id: "TC-P20", source: "Proc. Art. 20; Dir. Arts. 17-18", rule: "Tenant complaints (overcharge, illegal eviction, etc.) are received through multiple channels and registered against the eight statutory grounds.", module: "M8", kind: "AUTOMATED", tests: ["TC-P20 complaint intake validates the eight grounds and channels"] },
  { id: "TC-P22", source: "Proc. Arts. 20-23", rule: "The complaint decision is due within 30 working days of receipt; the decision clock opens at intake and closes at decision.", module: "M8/M12", kind: "AUTOMATED", tests: ["TC-P22 30-working-day decision clock opens and closes"] },
  { id: "TC-P24", source: "Proc. Art. 24", rule: "Appeals to the hearing committee must be filed within 15 days of the decision; late appeals are refused.", module: "M8", kind: "AUTOMATED", tests: ["TC-P24 late appeal refused; timely appeal accepted"] },
  { id: "TC-P25", source: "Proc. Arts. 25-26", rule: "The committee hears appeals within the hearing window and may escalate to the courts; window encoded as a confirmed parameter (O-9 verified 30 days).", module: "M8", kind: "AUTOMATED", tests: ["TC-P25 committee hearing window and court escalation"], openItem: "O-9 closed: committee window = 30 days, basis cited in parameter seed" },
  { id: "TC-P29", source: "Proc. Arts. 29-32", rule: "Administrative fines are capped at three months' rent of the affected contract; the cap applies at computation time.", module: "M9", kind: "AUTOMATED", tests: ["TC-P29 fine cap at three months' rent"] },
  { id: "TC-P29R", source: "Proc. Art. 29", rule: "Regional implementation is by directive; per-city parameter sets exist so Addis Ababa values never hard-code.", module: "M13", kind: "PARAMETRIC", tests: ["TC-P29R per-city parameter set exists for regional replication"] },

  // ---------------------------------------------------------------------
  // Addis Ababa Directive No. 7/2016
  // ---------------------------------------------------------------------
  { id: "TC-D04", source: "Dir. Art. 4", rule: "Contract content follows the annexed model; the seeded model carries the required section structure in trilingual renderings.", module: "M3", kind: "AUTOMATED", tests: ["TC-D04 model contract section structure complete"] },
  { id: "TC-D05", source: "Dir. Art. 5", rule: "Registration requires the identification documents (five accepted types), ownership evidence and proxy documents with two witnesses.", module: "M1/M2", kind: "AUTOMATED", tests: ["TC-D05 accepted identification catalogue and proxy rule"] },
  { id: "TC-D06", source: "Dir. Art. 6", rule: "Registration happens in person at the woreda where the house is located; files are opened on a woreda-tier org unit with a computer-typed form.", module: "M4/M13", kind: "AUTOMATED", tests: ["TC-D06 files open only on woreda-tier org units"] },
  { id: "TC-D07", source: "Dir. Art. 7", rule: "The nine-point document verification checklist must be completed before certification.", module: "M4", kind: "AUTOMATED", tests: ["TC-D07 certification blocked until the nine-point checklist passes"] },
  { id: "TC-D08", source: "Dir. Art. 8", rule: "Registrar certification acts follow checklist completion; the registry records who certified.", module: "M4", kind: "AUTOMATED", tests: ["TC-D07 certification blocked until the nine-point checklist passes"] },
  { id: "TC-D09", source: "Dir. Art. 9", rule: "Stamping desk applies the office round stamp; database entry and the uniform registry book follow with sequential numbering (50 entries per page).", module: "M4", kind: "AUTOMATED", tests: ["TC-D09 stamp-then-register sequence and registry book numbering"] },
  { id: "TC-D10", source: "Dir. Art. 10", rule: "Amendments must be registered within the 30-day window; rate-affected amendments checked against the incoming rate set.", module: "M4/M5", kind: "AUTOMATED", tests: ["TC-D10 amendment window arithmetic (30 days)"] },
  { id: "TC-D11", source: "Dir. Art. 11", rule: "Annual increase study feeds publication June 1 and effect June 30; the calendar engine enumerates the statutory events.", module: "M5/M13", kind: "AUTOMATED", tests: ["TC-D11 statutory calendar events seeded with legal basis"] },
  { id: "TC-D12", source: "Dir. Art. 12", rule: "Registration corrections are recorded as annotations on the file, never as silent rewrites of certified data.", module: "M4", kind: "AUTOMATED", tests: ["TC-D12 corrections recorded as file annotations"] },
  { id: "TC-D13", source: "Dir. Art. 13", rule: "Hard and soft records, document scanning, upward tier replication (hop counts by tier) and per-tier nightly backups.", module: "M10", kind: "AUTOMATED", tests: ["TC-D13 replication hop counts and backup runs per tier"] },
  { id: "TC-D14", source: "Dir. Arts. 14-16", rule: "Bureau, sub-city and woreda duties map to the role catalogue with tier scopes; data aggregates upward through the hierarchy.", module: "M13/M12", kind: "AUTOMATED", tests: ["TC-D14 role tier scopes match the three administrative tiers", "TC-D14 aggregation snapshot rolls woreda data upward"] },
  { id: "TC-D17", source: "Dir. Art. 17", rule: "Exactly eight complaint grounds are configured, matching the directive's list.", module: "M8", kind: "AUTOMATED", tests: ["TC-D17 exactly eight complaint grounds seeded"] },
  { id: "TC-D18", source: "Dir. Art. 18", rule: "Complaints arrive via walk-in, phone, web, letter and third-party referral; verbal statements require a minimum factual description.", module: "M8", kind: "AUTOMATED", tests: ["TC-D18 multi-channel intake with minimum statement rule"] },
  { id: "TC-D19", source: "Dir. Art. 19", rule: "Admissibility verification, investigation, decision and notice proceed in statutory order with deadline escalation.", module: "M8", kind: "AUTOMATED", tests: ["TC-D19 pipeline order enforced (verify, investigate, decide)"] },
  { id: "TC-D20", source: "Dir. Art. 20", rule: "Control teams act on sub-city authority, show identification credentials on visit, and monitor vacancy.", module: "M7", kind: "AUTOMATED", tests: ["TC-D20 control visit requires credential confirmation"] },
  { id: "TC-D21", source: "Dir. Art. 21", rule: "Prohibited acts (demanding excess advance, unregistered renting, unauthorized increase, noticeless termination, illegal eviction) map one-to-one to offense parameters.", module: "M9", kind: "PARAMETRIC", tests: ["TC-D21 prohibited acts map to offense fine parameters (O1 configurable)"], openItem: "O1 tracked: offense-level figures configurable as PENDING_OFFICIAL_TEXT pending official Amharic text" },
  { id: "TC-D22", source: "Dir. Art. 22", rule: "Penalty ladder: cash-payment 10 percent referral rule, vacancy surcharge bands 5/10/15/20/25 percent, tax escalation and court referral; cap enforced.", module: "M9", kind: "AUTOMATED", tests: ["TC-D22 vacancy surcharge bands and cash referral computed"] },

  // ---------------------------------------------------------------------
  // Model Rental Agreement (annexed to the directive)
  // ---------------------------------------------------------------------
  { id: "TC-MA1", source: "MA cl. 1-3", rule: "Lessor, lessee and property blocks are populated from registered party and property profiles; they cannot diverge from the registry.", module: "M3/M4", kind: "AUTOMATED", tests: ["TC-MA1 contract blocks derive from registered profiles"] },
  { id: "TC-MA4", source: "MA cl. 4(1-4)", rule: "House status selector drives the exemption clock; rent in words and figures; term at least two years; service-charge payer enum.", module: "M4", kind: "AUTOMATED", tests: ["TC-MA4 status selector drives the exemption clock"] },
  { id: "TC-MA6", source: "MA cl. 6(1)", rule: "Advance and monthly due day captured; advance capped at two months (Proc. Art. 12).", module: "M6", kind: "AUTOMATED", tests: ["TC-P12 prepayment above two months rejected"] },
  { id: "TC-MA8", source: "MA cl. 8; signatures + 3 witnesses", rule: "The contract takes effect only upon regulator certification; execution requires three witnesses with identification.", module: "M4", kind: "AUTOMATED", tests: ["TC-MA8 three witnesses with identification required"] },

  // ---------------------------------------------------------------------
  // SRS v1.1 non-functional baselines tested at Phase 5
  // ---------------------------------------------------------------------
  { id: "TC-N04", source: "NFR-04 (OWASP ASVS L2, V4)", rule: "Access control between tiers: woreda, sub-city, Bureau, committee, Ministry and system roles can execute only their own capabilities; anonymous calls are refused.", module: "Platform", kind: "AUTOMATED", tests: ["TC-SEC-01 anonymous mutation refused with 403", "TC-SEC-02 wrong-tier role refused (registrar cannot publish ceilings)", "TC-SEC-03 stamping desk separated from registrar (Dir. Art. 9)", "TC-SEC-04 correct role executes each capability", "TC-SEC-05 capability matrix mirrors the directive tier duties"] },
  { id: "TC-N07", source: "NFR-07 (ASVS V7)", rule: "Every state-changing action appends an immutable audit event; the SHA-256 chain detects any alteration of history.", module: "Platform", kind: "AUTOMATED", tests: ["TC-SEC-06 state changes append to the audit chain", "TC-SEC-07 tampering with a historical event is detected", "TC-SEC-08 chain verification returns intact on untampered history"] },
  { id: "TC-INT01", source: "Plan §5.6; O3", rule: "Payment and identification sandboxes integrate with defined failure and timeout behaviour; identity timeouts degrade gracefully with a deferral note instead of blocking the office.", module: "M1/M6", kind: "AUTOMATED", tests: ["TC-INT-01 electronic settlement stores the provider reference", "TC-INT-04 identity mismatch flags the party for follow-up", "TC-INT-05 identity service timeout degrades gracefully (deferred)"] },
  { id: "TC-N06", source: "NFR-06 / CR-01", rule: "Amharic, English and Afan Oromo interfaces from seeded localization resources; certified Afan Oromo legal glossary tracked as open item O-8 with fallback.", module: "M13", kind: "PARAMETRIC", tests: ["TC-N06 trilingual localization resources present for all three languages"], openItem: "O-8 tracked: Afan Oromo legal glossary certification pending; fallback per NFR-06" },
  { id: "TC-N12", source: "NFR-12", rule: "Sequential register numbering enforced database-side; certified contract records immutable after certification (corrections via annotations only).", module: "M4", kind: "AUTOMATED", tests: ["TC-N12 sequential numbering and post-certification immutability"] },
];

export type OpenItemDisposition = {
  id: string;
  title: string;
  disposition: string;
  carried: boolean;
};

export const OPEN_ITEM_DISPOSITIONS: OpenItemDisposition[] = [
  { id: "O1", title: "Directive Art. 22 fine ladder exact figures (scanned two-column ambiguity)", disposition: "Encoded as configurable PEN-* parameters with status PENDING_OFFICIAL_TEXT; penalty engine reads parameters, never constants. Confirmed figures replace seed values without code change. Carried into UAT legal review (Phase 6).", carried: true },
  { id: "O-7", title: "Woreda register reconciliation before pilot (provisional counts for some sub-cities)", disposition: "131 org units seeded with per-unit CONFIRMED / PENDING_OFFICIAL_REGISTER basis badges; validator battery blocks promotion if the official total (118) drifts. Reconciliation against the official register remains a Phase 7 pilot prerequisite.", carried: true },
  { id: "O-8", title: "Afan Oromo legal glossary certification (CR-01)", disposition: "Trilingual UI/notifications/documents ship with fallback per NFR-06; terminology marked PENDING_CERTIFICATION where legal phrasing needs the certified glossary. Certification workshop scheduled with the Bureau in Phase 6.", carried: true },
  { id: "O-9", title: "Committee hearing window parameter (Proc. Arts. 25-26)", disposition: "Closed at Phase 5: hearing window = 30 days (committeeHearingDue), basis cited in the compliance matrix row TC-P25 and the parameter seed.", carried: false },
];
