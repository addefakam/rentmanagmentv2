// ============================================================================
// orgTree.ts — Seed configuration: organizational hierarchy
// Directive 7/2016 Arts. 2, 6, 13: Woreda front desk -> Sub-city -> City
// Bureau, under the Federal Ministry. Registration happens in the woreda
// where the house is located; data aggregates upward to the Ministry.
//
// SOURCES (researched 2026-09-10):
//  - 11 sub-cities incl. Lemi Kura (11th, established Oct 2020 from Bole and
//    Yeka woredas): Addis Ababa City Administration restructure, Amharic press.
//  - Official city-wide woreda total: 118 (2025 published study).
//  - Federal regions/woredas enumeration anchors: Arada 10; Bole >= 14;
//    Yeka >= 12 (pre-restructure federal list).
//  - Lemi Kura >= 13 woredas by 2025 (U.S. Embassy Addis Ababa address format).
// Per-sub-city counts not fixed by an anchor are PROVISIONAL parameters and
// carry confirmationStatus PENDING_OFFICIAL_REGISTER (open item O-7). They are
// configurable seed values, never code constants, and are reconciled against
// the official establishment register before pilot go-live (Phase 7).
// ============================================================================

export interface WoredaSeedSpec {
  count: number;
  basis: "FEDERAL_LIST_ANCHOR" | "DOCUMENTED_MINIMUM" | "PROVISIONAL";
  note: string;
}

export interface SubCitySeedSpec {
  code: string;
  nameEn: string;
  nameAm: string;
  nameOm: string;
  woredas: WoredaSeedSpec;
}

export const MINISTRY = {
  code: "FED-MINISTRY",
  nameEn: "Federal Ministry - Housing and Urban Development Portfolio",
  nameAm: "ፌዴራል ሚኒስትር - የቤቶችና ከተማ ልማት ዘርፍ",
  nameOm: "Ministirri Federaalaa - Daalaccii Magaalaalee fi Guddina Magaalaati",
};

export const BUREAU = {
  code: "AA-BUREAU",
  nameEn: "Addis Ababa City Administration - Rent Control and Administration Bureau",
  nameAm: "የአዲስ አበባ ከተማ አስተዳደር - የመኖሪያ ቤት ኪራይ መቆጣጠርና አስተዳደር ቢሮ",
  nameOm: "Bulchiinsa Magaalaa Addis Ababa - Waajjira To'annaa fi Bulchiinsa Kiraalee Manneen Jireenyaa",
};

// 8 + 10 + 10 + 14 + 10 + 10 + 12 + 9 + 10 + 12 + 13 = 118 (matches the
// sourced 2025 official city-wide total).
export const SUB_CITIES: SubCitySeedSpec[] = [
  {
    code: "AA-ADDIS-KETEMA", nameEn: "Addis Ketema Sub-city", nameAm: "አዲስ ከተማ ክፍለ ከተማ", nameOm: "Addis Ketemaa",
    woredas: { count: 8, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-AKAKY-KALITI", nameEn: "Akaky Kaliti Sub-city", nameAm: "አቃቂ ቃሊቲ ክፍለ ከተማ", nameOm: "Aqaqi Qalitii",
    woredas: { count: 10, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-ARADA", nameEn: "Arada Sub-city", nameAm: "አራዳ ክፍለ ከተማ", nameOm: "Aradaa",
    woredas: { count: 10, basis: "FEDERAL_LIST_ANCHOR", note: "Derived from federal regions/woredas enumeration anchors (Arada W01-W10)." },
  },
  {
    code: "AA-BOLE", nameEn: "Bole Sub-city", nameAm: "ቦሌ ክፍለ ከተማ", nameOm: "Boolee",
    woredas: { count: 14, basis: "DOCUMENTED_MINIMUM", note: "Federal list documents Bole Wereda 01-14; upper bound subject to O-7 reconciliation." },
  },
  {
    code: "AA-GULLELE", nameEn: "Gullele Sub-city", nameAm: "ጉለሌ ክፍለ ከተማ", nameOm: "Gullelee",
    woredas: { count: 10, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-KIRKOS", nameEn: "Kirkos Sub-city", nameAm: "ቂርቆስ ክፍለ ከተማ", nameOm: "Kirqos",
    woredas: { count: 10, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-KOLFE-KERANIO", nameEn: "Kolfe Keranio Sub-city", nameAm: "ኮልፌ ቀራንዮ ክፍለ ከተማ", nameOm: "Kolfe Qeranyo",
    woredas: { count: 12, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-LIDETA", nameEn: "Lideta Sub-city", nameAm: "ልደታ ክፍለ ከተማ", nameOm: "Lidetaa",
    woredas: { count: 9, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-NIFAS-SILK-LAFTO", nameEn: "Nifas Silk-Lafto Sub-city", nameAm: "ንፋስ ስልክ ላፍቶ ክፍለ ከተማ", nameOm: "Nifas Silk Laftoo",
    woredas: { count: 10, basis: "PROVISIONAL", note: "Provisional parameter; reconciled via O-7." },
  },
  {
    code: "AA-YEKA", nameEn: "Yeka Sub-city", nameAm: "ያካ ክፍለ ከተማ", nameOm: "Yekaa",
    woredas: { count: 12, basis: "DOCUMENTED_MINIMUM", note: "Federal list documents Yeka Subcity Wereda 12; subject to O-7 reconciliation." },
  },
  {
    code: "AA-LEMI-KURA", nameEn: "Lemi Kura Sub-city", nameAm: "ለሚ ኩራ ክፍለ ከተማ", nameOm: "Lemii Kuraa",
    woredas: { count: 13, basis: "DOCUMENTED_MINIMUM", note: "11th sub-city (est. Oct 2020 from Bole and Yeka woredas, 9 woredas at establishment, later expanded); Woreda 13 documented in 2025 addresses; subject to O-7 reconciliation." },
  },
];

export const OFFICIAL_WOREDA_TOTAL = 118; // Sourced: 2025 published city study

export function totalConfiguredWoredas(): number {
  return SUB_CITIES.reduce((sum, sc) => sum + sc.woredas.count, 0);
}

// ---------------------------------------------------------------------------
// Multi-city: Dire Dawa Administration — seeded DEACTIVATED. This city
// demonstrates the SaaS city lifecycle end to end: it appears in City
// Management as CLOSED, its officers cannot sign in while deactivated, and
// the system admin can reactivate it (after which its city administrator
// signs in with the staff code below). Reactivation needs no data changes —
// the subtree, config and model contract are all in place.
// ---------------------------------------------------------------------------
export const DIRE_DAWA_BUREAU = {
  code: "DR-BUREAU",
  nameEn: "Dire Dawa Administration Rent Control Bureau",
  nameAm: "የድሬዳዋ አስተዳደር የቤት ኪራይ ቁጥጥር ቢሮ",
  nameOm: "Bu'aa Too'annaa Kiraalaa Manaa Bulchiinsa Dirree Dhawaa",
};

export const DIRE_DAWA_SUB_CITIES: SubCitySeedSpec[] = [
  {
    code: "DR-CENTRAL", nameEn: "Dire Dawa Central Sub-city", nameAm: "ድሬዳዋ ማዕከላዊ ክፍለ ከተማ", nameOm: "Dirree Dhawaa Giddugaleessa",
    woredas: { count: 2, basis: "PROVISIONAL", note: "Demo deactivated city: minimal structure pending the city's own onboarding request." },
  },
];
