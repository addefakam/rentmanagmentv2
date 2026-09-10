// ============================================================================
// modelContract.ts — Seed configuration: Model Rental Agreement v1.0
// Proclamation Art. 5; Directive Art. 4 (Bureau amends and distributes).
// Canonical legal rendering: Amharic (the directive's own words). English and
// Afan Oromo renderings are working translations pending certification
// (CR-01 + NFR-06 fallback rule). Legal constraints encoded: minimum 2-year
// term (Proc. Art. 6), advance capped at 2 months (Proc. Art. 12),
// electronic-only payment (Proc. Art. 13), three witnesses + certification.
// ============================================================================

export const MODEL_CONTRACT_V1 = {
  version: "1.0",
  status: "ACTIVE",
  issuedBy: "Addis Ababa City Administration, Rent Control and Administration Bureau",
  legalBasis: "Proc. Art. 5; Dir. Art. 4; annexed Model Agreement of Directive 7/2016",
  canonicalLang: "am",
  effectiveFrom: "2026-09-10",
};

export interface ContractSectionSpec {
  orderNo: number;
  code: string;
  titleEn: string;
  titleAm: string;
  titleOm: string;
  contentEn: string;
  contentAm: string;
  contentOm: string;
  legalBasis: string;
}

// Amharic content lines are directive-anchored summary clauses used by the
// contract studio for validation; the authoritative full Amharic text is the
// annexed model agreement itself.
export const CONTRACT_SECTIONS: ContractSectionSpec[] = [
  {
    orderNo: 1, code: "SEC-PARTIES",
    titleEn: "Parties to the Contract", titleAm: "የውል ወገኖች", titleOm: "Walitti dhufeenya qindaa'inaa (Gootota Waliigalaa)",
    contentEn: "Identification of landlord and tenant (or their proxies) with name, identification type and number, and address, exactly as verified at the woreda office.",
    contentAm: "አከራዩና ተከራዩ (ወይም ወኪሎቻቸው) ሙሉ ስም፣ የመታወቂያ አይነትና ቁጥር፣ እና አድራሻ በወረዳ ቢሮ ማረጋገጫ መሠረት ይመዝገባሉ።",
    contentOm: "Maqaa, gosaaddaa lakkoofsaa addaa baay'inaa qaamaa, fi teessoo kiraaleessaa fi kiraa fudhaataa (ykn bakka bu'aa isaanii) akka ragaa worediin mirkaneesse galmeefama.",
    legalBasis: "Model Agreement Part 1; Dir. Art. 7",
  },
  {
    orderNo: 2, code: "SEC-PROPERTY",
    titleEn: "Description and Condition of the Rented House", titleAm: "የተከራየው ቤት መግለጫና ሁኔታ", titleOm: "Ibsa fi Haala Mana Kiraalee",
    contentEn: "The house is described by address (sub-city, woreda), area, rooms, and its status: newly completed construction, vacant, or occupied, which drives the exemption clock.",
    contentAm: "ቤቱ በአድራሻ (ክፍለ ከተማ፣ ወረዳ)፣ በስፋት፣ በክፍል ቁጥር፣ እና በሁኔታው (አዲስ የተጠናቀቀ፣ ባዶ፣ የተረከበ) ይገለጻል፤ ሁኔታው የይበዛና ዘመን ማስላት ይወስናል።",
    contentOm: "Mana nyyata teessoo (kutaa magaalaa, woreda), bal'ina, lakkoofsa kutaa, fi haalaan (ijaarama haaraa, duwwaa, qabame) ibbama; haalli saanduqa yeroo ittiin bahu murteessa.",
    legalBasis: "Model Agreement Part 2; Proc. Art. 10",
  },
  {
    orderNo: 3, code: "SEC-TERM",
    titleEn: "Lease Term", titleAm: "የኪራይ ዘመን", titleOm: "Yeroo Kiraalee",
    contentEn: "The term of the lease is not less than two years. Shorter terms are not valid for residential houses under this proclamation.",
    contentAm: "የኪራይ ዘመን ከሁለት ዓመት አይቀንስም። ከዚህ በታች የሆነ ዘመን በዚህ አዋጅ ሥር ለመኖሪያ ቤት ልክ የሚባል አይደለም።",
    contentOm: "Yeroon kiraalee waggaa lama gadi hin buusu. Yeroon kanaan gadi ta'e mansiin jireenyaa kana jalatti seera qabaachaa hin qabu.",
    legalBasis: "Proc. Art. 6 (minimum 2-year term)",
  },
  {
    orderNo: 4, code: "SEC-RENT",
    titleEn: "Rent Amount and Payment", titleAm: "የኪራይ መጠንና ክፍያ", titleOm: "Bay'innaa fi Kaffaltii Kiraalaa",
    contentEn: "The monthly rent is stated in birr and may not exceed the published ceiling. Payment is made only through bank transfer or legal electronic channel; the system records each payment and issues a receipt.",
    contentAm: "ወርሃዊ ኪራይ በብር ይጠቀሳል፤ ከታተመው ጣሪያ ዋጋ በላይ መሆን አይችልም። ክፍያ በባንክ ወይም በሕጋዊ ኤሌክትሮኒክ መንገድ ብቻ ይከፈላል፤ ሥርዓቱ እያንዳንዱን ክፍያ ይመዝግብና ደረሰኝ ይሰጣል።",
    contentOm: "Kiraan ji'aa qarshiin ni kaafama; gatii daangaa maxxanfame caalaa hin ta'u. Kaffaltiin karaa baankii ykn karaa elektiroonikii seera qabeessa qofaani kaffalama; sirni tokkoon tokkoo kaffaltii galmeessuu fi ragaa kaffaltii kenna.",
    legalBasis: "Proc. Arts. 8, 13 (electronic-only payment)",
  },
  {
    orderNo: 5, code: "SEC-ADVANCE",
    titleEn: "Advance Payment", titleAm: "የቅድመ ክፍያ", titleOm: "Kaffaltii Duraa",
    contentEn: "Advance payment demanded from the tenant may not exceed two months' rent.",
    contentAm: "ከተከራዩ የሚጠየቅ የቅድመ ክፍያ ከሁለት ወር ኪራይ በላይ መሆን አይችልም።",
    contentOm: "Kaffaltiin duraa kiraa fudhaataa irratti gaafatamu ji'a lama caalaa hin ta'u.",
    legalBasis: "Proc. Art. 12 (2-month advance cap)",
  },
  {
    orderNo: 6, code: "SEC-OBLIGATIONS",
    titleEn: "Rights and Obligations of the Parties", titleAm: "የወገኖቹ መብትና ግዴታ", titleOm: "Mirga fi Dirqama Gootota",
    contentEn: "The landlord keeps the house habitable and lawful; the tenant uses the house for residence, pays on time, and observes the contract; both follow the proclamation and the directive.",
    contentAm: "አከራዩ ቤቱ ለመኖር በሚስማማ ሁኔታና በሕግ እንዲሆን ያደርጋል፤ ተከራዩ ቤቱን ለመኖሪያነት ይጠቀማል፣ በጊዜው ይከፍላል፣ ውሉን ይከተላል፤ ሁለቱም አዋጁንና መመሪያውን ይከተላሉ።",
    contentOm: "Kiraaleessi mana nyyata jireenyaaf gahaa fi seeraan ta'u taasisa; kiraa fudhaataan mana nyyata jireenyaf fayyada, yerootti kaffala, waliigalaa kabadha; lamaanuu labsii fi qajeelfama kabadhu.",
    legalBasis: "Model Agreement Part 6; Proc. Arts. 14-17",
  },
  {
    orderNo: 7, code: "SEC-AMENDMENT",
    titleEn: "Amendments to the Contract", titleAm: "የውል ማሻሻያ", titleOm: "Fooyyessa Waliigalaa",
    contentEn: "Any amendment to rent, term or parties is made in writing and registered within thirty working days of effect; unregistered amendments do not take legal effect.",
    contentAm: "በኪራይ፣ በዘመን ወይም በወገኖች ላይ የሚደረግ ማንኛውም ማሻሻያ በጽሑፍ ሆኖ ከሥራ ላይ ከዋለ በኋላ በ30 የሥራ ቀናት ውስጥ ይመዘገባል፤ ያልተመዘገበ ማሻሻያ የሕግ ተግባር አይኖረውም።",
    contentOm: "Fooyyessi kiraalaa, yeroo ykn gootota irratti ta'e qindaa'inaa waliin barreeffamee hoii seera qabeessa seenee booda guyyaa hojii 30 keessatti galmeefama; fooyyessi galmeen hin qabne bu'aa seera qabaachaa hin qabaatu.",
    legalBasis: "Proc. Arts. 6, 7; Dir. Art. 10 (30-day window)",
  },
  {
    orderNo: 8, code: "SEC-DISPUTE",
    titleEn: "Dispute Settlement", titleAm: "የክርክር መፍትሔ", titleOm: "Furmaata Wal Dhabbiinsaa",
    contentEn: "Complaints go first to the woreda office for settlement within thirty working days; appeals lie to the hearing committee within fifteen days of the decision; final administrative decisions are appealable to the courts.",
    contentAm: "ይግባኝ በመጀመሪያ በወረዳ ቢሮ በ30 የሥራ ቀናት ውስጥ ለመፍታት ይቀርባል፤ ውሳኔውን ከተሰጠ በ15 ቀናት ውስጥ ወደ ሰሚያ ኮሚቴ ይገባል፤ የመጨረሻ የአስተዳደር ውሳኔ ወደ ፍርድ ቤት ሊጠየቅ ይችላል።",
    contentOm: "Wal dhabbiinsi dura woreda keessatti guyyaa hojii 30 keessatti furmaata argata; murteessiin kennaa booda guyyaa 15 keessatti gara gargaarsa dhageettiatti darba; murteessiin bulchiinsa dhumaarraa courtitti darbuu danda'a.",
    legalBasis: "Proc. Arts. 20-26; Dir. Arts. 17-19",
  },
  {
    orderNo: 9, code: "SEC-WITNESSES",
    titleEn: "Witnesses", titleAm: "ምስክሮች", titleOm: "Dhugaa Baatoota",
    contentEn: "The contract is signed before three witnesses who write their names and identification numbers.",
    contentAm: "ውሉ የሚታረሰው በሦስት ምስክሮች ፊት ሲሆን ምስክሮቹ ስማቸውንና የመታወቂያ ቁጥራቸውን ይጽፋሉ።",
    contentOm: "Waliigalaan dura dhugaa baatoota sadiitti mallatteefama; dhugaa baatoonni maqaa isaanii fi lakkoofsa addaa baay'inaa qaamaa isaanii barreessu.",
    legalBasis: "Model Agreement signature block (three witnesses)",
  },
  {
    orderNo: 10, code: "SEC-CERTIFICATION",
    titleEn: "Woreda Office Certification", titleAm: "የወረዳ ቢሮ ምስክርነት", titleOm: "Mirkaneessa Waajjira Woredaa",
    contentEn: "The registrar certifies free will and signatures, verifies copies against originals, numbers attached documents, applies the round office stamp, assigns the contract number, and records the contract in the registry book and the database.",
    contentAm: "መመዝጊው ነጻ ፈቃድና ፊርማዎችን ያረጋግጣል፣ ቅጂዎችን ከዋናው ጋር ያነጻጽራል፣ የተያያዙ ሰነዶችን ያቁጥራል፣ ዙራድ የቢሮ ማህተም ይጫናል፣ የውል ቁጥር ይሰጣል፣ ውሉንም በመዝገብ መጽሐፍና በኮምፒውተር ዳታቤዝ ይመዝግባል።",
    contentOm: "Galmeessaan fedhii bilisaa fi mallatteewwan mirkaneessa, warabbiiwwan waliin qabeenyaan wal bira qaba, faayilota cufaman lakkoofsa, warqee waajjiraa suuqa, lakkoofsa waliigalaa kenna, waliigalichas galmeessuu fi daataabeessitti galmeessa.",
    legalBasis: "Dir. Arts. 8-10 (registrar certification acts)",
  },
];

export const CONTRACT_CERT_NOTE = {
  am: "CERTIFIED_AM — canonical legal rendering follows the annexed model agreement text",
  en: "PENDING_LEGAL_REVIEW — working translation of the Amharic model agreement",
  om: "PENDING_LEGAL_REVIEW — Afan Oromo rendering to be certified by the Bureau legal team (CR-01 / O-8)",
};
