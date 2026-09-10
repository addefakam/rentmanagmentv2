// ============================================================================
// types.ts — Shared types for the Phase 3 console (serialized for client).
// ============================================================================

export interface LangState {
  lang: "am" | "en" | "om";
  setLang: (l: "am" | "en" | "om") => void;
}

export interface EnvironmentRow {
  name: string; stage: string; purpose: string; database: string;
  appUrl: string | null; backupScheme: string; replicationTarget: string | null;
  rpoMinutes: number | null; rtoHours: number | null; restoreDrill: string | null;
  notes: string | null;
}

export interface SubCityRow {
  code: string; nameEn: string; nameAm: string; nameOm: string;
  woredaCount: number; basis: string; note: string; woredaCodes: string[];
}

export interface CatalogRow {
  code: string; nameEn: string; nameAm: string; nameOm: string; extra?: string | null;
}

export interface PenaltyRow {
  code: string; category: string; offenseEn: string; offenseAm: string; offenseOm: string;
  rangeLabelEn: string | null; basisRef: string; confirmationStatus: string;
}

export interface EventRow {
  code: string; nameEn: string; nameAm: string; nameOm: string;
  month: number; day: number; windowDays: number | null; legalBasis: string; description: string | null;
}

export interface ContractSectionRow {
  orderNo: number; code: string; titleEn: string; titleAm: string; titleOm: string;
  contentEn: string | null; contentAm: string | null; contentOm: string | null;
  legalBasis: string | null; certificationStatus: string;
}

export interface ResourceRow {
  key: string; domain: string; valueAm: string; valueEn: string; valueOm: string;
  certificationStatus: string;
}

export interface LanguageRow {
  code: string; nameNative: string; nameEn: string; isDefault: boolean; status: string; legalNote: string | null;
}

export interface StepRow {
  orderNo: number; stage: string; name: string; status: string;
  detail: string | null; durationMs: number | null;
  checks: { name: string; passed: boolean; severity: string; expected: string; actual: string }[];
}

export interface ReleaseRow {
  tag: string; status: string; startedAt: string; completedAt: string | null; notes: string | null;
  steps: StepRow[];
}

export interface Stats {
  ministries: number; bureaus: number; subCities: number; woredas: number;
  roles: number; idTypes: number; statuses: number; penalties: number;
  events: number; languages: number; resources: number; sections: number; environments: number;
}
