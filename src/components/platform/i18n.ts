// ============================================================================
// i18n.ts — Trilingual UI dictionary (CR-01 / NFR-06). Amharic legal terms
// follow the directive's own words; Afan Oromo strings carry PENDING
// CERTIFICATION status and fall back to English per the SRS fallback rule
// until the certified glossary (open item O-8) lands.
// ============================================================================
import type { Lang } from "./types";

type Dict = Record<string, [string, string, string]>; // [en, am, om]

const D: Dict = {
  // shell
  "app.title": ["Residential Rent Control & Administration Platform", "የመኖሪያ ቤት ኪራይ ቁጥጥር እና አስተዳደር መድረክ", "Meeshaa Too'annaa fi Bulchiinsa Kiraalaa Manaa"],
  "app.subtitle": ["Proclamation 1320/2016 · Directive 7/2016 · Model Agreement", "አዋጅ 1320/2016 · መመሪያ 7/2016 · ሞዴል ውል", "Labsii 1320/2016 · Qajeelfama 7/2016 · Waliin Moodelaa"],
  "nav.overview": ["Overview", "አጠቃላይ እይታ", "Ilaalcha Waliigalaa"],
  "nav.admin": ["S1 · Admin (M13)", "S1 · አስተዳደር (M13)", "S1 · Bulchiinsa (M13)"],
  "nav.parties": ["S1 · Parties (M1)", "S1 · ወገኖች (M1)", "S1 · Daawwattoota (M1)"],
  "nav.assets": ["S2 · Properties & Contract (M2, M3)", "S2 · ንብረት እና ውል (M2, M3)", "S2 · Qabeenya fi Waliin (M2, M3)"],
  "nav.registration": ["S3 · Registration (M4)", "S3 · ምዝገባ (M4)", "S3 · Galmeessuu (M4)"],
  "nav.rent": ["S4 · Rent & Payments (M5, M6)", "S4 · ኪራይ እና ክፍያ (M5, M6)", "S4 · Kiraalaa fi Kaffaltii (M5, M6)"],
  "nav.disputes": ["S5 · Complaints (M8, M12)", "S5 · ቅስቀሳ (M8, M12)", "S5 · Ogeessuu (M8, M12)"],
  "nav.enforcement": ["S6 · Control & Penalties (M7, M9)", "S6 · ቁጥጥር እና ቅጣት (M7, M9)", "S6 · To'annaa fi Adabbii (M7, M9)"],
  "nav.data": ["S7 · Data & Reports (M10, M11)", "S7 · ዳታ እና ሪፖርት (M10, M11)", "S7 · Daataa fi Gabaasa (M10, M11)"],
  "nav.dashboard": ["Dashboard", "ዳሽቦርድ", "Gabatee Dalallaa"],
  "nav.settings": ["City Settings", "የከተማ ቅንብሮች", "Qindaa'ina Magaalaa"],
  "nav.cities": ["City Management", "የከተማ አስተዳደር", "Bulchiinsa Magaalota"],
  "nav.management": ["National Management", "ብሔራዊ አስተዳደር", "Bulchiinsa Biyyoolessummaa"],
  "nav.audit": ["Audit Trail", "የኦዲት መከታተያ", "Hordoffii Inspektii"],
  // National Management tabs (Task 37 link-first IA)
  "nat.tab.overview": ["Overview", "አጠቃላይ እይታ", "Ilaalcha Waliigalaa"],
  "nat.tab.cities": ["Cities", "ከተሞች", "Magaalota"],
  "nat.tab.regulations": ["Regulations", "ደንቦች", "Seeraalee"],
  "nat.tab.contracts": ["Model contracts", "ሞዴል ውሎች", "Waliinoota Moodelaa"],
  "nav.evidence_p": ["Evidence & Gates", "ማስረጃዎች እና ጌቶች", "Ragaafi fi Dalaloota"],
  "nav.group.overview": ["Overview", "አጠቃላይ", "Ilaalcha"],
  "nav.group.registry": ["Registry", "ምዝገባ", "Galmee"],
  "nav.group.operations": ["Operations", "ሥራዎች", "Hojiiwwan"],
  "nav.group.insights": ["Insights", "ትንተና", "Hubannoo"],
  "nav.group.admin": ["Administration", "አስተዳደር", "Bulchiinsa"],
  "nav.group.project": ["Project tools", "የፕሮጀክት መሣሪያዎች", "Meeyeessa Projektii"],
  "shell.city": ["City", "ከተማ", "Magaalaa"],
  "shell.signout": ["Sign out", "ውጣ", "Ba'i"],
  "shell.signedinas": ["Signed in as", "በስም ገብተዋል", "Hirmaataa ta'anii"],
  "login.title": ["Officer sign-in", "የባለሙያ መግቢያ", "Seensa Ogeessaa"],
  "login.subtitle": ["Pick your city, pick your name, enter your staff code.", "ከተማዎን፣ ስምዎን ይምረጡ፣ የሠራተኛ ኮድዎን ያስገቡ።", "Magaalaa keessan, maqaa keessan filadhaa; koodii hojjetaa keessan galchi."],
  "login.staffcode": ["Staff code", "የሠራተኛ ኮድ", "Koodii Hojjetaa"],
  "login.signin": ["Sign in", "ግባ", "Seeni"],
  "login.hint": ["Demo codes: STF-0001 woreda registrar · STF-0005 bureau head · STF-0007 ministry · STF-0008 system admin", "የሙከራ ኮዶች፦ STF-0001 …", "Koodii demo: STF-0001 …"],
  "nav.evidence": ["Evidence & Gates", "ማስረጃዎች እና ጌቶች", "Ragaafi fi Dalaloota"],
  "nav.p5": ["P5 · Testing & Compliance", "P5 · ሙከራ እና ሕጋዊነት", "P5 · Qormaata fi Seera-qabeenya"],
  "nav.p6": ["P6 · UAT & Legal Validation", "P6 · የተጠቃሚ ተቀባይነት እና ሕጋዊ ማረጋገጫ", "P6 · Simannaa Fayyadamaa fi Mirkaneessa Seeraa"],
  "nav.p7": ["P7 · Migration, Training & Pilot", "P7 · ወደ ስርዓቱ ዝውውር፣ ሥልጠና እና የሙከራ አፈጻጸም", "P7 · Godaansa, Qajeelfama fi Hojjetaa Muuxannoo"],
  "nav.p8": ["P8 · Go-Live & Operations", "P8 · መጀመሪያ አፈጻጸም እና አሠራር", "P8 · Jalqaba Hojii fi Bulchiinsa"],
  // common
  "act.create": ["Create", "መዝግብ", "Uumi"],
  "act.save": ["Save", "አስቀምጥ", "Olkaa'i"],
  "act.verify": ["Verify", "አረጋግጥ", "Mirkaneessi"],
  "act.reject": ["Reject", "አትቀበል", "Dhiisi"],
  "act.submit": ["Submit", "አስገባ", "Galchi"],
  "act.publish": ["Publish", "አውጣ", "Beeksisi"],
  "act.effect": ["Take effect", "ሥራ ላይ ውላል", "Hoii seeni"],
  "act.run": ["Run", "አሂድ", "Hoiji"],
  "state.status": ["Status", "ሁኔታ", "Haala"],
  "state.empty": ["No records yet.", "እስካሁን መዝገብ የለም።", "Galmeen hin jiru."],
  "state.loading": ["Loading platform state…", "የመድረክ ሁኔታ በመጫን ላይ…", "Haala meeshaa fe'ufu…"],
  "lang.fallback": ["Afan Oromo rendering pending certification (O-8); showing English.", "የአፋን ኦሮሞ አነጋገር በማረጋገጫ ላይ (O-8)፤ እንግሊዝኛ ይታያል።", "Hiikni Afaan Oromoo ragaa fi qeeqeeffamaa jira (O-8); Afaan Inglizii agarsiifama."],
};

export function t(key: string, lang: Lang): string {
  const row = D[key];
  if (!row) return key;
  return lang === "en" ? row[0] : lang === "am" ? row[1] : row[2];
}
