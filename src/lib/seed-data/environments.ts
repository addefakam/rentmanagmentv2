// ============================================================================
// environments.ts — Seed configuration: environment inventory + localization
// Environment tiers implement the Directive Art. 13 backup/replication scheme
// (NFR-03: nightly full + continuous transaction log; RPO 15 min; RTO 4h;
// annual restore drill) and the upward change propagation chain
// woreda -> sub-city -> Bureau -> Ministry.
// Localization resources implement NFR-06 / FR-M13-05 (CR-01 trilingual).
// ============================================================================

export const ENVIRONMENTS = [
  {
    name: "rentctl-dev", stage: "DEV",
    purpose: "Developer workspace and integration sandbox; configuration experiments and seed iteration.",
    database: "SQLite (Prisma) - workspace file db/custom.db",
    appUrl: "http://localhost:3000",
    backupScheme: "Snapshot on every seed run; workspace version control retains configuration history.",
    replicationTarget: null,
    rpoMinutes: null, rtoHours: null,
    restoreDrill: "Restore from seed is deterministic; exercised on each promotion to STAGING.",
    notes: "Represented in this workspace by the running Next.js application and its Prisma database.",
  },
  {
    name: "rentctl-staging", stage: "STAGING",
    purpose: "Pre-production rehearsal: staged promotion target, validation suite, integration stubs for bank/payment and identification services.",
    database: "SQLite (Prisma) - staging profile db/staging.db (production target: PostgreSQL cluster)",
    appUrl: "https://staging.rent-control.example.et",
    backupScheme: "Nightly full backup plus continuous transaction logging; 30-day rolling retention.",
    replicationTarget: "FED-MINISTRY reporting replica",
    rpoMinutes: 15, rtoHours: 4,
    restoreDrill: "Quarterly restore rehearsal; result recorded in the operations log.",
    notes: "Promotion gate: full validation battery (hierarchy, catalogues, trilingual completeness) must pass before PROD.",
  },
  {
    name: "rentctl-prod", stage: "PROD",
    purpose: "Live service for woreda offices, sub-city and Bureau consoles, and the public portal.",
    database: "PostgreSQL primary per tier with read replica for reporting (production target)",
    appUrl: "https://rent-control.example.et",
    backupScheme: "Nightly full backup plus continuous transaction logging at every tier; hard-copy register custody per Directive Art. 13 (uniform numbered registry books, dual hard/soft custody).",
    replicationTarget: "Upward change propagation: Woreda -> Sub-city -> Bureau -> Ministry",
    rpoMinutes: 15, rtoHours: 4,
    restoreDrill: "Annual restore drill with evidenced result (NFR-03).",
    notes: "Backups at every tier are a Directive Art. 13(4) obligation, not an operational option.",
  },
];

// ---------------------------------------------------------------------------
// Localization resources (domain UI) — the Phase 3 console's own labels, and
// the core legal terms the registration workflow validates against.
// English and Amharic renderings are certified; Afan Oromo renderings carry
// PENDING_CERTIFICATION and fall back per NFR-06 until the Bureau certifies.
// ---------------------------------------------------------------------------
export interface LocaleSpec {
  key: string;
  domain: "UI" | "DOCUMENT" | "NOTIFICATION";
  en: string;
  am: string;
  om: string;
}

export const LOCALIZATION_RESOURCES: LocaleSpec[] = [
  { key: "app.title", domain: "UI", en: "Rent Control and Administration System", am: "የመኖሪያ ቤት ኪራይ መቆጣጠርና አስተዳደር ሥርዓት", om: "Sirna To'annaa fi Bulchiinsa Kiraalee Manneen Jireenyaa" },
  { key: "app.phase", domain: "UI", en: "Phase 3 - Environments and Seed Configuration", am: "ደረጃ 3 - አካባቢዎችና የመነሻ ውቅር", om: "Sadarkaa 3 - Naannolee fi Qindaa'inuu Jalqabaa" },
  { key: "nav.environments", domain: "UI", en: "Environments", am: "አካባቢዎች", om: "Naannolee" },
  { key: "nav.configuration", domain: "UI", en: "Seed Configuration", am: "የመነሻ ውቅር", om: "Qindaa'inuu Jalqabaa" },
  { key: "nav.promotion", domain: "UI", en: "Staged Promotion", am: "ተደራራቢ ማስተዋወቅ", om: "Ce'umsa Sadarkaan" },
  { key: "nav.validation", domain: "UI", en: "G3 Evidence", am: "የG3 ማስረጃ", om: "Ragaa G3" },
  { key: "org.ministry", domain: "UI", en: "Ministry", am: "ሚኒስትር", om: "Ministirri" },
  { key: "org.bureau", domain: "UI", en: "City Bureau", am: "የከተማ ቢሮ", om: "Biiroo Magaalaa" },
  { key: "org.subcity", domain: "UI", en: "Sub-city", am: "ክፍለ ከተማ", om: "Kutaa Magaalaa" },
  { key: "org.woreda", domain: "UI", en: "Woreda", am: "ወረዳ", om: "Woredaa" },
  { key: "term.rent_ceiling", domain: "UI", en: "Rent ceiling", am: "የኪራይ ጣሪያ", om: "Daangaa Kiraalaa" },
  { key: "term.lease_term", domain: "UI", en: "Lease term (minimum two years)", am: "የኪራይ ዘመን (ቢያንስ ሁለት ዓመት)", om: "Yeroo kiraalee (gaggabaari'iin waggaa lama)" },
  { key: "term.advance_cap", domain: "UI", en: "Advance payment cap (two months)", am: "የቅድመ ክፍያ ጣሪያ (ሁለት ወር)", om: "Daangaa kaffaltii duraa (ji'a lama)" },
  { key: "term.electronic_payment", domain: "UI", en: "Electronic payment only", am: "ኤሌክትሮኒክ ክፍያ ብቻ", om: "Kaffaltii elektiroonikii qofa" },
  { key: "term.registration_window", domain: "UI", en: "Registration window (30 working days)", am: "የምዝገባ ጊዜ (30 የሥራ ቀናት)", om: "Yeroo galmeessuu (guyyaa hojii 30)" },
  { key: "term.certification", domain: "UI", en: "Woreda certification", am: "የወረዳ ምስክርነት", om: "Mirkaneessa Woredaa" },
  { key: "lang.switch", domain: "UI", en: "Language", am: "ቋንቋ", om: "Afaan" },
  { key: "lang.fallback_notice", domain: "UI", en: "Afan Oromo rendering pending certification; English shown where translation is not yet certified.", am: "የአፋን ኦሮሞ አነጋገር እስካልተረጋገጠ ድረስ እንግሊዝኛ ይታያል።", om: "Hiikni Afaan Oromoo hangaaf ragaa baay'inaa hin mirkaneefamutti, Afaan Ingilizfaan mul'ata." },
  { key: "promotion.run", domain: "UI", en: "Run staged promotion", am: "ተደራራቢ ማስተዋወቅ አሂድ", om: "Ce'umsa sadarkaan jalqaasi" },
  { key: "promotion.tag", domain: "UI", en: "Release tag", am: "የምህጻረ ቃል ምልክት", om: "Asxaa gatii " },
  { key: "validation.passed", domain: "UI", en: "Passed", am: "አልፏል", om: "Darbeera" },
  { key: "validation.failed", domain: "UI", en: "Failed", am: "አልተሳካም", om: "Hin milkoofne" },
  { key: "validation.pending_register", domain: "UI", en: "Woreda counts pending official register reconciliation (O-7)", am: "የወረዳ ቁጥሮች ከኦፊሴላዊ መዝገብ ጋር እስከሚስማሙ በመጠበቅ ላይ (O-7)", om: "Lakkoofsota Woredaa akka O-7tti waliigaluuf eegalan" },
];
