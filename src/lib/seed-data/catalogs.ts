// ============================================================================
// catalogs.ts — Seed configuration: reference catalogues (trilingual per CR-01)
// Every catalogue entry carries its legal basis. Amharic renderings of legal
// terms follow the directive's own words; Afan Oromo renderings are seeded
// with PENDING_CERTIFICATION status and fall back per NFR-06 until certified.
// ============================================================================

export const LANGUAGES = [
  {
    code: "am", nameNative: "አማርኛ", nameEn: "Amharic", direction: "ltr",
    isDefault: true, status: "ACTIVE",
    legalNote: "Working language of the Addis Ababa Directive; canonical rendering of all legal records.",
  },
  {
    code: "en", nameEn: "English", nameNative: "English", direction: "ltr",
    isDefault: false, status: "ACTIVE",
    legalNote: "Federal working language; official translation of Proclamation 1320/2016 used for traceability.",
  },
  {
    code: "om", nameNative: "Afaan Oromoo", nameEn: "Afan Oromo", direction: "ltr",
    isDefault: false, status: "ACTIVE",
    legalNote: "Added by approved change request CR-01 (owner directive 2026-09-10); UI, notifications and document generation; certified legal glossary tracked as open item O-8.",
  },
];

export const ROLES = [
  { code: "LANDLORD", nameEn: "Landlord (Akeray)", nameAm: "አከራይ", nameOm: "Kiraaleessa", tierScope: "PUBLIC", legalNote: "Proc. Arts. 4-7 duties; registration, increases, incentives." },
  { code: "TENANT", nameEn: "Tenant (Tekeray)", nameAm: "ተከራይ", nameOm: "Kiraa fudhaataa", tierScope: "PUBLIC", legalNote: "Proc. Arts. 4, 13, 20; verification, e-payment, complaints." },
  { code: "AGENT_PROXY", nameEn: "Agent / Proxy", nameAm: "ወኪል", nameOm: "Bakka bu'aa", tierScope: "PUBLIC", legalNote: "Dir. Art. 7 proxy identification and two-witness documents." },
  { code: "WITNESS", nameEn: "Witness", nameAm: "ምስክር", nameOm: "Dhugaa baatuu", tierScope: "PUBLIC", legalNote: "Model agreement: three witnesses on the executed contract." },
  { code: "WOREDA_REGISTRAR", nameEn: "Woreda Registrar / Officer", nameAm: "የወረዳ መመዝጊ", nameOm: "Galmeessaa Woredaa", tierScope: "WOREDA", legalNote: "Dir. Arts. 6-9: nine-point verification, certification, stamping, numbering." },
  { code: "WOREDA_STAMPER", nameEn: "Stamping Desk Officer", nameAm: "የማህተም ጠሪፊ", nameOm: "Ogeessa warqeeffamaa", tierScope: "WOREDA", legalNote: "Dir. Arts. 9-10: round office stamp, back-stamp annotation." },
  { code: "INTERPRETER", nameEn: "Sign-language Interpreter", nameAm: "የምልክት ቋንቋ አተረጓጎሚ", nameOm: "Hiikkaa Afaan Mallattoo", tierScope: "WOREDA", legalNote: "Dir. Art. 8(1): interpreter flow for deaf parties with association letter." },
  { code: "SUBCITY_MONITOR", nameEn: "Sub-city Monitor", nameAm: "የክፍለ ከተማ መቆጣጠሪያ", nameOm: "Ilmeecha Kutaa Magaalaa", tierScope: "SUB_CITY", legalNote: "Dir. Art. 13: aggregation and monitoring duties." },
  { code: "BUREAU_ANALYST", nameEn: "Bureau Analyst", nameAm: "የቢሮ ተንታኝ", nameOm: "Qorataa Biiroo", tierScope: "BUREAU", legalNote: "Proc. Art. 8; Dir. Art. 11: adjustment study and publication." },
  { code: "BUREAU_HEAD", nameEn: "Bureau Head", nameAm: "የቢሮ ኃላፊ", nameOm: "Hogganaa Biiroo", tierScope: "BUREAU", legalNote: "Proc. Arts. 8, 22: publication and enforcement direction." },
  { code: "COMMITTEE_MEMBER", nameEn: "Hearing Committee Member", nameAm: "የሰሚያ ኮሚቴ አባል", nameOm: "Miseensa Gargaarsa Dhageetti", tierScope: "CITY_COMMITTEE", legalNote: "Proc. Arts. 24-26: appeals heard within statutory windows." },
  { code: "MINISTRY_ANALYST", nameEn: "Ministry Analyst", nameAm: "የሚኒስትር ተንታኝ", nameOm: "Qorataa Ministeeraa", tierScope: "MINISTRY", legalNote: "Proc. Art. 18: national statistics and publication feed." },
  { code: "SYSTEM_ADMIN", nameEn: "System Administrator", nameAm: "የስርዓት አስተዳዳሪ", nameOm: "Bulchaa Sirnichaati", tierScope: "SYSTEM", legalNote: "Dir. Art. 14(4): IT system administration and configuration." },
  // SaaS layer — the city super-admin account issued automatically when a
  // city is onboarded from City Management. Full authority over ONE city.
  { code: "CITY_ADMIN", nameEn: "City Super-Administrator", nameAm: "የከተማ ዋና አስተዳዳሪ", nameOm: "Bulchaa Waggaa Magaalaa", tierScope: "BUREAU", legalNote: "City Management: full authority over ONE city — staff register, office structure, all city operations; strictly no cross-city access." },
];

export const IDENTIFICATION_TYPES = [
  { code: "ID-KEBELE", nameEn: "Kebele Identification Card", nameAm: "የቀበሌ መታወቂያ ካርድ", nameOm: "Kaardaa Addaa Baay'inaa Qaamaa (Kebele)", legalNote: "Dir. Art. 7 accepted identification list; original presented, copy attached." },
  { code: "ID-PASSPORT", nameEn: "Ethiopian Passport", nameAm: "የኢትዮጵያ ፓስፖርት", nameOm: "Passport Itoophiyaa", legalNote: "Dir. Art. 7 accepted identification list." },
  { code: "ID-FAYDA", nameEn: "Fayda National Digital ID", nameAm: "የፋይዳ ብሔራዊ ዲጂታል መታወቂያ", nameOm: "Addaa Biyyoolessaa Diijitaalaa Faydaa", legalNote: "Dir. Art. 7 accepted identification list." },
  { code: "ID-DRIVING-LICENSE", nameEn: "Driving License", nameAm: "የመንጃ ፈቃድ", nameOm: "Hayyama Konkolaachisaa", legalNote: "Dir. Art. 7 accepted identification list." },
  { code: "ID-RESIDENCE-PERMIT", nameEn: "Residence Permit (foreign nationals)", nameAm: "የመኖሪያ ፈቃድ (የውጭ አገር ዜጎች)", nameOm: "Hayyama Jireenyaa (namoota biyya alaa)", legalNote: "Dir. Art. 7 accepted identification list." },
];

export const PROPERTY_STATUS_TYPES = [
  { code: "PS-NEW", nameEn: "Newly Completed Construction", nameAm: "አዲስ የተጠናቀቀ ግንባታ", nameOm: "Ijaarama haaraa xumuraa", exemptionMonths: 48, legalBasis: "Proc. Art. 10(1): 4-year exemption clock from completion." },
  { code: "PS-VACANT", nameEn: "Vacant House (previously rented)", nameAm: "ባዶ ቤት (ቀድሞ የተከራየ)", nameOm: "Manaa duwwaa (duraan kiraaf ture)", exemptionMonths: 24, legalBasis: "Proc. Art. 10(2): 2-year exemption clock from vacancy." },
  { code: "PS-OCCUPIED", nameEn: "Occupied Residential House", nameAm: "የተረከበ መኖሪያ ቤት", nameOm: "Manaa jiraatni qabame", exemptionMonths: null, legalBasis: "Proc. Arts. 2, 10: within adjustment regime; no exemption clock." },
];

// ---------------------------------------------------------------------------
// Penalty parameters — Proc. Arts. 29-32 (3-month cap); Directive Art. 22.
// Values documented unambiguously in the approved analysis are CONFIRMED;
// offense-level ladder figures from the scanned two-column directive remain
// PENDING_OFFICIAL_TEXT (SRS open item O1) and are configurable parameters.
// ---------------------------------------------------------------------------
export const PENALTY_PARAMETERS = [
  { code: "PEN-CAP-GLOBAL", category: "GLOBAL_CAP", offenseEn: "Global administrative fine cap", offenseAm: "ከፍተኛ የአስተዳደር ቅጣት ጣሪያ", offenseOm: "Daangaa adabbii bulchiinsaa", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 3, valueMax: 3, rangeLabelEn: "3 months' rent of the affected contract", basisRef: "Proc. Arts. 29-32", confirmationStatus: "CONFIRMED" },
  { code: "PEN-UNREG-RENT", category: "OFFENSE_FINE", offenseEn: "Renting without registered written contract", offenseAm: "ያልተመዘገበ የጽሑፍ ውል ያለ ኪራይ መስጠት", offenseOm: "Kiraalee waliin galmeen hin qabne qiraassiisuu", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 3, valueMax: 3, rangeLabelEn: "Up to 3 months' rent", basisRef: "Dir. Art. 22", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-LATE-REG", category: "OFFENSE_FINE", offenseEn: "Late registration beyond the grace period", offenseAm: "ከይፈቀደው ጊዜ በላይ መዘግየት ምዝገባ", offenseOm: "Galmeessiisuu yeroo hinhedduu booda", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 1, valueMax: 3, rangeLabelEn: "Escalating; higher when delay exceeds three months", basisRef: "Dir. Art. 22; Proc. Art. 4", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-UNREG-AMEND", category: "OFFENSE_FINE", offenseEn: "Failure to register an amendment", offenseAm: "ማሻሻያ አለመመዝገብ", offenseOm: "Fooyyessaa galmeessiisuu dhabuu", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 1, valueMax: 1, rangeLabelEn: "1 month's rent", basisRef: "Dir. Art. 22", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-UNAUTH-INCREASE", category: "OFFENSE_FINE", offenseEn: "Unauthorized rent increase", offenseAm: "ያልተፈቀደ የኪራይ ጭማሪ", offenseOm: "Guddina kiraalaa hin miidhamsine", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 2, valueMax: 2, rangeLabelEn: "2 months' rent", basisRef: "Dir. Art. 22; Proc. Art. 9", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-ILLEGAL-EVICTION", category: "OFFENSE_FINE", offenseEn: "Eviction before term without legal ground", offenseAm: "ያለህጋዊ መንስኤ ከጊዜው በፊት ማባረር", offenseOm: "Seeraan osoo hin taane qe'ebuu", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 2, valueMax: 2, rangeLabelEn: "2 months' rent", basisRef: "Dir. Art. 22; Proc. Art. 17", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-EXCESS-ADVANCE", category: "OFFENSE_FINE", offenseEn: "Demanding advance payment beyond two months", offenseAm: "ከሁለት ወር በላይ የቅድመ ክፍያ ጥያቄ", offenseOm: "Kaffaltii duraa ji'a lama caalaa gaafachuu", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 2, valueMax: 2, rangeLabelEn: "2 months' rent", basisRef: "Dir. Art. 22; Proc. Art. 12", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-NOTICELESS-TERM", category: "OFFENSE_FINE", offenseEn: "Termination without statutory notice", offenseAm: "ያለህጋዊ ማሳወቂያ ውል መቋረጥ", offenseOm: "Beeksisa seeraa malee dheeraffuu", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: 3, valueMax: 3, rangeLabelEn: "3 months' rent", basisRef: "Dir. Art. 22", confirmationStatus: "PENDING_OFFICIAL_TEXT" },
  { code: "PEN-CASH-PAYMENT", category: "REFERRAL_RULE", offenseEn: "Tenant paying outside bank / legal electronic channel", offenseAm: "ከባንክ ወይም ከሕጋዊ ኤሌክትሮኒክ መንገድ ውጭ ክፍያ", offenseOm: "Karaa baankii ykn elektiroonikii seera qabeessa alaa kaffaluu", valueType: "PERCENT_PER_CASH_PAYMENT", valueMin: 10, valueMax: 10, rangeLabelEn: "10 percent of one month's rent per cash payment", basisRef: "Dir. Art. 22; Proc. Art. 13", confirmationStatus: "CONFIRMED" },
  { code: "PEN-VAC-5", category: "SURCHARGE_BAND", offenseEn: "Vacancy without service 1-2 years", offenseAm: "አገልግሎት ያለበለዚህ ባዶነት 1-2 ዓመት", offenseOm: "Tajaajila malee duwwaa waggaa 1-2", valueType: "PERCENT", valueMin: 5, valueMax: 5, rangeLabelEn: "5 percent surcharge", basisRef: "Dir. Art. 22(8-9)", confirmationStatus: "CONFIRMED" },
  { code: "PEN-VAC-10", category: "SURCHARGE_BAND", offenseEn: "Vacancy without service above 2-3 years", offenseAm: "አገልግሎት ያለበለዚህ ባዶነት ከ2-3 ዓመት በላይ", offenseOm: "Tajaajila malee duwwaa waggaa 2-3 ol", valueType: "PERCENT", valueMin: 10, valueMax: 10, rangeLabelEn: "10 percent surcharge", basisRef: "Dir. Art. 22(8-9)", confirmationStatus: "CONFIRMED" },
  { code: "PEN-VAC-15", category: "SURCHARGE_BAND", offenseEn: "Vacancy without service above 3-4 years", offenseAm: "አገልግሎት ያለበለዚህ ባዶነት ከ3-4 ዓመት በላይ", offenseOm: "Tajaajila malee duwwaa waggaa 3-4 ol", valueType: "PERCENT", valueMin: 15, valueMax: 15, rangeLabelEn: "15 percent surcharge", basisRef: "Dir. Art. 22(8-9)", confirmationStatus: "CONFIRMED" },
  { code: "PEN-VAC-20", category: "SURCHARGE_BAND", offenseEn: "Vacancy without service above 4-5 years", offenseAm: "አገልግሎት ያለበለዚህ ባዶነት ከ4-5 ዓመት በላይ", offenseOm: "Tajaajila malee duwwaa waggaa 4-5 ol", valueType: "PERCENT", valueMin: 20, valueMax: 20, rangeLabelEn: "20 percent surcharge", basisRef: "Dir. Art. 22(8-9)", confirmationStatus: "CONFIRMED" },
  { code: "PEN-VAC-25", category: "SURCHARGE_BAND", offenseEn: "Vacancy without service above 5 years", offenseAm: "አገልግሎት ያለበለዚህ ባዶነት ከ5 ዓመት በላይ", offenseOm: "Tajaajila malee duwwaa waggaa 5 ol", valueType: "PERCENT", valueMin: 25, valueMax: 25, rangeLabelEn: "25 percent surcharge", basisRef: "Dir. Art. 22(8-9)", confirmationStatus: "CONFIRMED" },
];

// ---------------------------------------------------------------------------
// Annual adjustment calendar — Proc. Art. 8; Dir. Art. 11
// ---------------------------------------------------------------------------
export const CALENDAR_EVENTS = [
  { code: "CAL-JUN1-PUBLICATION", nameEn: "Rent ceiling rates published", nameAm: "የኪራይ ጣሪያ ዋጋዎች መታወቅ", nameOm: "Gatii daangaa kiraalaa beeksisu", month: 6, day: 1, windowDays: null, legalBasis: "Proc. Art. 8: rates published every June 1.", description: "Bureau publishes adjusted ceiling rates city-wide and feeds the public portal." },
  { code: "CAL-JUN30-EFFECT", nameEn: "New ceiling rates take effect", nameAm: "አዳዲስ የኪራይ ጣሪያ ዋጋዎች ሥራ ላይ መዋል", nameOm: "Gatiin haaraa hoii seera qabeessa kan seenu", month: 6, day: 30, windowDays: null, legalBasis: "Proc. Art. 8: effect every June 30.", description: "Adjustment engine switches active rate set; existing contracts updated per law." },
  { code: "CAL-PRE-EFFECT-CHECK", nameEn: "Pre-effect amendment registration check", nameAm: "ከሥራ ላይ መዋሉ በፊት የማሻሻያ ምዝገባ ፍተሻ", nameOm: "Osoo hin hoii seenin fooyyessaa galmeessuu mirkaneessuu", month: 6, day: 1, windowDays: 29, legalBasis: "Dir. Art. 11: amendment registration check before effect.", description: "Woredas verify pending amendments against the incoming rate set during the June window." },
  { code: "CAL-AMENDMENT-WINDOW", nameEn: "Amendment registration window (30 working days)", nameAm: "የማሻሻያ ምዝገባ መስኮት (30 የሥራ ቀናት)", nameOm: "Yeroo galmeessuu fooyyessaa (guyyaa hojii 30)", month: 6, day: 30, windowDays: 30, legalBasis: "Proc. Arts. 6, 7; Dir. Art. 10: 30-day amendment registration window.", description: "Parties register rate-affected amendments within the statutory window after effect." },
];
