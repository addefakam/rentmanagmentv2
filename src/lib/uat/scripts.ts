// ============================================================================
// scripts.ts — Phase 6 USER ACCEPTANCE TEST scripts (plan §5.7).
// Each scenario is derived from the SRS v1.1 use-case registry (21 use cases)
// and rehearses one role's real work through the live platform exactly as the
// directive prescribes it. Steps are declarative: action, expected result and
// the legal basis the step demonstrates. Executors (executors.ts) run the
// steps over the HTTP API with the acting officer's staff code, so RBAC,
// legal gates and audit trails are exercised the way a real session would.
// ============================================================================

export type UatStepSpec = {
  no: number;
  action: string;
  expected: string;
  legalBasis: string;
};

export type UatScenarioSpec = {
  id: string;
  title: string;
  role: string;
  actors: string[]; // staff codes acting in the scenario
  useCases: string[]; // SRS use-case registry anchors
  legalBasis: string;
  objective: string;
  steps: UatStepSpec[];
};

export const UAT_SCENARIOS: UatScenarioSpec[] = [
  {
    id: "UAT-01",
    title: "Woreda registrar: registration file lifecycle",
    role: "Woreda registrar + stamping desk",
    actors: ["STF-0001", "STF-0002"],
    useCases: ["UC-L0", "UC-L1", "UC-L2", "UC-R1"],
    legalBasis: "Proc. Art. 4; Dir. Arts. 6-9",
    objective:
      "The registrar runs one real registration file end to end: party onboarding with the original-and-copy rule, property capture, file presentation on the active model contract, the nine-point checklist, certification, the stamping desk and registry-book entry.",
    steps: [
      { no: 1, action: "Onboard the landlord with identification original seen and copy attached", expected: "Party record created with a party code; identity complete", legalBasis: "Dir. Art. 7" },
      { no: 2, action: "Onboard the tenant with identification original seen and copy attached", expected: "Party record created with a party code", legalBasis: "Dir. Art. 7" },
      { no: 3, action: "Verify both parties at the front desk", expected: "Both parties VERIFIED", legalBasis: "Dir. Art. 7" },
      { no: 4, action: "Register the residential property at the woreda where the house is located (occupied status)", expected: "Property code issued; no exemption clock for an occupied house", legalBasis: "Dir. Art. 6; Proc. Arts. 2, 10" },
      { no: 5, action: "Present the registration file on the active Bureau model contract: two-year lease, three witnesses, electronic payment method confirmed at the woreda", expected: "File number issued; status PRESENTED", legalBasis: "Proc. Arts. 4-6, 12-13; MA cl. 8" },
      { no: 6, action: "Complete the nine-point document verification checklist", expected: "All nine items passed; status CHECKLIST_PASSED", legalBasis: "Dir. Arts. 6-9" },
      { no: 7, action: "Certify the file", expected: "Status CERTIFIED with a certificate number", legalBasis: "Dir. Art. 8" },
      { no: 8, action: "Apply the office round stamp at the stamping desk (separate officer)", expected: "Status STAMPED; registrar role could not stamp (role separation)", legalBasis: "Dir. Art. 9" },
      { no: 9, action: "Enter the contract in the register", expected: "Status REGISTERED with registry-book page and entry number; upward replication enqueued", legalBasis: "Proc. Art. 4; Dir. Art. 9; Dir. Art. 13" },
    ],
  },
  {
    id: "UAT-02",
    title: "Woreda registrar: legal refusal gates at intake",
    role: "Woreda registrar",
    actors: ["STF-0001", "STF-0002"],
    useCases: ["UC-L2", "UC-R1"],
    legalBasis: "Proc. Arts. 6, 12; Dir. Arts. 6, 9",
    objective:
      "Negative rehearsal: the system must refuse every intake that the law refuses - a one-year lease, a three-month advance, filing at a non-woreda office, certification without the checklist, and a stamper attempting a registrar act.",
    steps: [
      { no: 1, action: "Attempt to file a contract with a one-year lease term", expected: "Refused citing Proc. Art. 6 (minimum two-year term)", legalBasis: "Proc. Art. 6" },
      { no: 2, action: "Attempt to file a contract with a three-month advance payment", expected: "Refused citing Proc. Art. 12 (two-month cap)", legalBasis: "Proc. Art. 12" },
      { no: 3, action: "Attempt to open the file at a sub-city office instead of the house's woreda", expected: "Refused citing Dir. Art. 6 (registration at the house's woreda)", legalBasis: "Dir. Art. 6" },
      { no: 4, action: "Attempt to certify a PRESENTED file before the nine-point checklist", expected: "Refused citing Dir. Art. 9", legalBasis: "Dir. Art. 9" },
      { no: 5, action: "Stamper officer attempts the registrar's certification act", expected: "Refused with 403 - role separation of the stamping desk (Dir. Art. 9)", legalBasis: "Dir. Art. 9; NFR-04" },
    ],
  },
  {
    id: "UAT-03",
    title: "Bureau analyst and head: annual adjustment publication flow",
    role: "Bureau analyst (study) + Bureau head (publish/effect)",
    actors: ["STF-0004", "STF-0005", "STF-0001"],
    useCases: ["UC-L3", "UC-M2"],
    legalBasis: "Proc. Arts. 8-9; Dir. Art. 11",
    objective:
      "The Bureau runs the annual rent adjustment: analyst drafts from the market study, head publishes June 1 and effects June 30, and a woreda registrar validates a proposed increase against the ceiling.",
    steps: [
      { no: 1, action: "Analyst drafts the annual adjustment from the Bureau market study", expected: "Adjustment DRAFT at the studied percentage", legalBasis: "Proc. Art. 8; Dir. Art. 11" },
      { no: 2, action: "Analyst attempts to publish their own draft", expected: "Refused with 403 - publication is the Bureau head's act (separation of duties)", legalBasis: "NFR-04; Dir. Art. 11" },
      { no: 3, action: "Bureau head publishes the ceiling adjustment", expected: "PUBLISHED with June 1 publication date; public ceiling notice created", legalBasis: "Proc. Art. 8" },
      { no: 4, action: "Bureau head brings the adjustment into effect", expected: "EFFECTIVE with June 30 effect date; 30-working-day amendment window clock opened", legalBasis: "Proc. Art. 8; Dir. Art. 10" },
      { no: 5, action: "Registrar validates a proposed increase within the ceiling", expected: "Accepted; ceiling = last registered rent + studied percentage", legalBasis: "Proc. Arts. 8-9" },
      { no: 6, action: "Registrar validates a proposed increase above the ceiling", expected: "Blocked citing Proc. Arts. 8-9", legalBasis: "Proc. Arts. 8-9" },
    ],
  },
  {
    id: "UAT-04",
    title: "Complaint officer: intake to decision within the statutory clock",
    role: "Woreda complaint officer",
    actors: ["STF-0001"],
    useCases: ["UC-T3", "UC-R3"],
    legalBasis: "Proc. Arts. 20-23; Dir. Arts. 17-19",
    objective:
      "A tenant complaint arrives by telephone on ground CG-1 (rent above the published ceiling). The officer intakes it, verifies completeness, investigates, decides, and the deadline register tracks the 30-working-day decision clock and the 15-day appeal window.",
    steps: [
      { no: 1, action: "Intake a telephone complaint on ground CG-1 with the minimum factual statement against a registered contract", expected: "Complaint registered with reference number; 30-working-day decision clock opened", legalBasis: "Proc. Arts. 20-22; Dir. Arts. 17-18" },
      { no: 2, action: "Attempt intake with a ground outside the eight statutory grounds", expected: "Refused citing Dir. Art. 17", legalBasis: "Dir. Art. 17" },
      { no: 3, action: "Attempt intake without the minimum statement of facts", expected: "Refused citing Dir. Art. 18", legalBasis: "Dir. Art. 18" },
      { no: 4, action: "Verify the completeness of the complaint", expected: "Status COMPLETENESS_VERIFIED", legalBasis: "Dir. Art. 18" },
      { no: 5, action: "Investigate the complaint against the ceiling record", expected: "Status UNDER_INVESTIGATION with investigation notes", legalBasis: "Dir. Art. 19" },
      { no: 6, action: "Decide the complaint (UPHOLD)", expected: "Status DECIDED; decision clock MET; 15-day appeal window opened", legalBasis: "Proc. Arts. 22, 24" },
      { no: 7, action: "Read the deadline register for this complaint", expected: "DECISION-30WD shown MET and APPEAL-15D shown OPEN", legalBasis: "Dir. Art. 19; Proc. Art. 22" },
    ],
  },
  {
    id: "UAT-05",
    title: "Hearing committee: rehearsed appeal and court escalation",
    role: "Committee member (hearing) + registrar (filing)",
    actors: ["STF-0001", "STF-0006"],
    useCases: ["UC-T4", "UC-C1"],
    legalBasis: "Proc. Arts. 24-26",
    objective:
      "The committee rehearses an appeal hearing: a timely appeal is filed on the decided complaint, a late appeal is refused, the committee schedules, hears and decides - and a second case exercises the court-escalation path.",
    steps: [
      { no: 1, action: "File a timely appeal on the decided complaint", expected: "Appeal number issued; committee hearing window clock opened", legalBasis: "Proc. Art. 24" },
      { no: 2, action: "Attempt to file an appeal dated beyond the 15-day window", expected: "Refused citing Proc. Art. 24 with the deadline stated", legalBasis: "Proc. Art. 24" },
      { no: 3, action: "Committee schedules the hearing", expected: "Status SCHEDULED with a hearing date", legalBasis: "Proc. Art. 25" },
      { no: 4, action: "Committee conducts the hearing", expected: "Status HEARD", legalBasis: "Proc. Art. 25" },
      { no: 5, action: "Committee issues its decision", expected: "Status DECIDED; hearing clock MET; complaint CLOSED", legalBasis: "Proc. Arts. 25-26" },
      { no: 6, action: "Second case: committee escalates an appeal to the courts", expected: "Status ESCALATED_TO_COURT with court filing date; complaint CLOSED", legalBasis: "Proc. Arts. 25-26" },
    ],
  },
  {
    id: "UAT-06",
    title: "Tenant and landlord: electronic payment ledger rehearsal",
    role: "Woreda payment desk (recording tenant/landlord payments)",
    actors: ["STF-0001"],
    useCases: ["UC-T2", "UC-P2"],
    legalBasis: "Proc. Arts. 4, 12-14; Dir. Art. 22",
    objective:
      "The payment desk rehearses the ledger rules: electronic settlement through the bank gateway before any ledger entry, the two-month advance boundary, refusal of unregistered-contract payments, and the automatic 10 percent cash referral.",
    steps: [
      { no: 1, action: "Record one month's rent paid through TeleBirr on the registered contract", expected: "Receipt issued with the bank provider reference settled before the ledger entry", legalBasis: "Proc. Art. 13" },
      { no: 2, action: "Record a two-month advance payment (boundary of the cap)", expected: "Accepted at exactly two months", legalBasis: "Proc. Art. 12" },
      { no: 3, action: "Attempt a three-month advance payment", expected: "Refused citing Proc. Art. 12", legalBasis: "Proc. Art. 12" },
      { no: 4, action: "Attempt a payment against a file that is not yet registered", expected: "Refused citing Proc. Art. 4 (payments attach only to registered contracts)", legalBasis: "Proc. Arts. 4, 14" },
      { no: 5, action: "Record a cash payment and observe the automatic referral", expected: "Receipt flagged CASH; a 10 percent referral case (1,200 ETB on 12,000 ETB rent) opened automatically", legalBasis: "Proc. Art. 13; Dir. Art. 22" },
    ],
  },
  {
    id: "UAT-07",
    title: "Control team and Bureau head: vacancy monitoring and penalty ladder",
    role: "Sub-city control team + Bureau head",
    actors: ["STF-0003", "STF-0005"],
    useCases: ["UC-R2", "UC-R4"],
    legalBasis: "Proc. Arts. 29-32; Dir. Arts. 20, 22",
    objective:
      "The sub-city control team rehearses a vacancy control visit and the Bureau head computes the penalty ladder: surcharge band math, notifications, referrals to the tax authority and the court, and the three-month fine cap.",
    steps: [
      { no: 1, action: "Sub-city forms (or reuses) the woreda control team", expected: "Control team available at sub-city level", legalBasis: "Dir. Art. 20" },
      { no: 2, action: "Attempt a control visit without showing identification", expected: "Refused citing Dir. Art. 20", legalBasis: "Dir. Art. 20" },
      { no: 3, action: "Record a control visit with credentials shown; vacancy observed at 30 months", expected: "Visit reference issued; property flagged for vacancy monitoring beyond six months", legalBasis: "Dir. Art. 20" },
      { no: 4, action: "Bureau head computes the vacancy surcharge at 2.5 vacancy years on 12,000 ETB rent", expected: "Band 10 percent; amount 14,400 ETB (annual-rent base)", legalBasis: "Dir. Art. 22(8-9)" },
      { no: 5, action: "Notify, then refer the vacancy case to the tax authority", expected: "NOTIFIED then REFERRED to TAX_AUTHORITY", legalBasis: "Dir. Art. 22" },
      { no: 6, action: "Compute a noticeless-termination offense fine on 12,000 ETB rent", expected: "Fine at the three-month cap: 36,000 ETB (Proc. Arts. 29-32 cap enforced at computation)", legalBasis: "Proc. Arts. 29-32; Dir. Art. 22" },
      { no: 7, action: "Refer the offense case to the court and track recovery", expected: "REFERRED to COURT then COURT_RECOVERY tracked", legalBasis: "Dir. Art. 22; Proc. Arts. 29-32" },
    ],
  },
  {
    id: "UAT-08",
    title: "Trilingual service delivery rehearsal (CR-01 / NFR-06)",
    role: "Amharic, English and Afan Oromo speaking officers and public",
    actors: ["STF-0001", "STF-0003", "STF-0006"],
    useCases: ["UC-M1", "UC-P1", "UC-P4"],
    legalBasis: "CR-01; NFR-06; Proc. Art. 18",
    objective:
      "The change request CR-01 rehearsal: every public surface answers in Amharic, English and Afan Oromo from seeded localization resources, with the certified-glossary fallback of open item O-8 visible where legal phrasing is pending.",
    steps: [
      { no: 1, action: "Inspect the localization catalogue for the three languages", expected: "Amharic, English and Afan Oromo resources present; O-8 fallback declared", legalBasis: "CR-01; NFR-06" },
      { no: 2, action: "Open the active model contract and check the section renderings", expected: "All sections carry English, Amharic and Afan Oromo content", legalBasis: "Proc. Art. 5; Dir. Art. 4; CR-01" },
      { no: 3, action: "Open the public publication feed and check the ceiling notice", expected: "Ceiling publication carries trilingual titles and content", legalBasis: "Proc. Arts. 8, 18" },
      { no: 4, action: "Check officer language preferences in the staff register", expected: "Staff records carry declared working languages (am / en / om)", legalBasis: "CR-01; NFR-06" },
      { no: 5, action: "Confirm the compliance matrix row for trilingual localization passes", expected: "TC-N06 status PASS with the O-8 disposition recorded", legalBasis: "NFR-06; O-8" },
    ],
  },
];
