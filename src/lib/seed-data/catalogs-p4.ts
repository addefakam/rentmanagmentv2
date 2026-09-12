// ============================================================================
// catalogs-p4.ts — Phase 4 operational seed data (trilingual per CR-01)
// Complaint grounds: Directive Arts. 17-19 (eight grounds checklist).
// City config: per-city rule set (Dir. Art. 14). Demo staff accounts bind
// the role catalogue to the org hierarchy for the sprint demonstration.
// ============================================================================

// Eight complaint grounds — Dir. Art. 17 checklist (M8)
export const COMPLAINT_GROUNDS = [
  { code: "CG-1", nameEn: "Rent above the published ceiling", nameAm: "ከታወቀው የኪራይ ጣሪያ በላይ መሆን", nameOm: "Kiraan daangaa beeksisame caaluu", legalBasis: "Proc. Arts. 8-9; Dir. Art. 17" },
  { code: "CG-2", nameEn: "No written contract / unregistered contract", nameAm: "የጽሑፍ ውል አለመኖር / ያልተመዘገበ ውል", nameOm: "Waliin galmeffame hin qabame / galmeen hin qabne", legalBasis: "Proc. Art. 4; Dir. Art. 17" },
  { code: "CG-3", nameEn: "Advance payment demanded beyond two months", nameAm: "ከሁለት ወር በላይ የቅድመ ክፍያ ጥያቄ", nameOm: "Kaffaltii duraa ji'a lama caalaa gaafachuu", legalBasis: "Proc. Art. 12; Dir. Art. 17" },
  { code: "CG-4", nameEn: "Payment demanded outside the electronic channel", nameAm: "ክፍያ ከኤሌክትሮኒክ መንገድ ውጭ መጠየቅ", nameOm: "Kaffaltii karaa elektiroonikii alaa gaafachuu", legalBasis: "Proc. Art. 13; Dir. Art. 17" },
  { code: "CG-5", nameEn: "Unauthorized rent increase", nameAm: "ያልተፈቀደ የኪራይ ጭማሪ", nameOm: "Guddina kiraalaa hin miidhamsine", legalBasis: "Proc. Art. 9; Dir. Art. 17" },
  { code: "CG-6", nameEn: "Illegal eviction without legal ground", nameAm: "ያለሕጋዊ መንስኤ መባረር", nameOm: "Seeraan osoo hin taane qe'ebuu", legalBasis: "Proc. Art. 17; Dir. Art. 17" },
  { code: "CG-7", nameEn: "Refusal to return deposit without legal ground", nameAm: "ያለሕጋዊ መንስኤ ዋስትና አለመመለስ", nameOm: "Seeraan osoo hin taane deebii kenneef dhiisuu", legalBasis: "Proc. Arts. 15-16; Dir. Art. 17" },
  { code: "CG-8", nameEn: "Other violation of the proclamation or directive", nameAm: "ማናቸውም የአዋጁ ወይም የመመሪያው ሕገ ወጥ ተግባር", nameOm: "Kabajaa dadhabbiina ykn seera dhabbiina kamuu", legalBasis: "Proc. Arts. 29-32; Dir. Art. 17" },
];

// Electronic payment channels — Proc. Art. 13 (bank or legal electronic means)
export const ELECTRONIC_METHODS = [
  { code: "CBE_BIRR", label: "CBE Birr" },
  { code: "TELEBIRR", label: "Telebirr" },
  { code: "AMOLE", label: "Amole" },
  { code: "BANK_TRANSFER", label: "Bank Transfer" },
  { code: "M_PESA", label: "M-Pesa" },
];

// Per-city configuration set — Dir. Art. 14 (M13). Additional cities are
// added as configuration sets when the platform replicates beyond Addis.
export const CITY_CONFIGS = [
  {
    cityCode: "AA", nameEn: "Addis Ababa", nameAm: "አዲስ አበባ", nameOm: "Finfinne",
    currency: "ETB", workWeek: "MON-FRI",
    holidaysNote: "National public holidays configurable; working-day clocks exclude Sat/Sun.",
    minLeaseYears: 2, maxPrepayMonths: 2, isActive: true,
  },
  {
    cityCode: "AD", nameEn: "Adama", nameAm: "አዳማ", nameOm: "Adaamaa",
    currency: "ETB", workWeek: "MON-FRI",
    holidaysNote: "National public holidays configurable; working-day clocks exclude Sat/Sun.",
    minLeaseYears: 2, maxPrepayMonths: 2, isActive: true,
  },
  // Demo DEACTIVATED city — SaaS lifecycle showcase. Its officers are refused
  // sign-in while closed; the system admin reactivates it from City Management
  // (no data changes) and the city administrator below can then sign in.
  {
    cityCode: "DR", nameEn: "Dire Dawa", nameAm: "ድሬዳዋ", nameOm: "Dirree Dhawaa",
    currency: "ETB", workWeek: "MON-FRI",
    holidaysNote: "National public holidays configurable; working-day clocks exclude Sat/Sun.",
    minLeaseYears: 2, maxPrepayMonths: 2, isActive: false,
  },
];

// Demonstration staff accounts bound to the seeded hierarchy (M13).
// Password-less demo accounts: production deployment binds these to the
// national identity provider during Phase 5 integration testing.
export const DEMO_STAFF = [
  { staffCode: "STF-0001", fullName: "Alem Tadesse", roleCode: "WOREDA_REGISTRAR", orgUnitCode: "AA-BOLE-W01", language: "am" },
  { staffCode: "STF-0002", fullName: "Sara Bekele", roleCode: "WOREDA_STAMPER", orgUnitCode: "AA-BOLE-W01", language: "am" },
  { staffCode: "STF-0003", fullName: "Mulugeta Worku", roleCode: "SUBCITY_MONITOR", orgUnitCode: "AA-BOLE", language: "en" },
  { staffCode: "STF-0004", fullName: "Hanna Girma", roleCode: "BUREAU_ANALYST", orgUnitCode: "AA-BUREAU", language: "en" },
  { staffCode: "STF-0005", fullName: "Dawit Kebede", roleCode: "BUREAU_HEAD", orgUnitCode: "AA-BUREAU", language: "am" },
  { staffCode: "STF-0006", fullName: "Kebede Ayele", roleCode: "COMMITTEE_MEMBER", orgUnitCode: "AA-BUREAU", language: "om" },
  { staffCode: "STF-0007", fullName: "Lensa Gemeda", roleCode: "MINISTRY_ANALYST", orgUnitCode: "FED-MINISTRY", language: "en" },
  { staffCode: "STF-0008", fullName: "System Admin", roleCode: "SYSTEM_ADMIN", orgUnitCode: "FED-MINISTRY", language: "en" },
  // Adama city officers (multi-city onboarding) — bureau + woreda desks
  { staffCode: "STF-1001", fullName: "Chaltu Bekele", roleCode: "WOREDA_REGISTRAR", orgUnitCode: "AD-CENTRAL-W01", language: "om" },
  { staffCode: "STF-1002", fullName: "Tsegaye Hailu", roleCode: "WOREDA_STAMPER", orgUnitCode: "AD-CENTRAL-W01", language: "om" },
  { staffCode: "STF-1003", fullName: "Ayunni Gemmechu", roleCode: "SUBCITY_MONITOR", orgUnitCode: "AD-CENTRAL", language: "om" },
  { staffCode: "STF-1004", fullName: "Bonsa Degaga", roleCode: "BUREAU_ANALYST", orgUnitCode: "AD-BUREAU", language: "om" },
  { staffCode: "STF-1005", fullName: "Meseret Worku", roleCode: "BUREAU_HEAD", orgUnitCode: "AD-BUREAU", language: "om" },
  // Dire Dawa (demo deactivated city) — the city super-admin created with the
  // city. Sign-in is refused while DR is deactivated; works after reactivation.
  { staffCode: "STF-2001", fullName: "Fikru Mengistu", roleCode: "CITY_ADMIN", orgUnitCode: "DR-BUREAU", language: "am" },
];

// Public awareness publications — Proc. Arts. 14, 16, 18 (M11)
export const PUBLICATIONS = [
  {
    code: "PUB-AWARE-001", category: "AWARENESS",
    titleEn: "What a valid residential lease looks like", titleAm: "ትክክለኛ የመኖሪያ ቤት ውል ምን ይመስላል", titleOm: "Waliin kiraalaa dhugaa battumaa maal fakkaata",
    contentEn: "A valid lease is written on the Bureau model contract, certified at your woreda office, and registered within thirty days. Keep your certified copy; it is your legal protection.",
    contentAm: "ትክክለኛ ውል በቢሮው ሞዴል በጽሑፍ የተዘጋጀ፣ በወረዳ ጽሕፈት ቤት የተረጋገጠ እና በሰላሳ ቀን ውስጥ የተመዘገበ መሆን አለበት። የተረጋገጠውን ቅጂ ያስቀምጡ።",
    contentOm: "Waliin dhugaa waliin moodelaa Biirootiin barreeffame, waajjira woredaa keessatti mirkaneeffame, guyyaa 30 keessatti galmeeffame ta'uu qaba.",
  },
  {
    code: "PUB-AWARE-002", category: "AWARENESS",
    titleEn: "Pay your rent through the bank or legal electronic channels", titleAm: "ኪራያችሁን በባንክ ወይም በሕጋዊ ኤሌክትሮኒክ መንገድ ይክፈሉ", titleOm: "Kiraallee karaa baankii ykn elektiroonikii seera qabeessatti kaffalaa",
    contentEn: "The law requires rent to be paid only through banks or legal electronic channels. Cash payments expose both parties to penalties and are not recognized as legal rent payment.",
    contentAm: "ሕጉ ኪራይ በባንክ ወይም በሕጋዊ ኤሌክትሮኒክ መንገድ ብቻ እንዲከፈል ይጠይቃል። በጥሬ ገንዘብ ክፍያ ቅጣት ይጣላል።",
    contentOm: "Seeraan kiraalni karaa baankii ykn elektiroonikii seera qabeessa qofa akka kaffalamu barbaada.",
  },
];
