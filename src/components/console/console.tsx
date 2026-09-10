"use client";

// ============================================================================
// console.tsx — Phase 3 console shell: trilingual header (CR-01), tabs, and
// panels. All UI labels render from the seeded LocalizationResource table, so
// the console itself demonstrates the seeded trilingual configuration.
// ============================================================================

import { useMemo, useState } from "react";
import {
  EnvironmentRow, SubCityRow, CatalogRow, PenaltyRow, EventRow,
  ContractSectionRow, ResourceRow, LanguageRow, ReleaseRow, Stats,
} from "./types";
import { EnvironmentsPanel, ConfigurationPanel, PromotionPanel, EvidencePanel, OverviewPanel } from "./panels";

export interface ConsoleData {
  stats: Stats;
  environments: EnvironmentRow[];
  subCities: SubCityRow[];
  roles: CatalogRow[];
  idTypes: CatalogRow[];
  statuses: CatalogRow[];
  penalties: PenaltyRow[];
  events: EventRow[];
  sections: ContractSectionRow[];
  resources: ResourceRow[];
  languages: LanguageRow[];
  officialWoredaTotal: number;
  latestRelease: ReleaseRow | null;
}

export type Lang = "am" | "en" | "om";

export function pickName(lang: Lang, e: { nameEn: string; nameAm: string; nameOm: string }): string {
  return lang === "am" ? e.nameAm : lang === "om" ? (e.nameOm || e.nameEn) : e.nameEn;
}

export default function Console({ data }: { data: ConsoleData }) {
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<"overview" | "environments" | "config" | "promotion" | "evidence">("overview");

  const labels = useMemo(() => {
    const m = new Map<string, { am: string; en: string; om: string }>();
    for (const r of data.resources) m.set(r.key, { am: r.valueAm, en: r.valueEn, om: r.valueOm });
    return m;
  }, [data.resources]);

  const t = (key: string, fallback: string): string => {
    const r = labels.get(key);
    if (!r) return fallback;
    return lang === "am" ? r.am : lang === "om" ? (r.om || r.en) : r.en;
  };

  const langOptions: { code: Lang; label: string }[] = data.languages
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((l) => ({ code: l.code as Lang, label: l.nameNative }));

  const tabs = [
    { id: "overview" as const, label: t("app.phase", "Overview"), short: "Overview" },
    { id: "environments" as const, label: t("nav.environments", "Environments"), short: "Environments" },
    { id: "config" as const, label: t("nav.configuration", "Seed Configuration"), short: "Configuration" },
    { id: "promotion" as const, label: t("nav.promotion", "Staged Promotion"), short: "Promotion" },
    { id: "evidence" as const, label: t("nav.validation", "G3 Evidence"), short: "G3 Evidence" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-800">
      <header className="bg-emerald-950 text-stone-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/90">
                Proclamation 1320/2016 · Directive 7/2016 · Model Agreement
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-semibold leading-snug">
                {t("app.title", "Rent Control and Administration System")}
              </h1>
              <p className="mt-1 text-sm text-emerald-100/90">
                {t("app.phase", "Phase 3 - Environments and Seed Configuration")} · Gate G3
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-100/80">{t("lang.switch", "Language")}:</span>
              <div className="inline-flex rounded-md overflow-hidden border border-emerald-300/30">
                {langOptions.map((o) => (
                  <button
                    key={o.code}
                    onClick={() => setLang(o.code)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      lang === o.code ? "bg-emerald-500 text-emerald-950 font-semibold" : "bg-transparent hover:bg-emerald-900"
                    }`}
                    aria-pressed={lang === o.code}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {lang === "om" && (
            <p className="mt-3 text-xs bg-emerald-900/60 border border-emerald-300/20 rounded-md px-3 py-2 text-emerald-100">
              {t("lang.fallback_notice", "Afan Oromo rendering pending certification; English shown where translation is not yet certified.")}
            </p>
          )}
        </div>
      </header>

      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === x.id
                  ? "border-emerald-600 text-emerald-800 font-semibold"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {x.short}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === "overview" && <OverviewPanel data={data} lang={lang} t={t} setTab={setTab} />}
        {tab === "environments" && <EnvironmentsPanel data={data} lang={lang} t={t} />}
        {tab === "config" && <ConfigurationPanel data={data} lang={lang} t={t} />}
        {tab === "promotion" && <PromotionPanel data={data} lang={lang} t={t} />}
        {tab === "evidence" && <EvidencePanel data={data} lang={lang} t={t} />}
      </main>

      <footer className="mt-auto bg-white border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-stone-500 flex flex-col sm:flex-row justify-between gap-1">
          <span>Rent Control and Administration System Project · Phase 3 deliverable · SRS v1.1 (CR-01)</span>
          <span>Release v0.3.0 · Trilingual: አማርኛ · English · Afaan Oromoo</span>
        </div>
      </footer>
    </div>
  );
}
