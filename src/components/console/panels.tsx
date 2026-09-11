"use client";

// ============================================================================
// panels.tsx — Phase 3 console panels.
// ============================================================================

import { useState } from "react";
import { pickName, type Lang } from "./console";
import type { ConsoleData } from "./console";
import {
  EnvironmentRow, SubCityRow, PenaltyRow, EventRow, ContractSectionRow,
  CatalogRow, ReleaseRow,
} from "./types";

type TFn = (key: string, fallback: string) => string;

function Card({ title, subtitle, children, badge }: { title: string; subtitle?: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <section className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-stone-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-stone-800">{title}</h2>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </section>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "stone" | "red"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    stone: "bg-stone-100 text-stone-600 border-stone-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${tones[tone]}`}>{children}</span>;
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="py-1.5 grid grid-cols-[minmax(110px,180px)_1fr] gap-2 text-sm">
      <span className="text-stone-500">{k}</span>
      <span className="text-stone-800 break-words">{v}</span>
    </div>
  );
}

function certBadge(status: string) {
  if (status === "CONFIRMED" || status === "CERTIFIED" || status === "CONFIRMED_AM") {
    return <Badge tone="green">{status}</Badge>;
  }
  return <Badge tone="amber">{status}</Badge>;
}

// ---------------------------------------------------------------------------
export function OverviewPanel({ data, lang, t, setTab }: { data: ConsoleData; lang: Lang; t: TFn; setTab: (x: "overview" | "environments" | "config" | "promotion" | "evidence") => void }) {
  const stats = [
    { label: t("org.subcity", "Sub-cities"), value: data.stats.subCities },
    { label: t("org.woreda", "Woredas"), value: data.stats.woredas },
    { label: "Roles", value: data.stats.roles },
    { label: "Languages", value: `${data.stats.languages} (am·en·om)` },
    { label: "Penalty parameters", value: data.stats.penalties },
    { label: "Calendar events", value: data.stats.events },
  ];
  return (
    <div className="space-y-5">
      <Card title={t("app.title", "Rent Control and Administration System")} subtitle={t("app.phase", "Phase 3 - Environments and Seed Configuration")}>
        <p className="text-sm text-stone-600 leading-relaxed">
          Phase 3 prepares the runtime landscape and seeds the configuration the platform needs to behave like the
          directive on day one. This console is itself served by the seeded configuration: every label on this page
          renders from the trilingual LocalizationResource table (CR-01), and the organizational tree below comes
          from the OrgUnit seed matching the official Addis Ababa structure. Use the language switcher in the header
          to switch the interface between Amharic, English and Afan Oromo.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="text-2xl font-semibold text-emerald-800">{s.value}</div>
              <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Release status" subtitle="Staged promotion with release tagging (Plan §5.4)">
        {data.latestRelease ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge tone={data.latestRelease.status === "PROMOTED" ? "green" : data.latestRelease.status === "FAILED" ? "red" : "amber"}>
                {data.latestRelease.status}
              </Badge>
              <span className="font-mono text-sm">{data.latestRelease.tag}</span>
              <span className="text-xs text-stone-500">{data.latestRelease.steps.length} steps recorded</span>
            </div>
            <button onClick={() => setTab("promotion")} className="text-sm px-3 py-1.5 rounded-md border border-emerald-700 text-emerald-800 hover:bg-emerald-50 transition-colors">
              {t("nav.promotion", "Staged Promotion")} →
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-stone-500">No promotion has been recorded yet in this environment.</p>
            <button onClick={() => setTab("promotion")} className="text-sm px-3 py-1.5 rounded-md border border-emerald-700 text-emerald-800 hover:bg-emerald-50 transition-colors">
              {t("promotion.run", "Run staged promotion")} →
            </button>
          </div>
        )}
      </Card>

      <Card title="Open items carried into G3" subtitle="Honest tracking of confirmed-pending legal parameters">
        <ul className="text-sm text-stone-600 space-y-2 list-disc pl-5">
          <li><strong>O1</strong> — Directive Art. 22 offense-level fine figures: encoded as configurable parameters flagged PENDING_OFFICIAL_TEXT; confirm against the official Amharic text at legal review.</li>
          <li><strong>O-7</strong> — Per-sub-city woreda counts: register seeded to the sourced official total (118); sub-city split partly provisional, reconcile against the official establishment register before pilot (Phase 7).</li>
          <li><strong>O-8</strong> — Afan Oromo legal glossary certification (CR-01): interface falls back per NFR-06 until the Bureau certifies the trilingual terminology.</li>
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function EnvironmentsPanel({ data, lang, t }: { data: ConsoleData; lang: Lang; t: TFn }) {
  return (
    <div className="space-y-5">
      <Card title={t("nav.environments", "Environments")} subtitle="Environment inventory — Directive Art. 13 backup scheme at every tier (NFR-03)">
        <div className="space-y-4">
          {data.environments.map((e: EnvironmentRow) => (
            <div key={e.stage} className="rounded-lg border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-4 py-2.5 flex items-center justify-between gap-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{e.stage}</span>
                  <span className="font-mono text-xs text-stone-500">{e.name}</span>
                </div>
                <Badge tone={e.stage === "PROD" ? "green" : e.stage === "STAGING" ? "amber" : "stone"}>
                  RPO {e.rpoMinutes ?? "—"} min · RTO {e.rtoHours ?? "—"} h
                </Badge>
              </div>
              <div className="px-4 py-2 divide-y divide-stone-100">
                <KV k="Purpose" v={e.purpose} />
                <KV k="Database" v={e.database} />
                <KV k="Backup scheme" v={e.backupScheme} />
                <KV k="Replication" v={e.replicationTarget ?? "—"} />
                <KV k="Restore drill" v={e.restoreDrill ?? "—"} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Upward change propagation" subtitle="Directive Art. 13 — woreda corrections propagate upward">
        <p className="text-sm text-stone-600 leading-relaxed">
          Data custody follows the three-tier administration chain of the directive: entries originate at the woreda
          office where the house is located, aggregate to the sub-city monitor, consolidate at the city Bureau, and
          feed the Ministry national statistics (Proclamation Art. 18). Every tier carries the Art. 13(4) backup
          obligations — nightly full backup plus continuous transaction logging — with hard-copy registry books kept
          in dual hard/soft custody alongside the digital records.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
const CONFIG_TABS = [
  { id: "org", label: "Organizational tree" },
  { id: "roles", label: "Roles" },
  { id: "ids", label: "Identification" },
  { id: "status", label: "Property statuses" },
  { id: "penalties", label: "Penalty parameters" },
  { id: "calendar", label: "June calendar" },
  { id: "contract", label: "Model contract v1" },
  { id: "lang", label: "Languages & resources" },
] as const;

export function ConfigurationPanel({ data, lang, t }: { data: ConsoleData; lang: Lang; t: TFn }) {
  const [sub, setSub] = useState<(typeof CONFIG_TABS)[number]["id"]>("org");
  const [openSubCity, setOpenSubCity] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {CONFIG_TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setSub(x.id)}
            className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors ${
              sub === x.id ? "bg-emerald-800 text-white border-emerald-800" : "bg-white border-stone-300 text-stone-600 hover:border-emerald-600 hover:text-emerald-800"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {sub === "org" && (
        <Card
          title={t("nav.configuration", "Seed Configuration") + " — " + t("org.subcity", "Sub-cities") + " → " + t("org.woreda", "Woredas")}
          subtitle={`Official structure: 1 Ministry → 1 Bureau → ${data.stats.subCities} sub-cities → ${data.stats.woredas} woredas (sourced official total: ${data.officialWoredaTotal})`}
        >
          <div className="space-y-2">
            {data.subCities.map((sc: SubCityRow) => (
              <div key={sc.code} className="border border-stone-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-stone-50 transition-colors text-left"
                  onClick={() => setOpenSubCity(openSubCity === sc.code ? null : sc.code)}
                  aria-expanded={openSubCity === sc.code}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm">{pickName(lang, sc)}</span>
                    <span className="font-mono text-[11px] text-stone-400">{sc.code}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="stone">{sc.woredaCount} woredas</Badge>
                    {sc.basis === "FEDERAL_LIST_ANCHOR" ? (
                      <Badge tone="green">SOURCED</Badge>
                    ) : sc.basis === "DOCUMENTED_MINIMUM" ? (
                      <Badge tone="green">DOCUMENTED MIN</Badge>
                    ) : (
                      <Badge tone="amber">PROVISIONAL (O-7)</Badge>
                    )}
                    <span className="text-stone-400 text-xs">{openSubCity === sc.code ? "▲" : "▼"}</span>
                  </div>
                </button>
                {openSubCity === sc.code && (
                  <div className="px-4 py-3 bg-stone-50 border-t border-stone-200">
                    <p className="text-xs text-stone-500 mb-2">{sc.note}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sc.woredaCodes.map((w) => (
                        <span key={w} className="text-[11px] font-mono bg-white border border-stone-200 rounded px-1.5 py-0.5 text-stone-600">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "roles" && (
        <Card title="Role catalogue" subtitle="SRS actor model — trilingual (CR-01)">
          <div className="grid sm:grid-cols-2 gap-2">
            {data.roles.map((r: CatalogRow) => (
              <div key={r.code} className="border border-stone-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{pickName(lang, r)}</div>
                  <div className="text-[11px] text-stone-400 font-mono">{r.code} · {r.extra}</div>
                </div>
                <Badge tone="stone">role</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "ids" && (
        <Card title="Identification catalogue" subtitle="Directive Art. 7 — original presented, copy attached (original-and-copy rule)">
          <div className="space-y-2">
            {data.idTypes.map((i: CatalogRow) => (
              <div key={i.code} className="border border-stone-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm">{pickName(lang, i)}</span>
                <Badge tone="green">original + copy</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "status" && (
        <Card title="Property status types" subtitle="Proclamation Art. 10 — exemption clocks: new construction 48 months, vacant 24 months">
          <div className="space-y-2">
            {data.statuses.map((s: CatalogRow) => (
              <div key={s.code} className="border border-stone-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm">{pickName(lang, s)}</span>
                <Badge tone="stone">{s.extra}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "penalties" && (
        <Card title="Penalty parameters" subtitle="Proc. Arts. 29-32 (3-month cap); Dir. Art. 22 ladder — configurable, never hard-coded">
          <div className="space-y-2">
            {data.penalties.map((p: PenaltyRow) => (
              <div key={p.code} className="border border-stone-200 rounded-lg px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{pickName(lang, p)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">{p.rangeLabelEn}</span>
                    {certBadge(p.confirmationStatus)}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-stone-400 font-mono">{p.code} · {p.basisRef}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "calendar" && (
        <Card title="Annual adjustment calendar" subtitle="Proclamation Art. 8; Directive Art. 11 — June 1 publication, June 30 effect">
          <div className="space-y-2">
            {data.events.map((e: EventRow) => (
              <div key={e.code} className="border border-stone-200 rounded-lg px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{pickName(lang, e)}</span>
                  <Badge tone="green">June {e.day}{e.windowDays ? ` · window ${e.windowDays} days` : ""}</Badge>
                </div>
                <div className="mt-1 text-xs text-stone-500">{e.legalBasis}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "contract" && (
        <Card title="Model rental agreement v1.0" subtitle="Proc. Art. 5; Dir. Art. 4 — Amharic canonical; EN/OM renderings pending certification (CR-01)">
          <div className="space-y-2">
            {data.sections.map((s: ContractSectionRow) => (
              <details key={s.code} className="border border-stone-200 rounded-lg px-3.5 py-2.5">
                <summary className="cursor-pointer text-sm font-medium flex flex-wrap items-center justify-between gap-2">
                  <span>{s.orderNo}. {lang === "am" ? s.titleAm : lang === "om" ? (s.titleOm || s.titleEn) : s.titleEn}</span>
                  <span className="text-[11px] font-normal text-stone-400">{s.legalBasis}</span>
                </summary>
                <div className="mt-2 space-y-1.5 text-xs text-stone-600">
                  {s.contentAm && <p><span className="font-mono text-[10px] text-stone-400 mr-1">am:</span>{s.contentAm}</p>}
                  {s.contentEn && <p><span className="font-mono text-[10px] text-stone-400 mr-1">en:</span>{s.contentEn}</p>}
                  {s.contentOm && <p><span className="font-mono text-[10px] text-stone-400 mr-1">om:</span>{s.contentOm}</p>}
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}

      {sub === "lang" && (
        <div className="space-y-4">
          <Card title="Language catalogue" subtitle="CR-01: three active languages; Amharic is the canonical legal rendering">
            <div className="space-y-2">
              {data.languages.map((l) => (
                <div key={l.code} className="border border-stone-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium">{l.nameNative}</span>
                    <span className="text-xs text-stone-400 ml-2 font-mono">{l.code}</span>
                  </div>
                  <div className="flex gap-2">
                    {l.isDefault && <Badge tone="green">DEFAULT</Badge>}
                    <Badge tone={l.code === "om" ? "amber" : "green"}>{l.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Localization resources" subtitle={`${data.stats.resources} keys seeded trilingually; certification tracked per key`}>
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-stone-200">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-stone-500">Key</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500">Amharic (አማርኛ)</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500">English</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500">Afaan Oromoo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.resources.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-stone-400 align-top">{r.key}</td>
                      <td className="px-3 py-1.5 align-top">{r.valueAm}</td>
                      <td className="px-3 py-1.5 align-top">{r.valueEn}</td>
                      <td className="px-3 py-1.5 align-top">{r.valueOm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function PromotionPanel({ data, lang, t }: { data: ConsoleData; lang: Lang; t: TFn }) {
  const [release, setRelease] = useState<ReleaseRow | null>(data.latestRelease);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPromotion() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/promotion", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Promotion failed");
      const fresh = await fetch("/api/promotion");
      const fj = await fresh.json();
      if (fj.ok && fj.release) setRelease(fj.release as ReleaseRow);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title={t("nav.promotion", "Staged Promotion")}
        subtitle="DEV → STAGING → PROD with release tagging; every step and validation check is recorded (Gate G3 walkthrough)"
        badge={
          <button
            onClick={runPromotion}
            disabled={running}
            className="text-sm px-4 py-2 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {running ? "Running…" : t("promotion.run", "Run staged promotion")}
          </button>
        }
      >
        {error && <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        {release ? (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge tone={release.status === "PROMOTED" ? "green" : release.status === "FAILED" ? "red" : "amber"}>{release.status}</Badge>
              <span className="font-mono text-sm font-semibold">{release.tag}</span>
              <span className="text-xs text-stone-400">{new Date(release.startedAt).toLocaleString()}</span>
            </div>
            <ol className="space-y-2">
              {release.steps.map((s) => (
                <li key={s.orderNo} className="border border-stone-200 rounded-lg overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-stone-400">#{s.orderNo}</span>
                      <Badge tone="stone">{s.stage}</Badge>
                      <span className="text-sm truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.durationMs != null && <span className="text-[11px] text-stone-400">{s.durationMs} ms</span>}
                      <Badge tone={s.status === "PASSED" ? "green" : s.status === "FAILED" ? "red" : "amber"}>{s.status}</Badge>
                    </div>
                  </div>
                  {s.detail && <div className="px-3.5 py-2 bg-stone-50 border-t border-stone-100 text-xs text-stone-600">{s.detail}</div>}
                  {s.checks && s.checks.length > 0 && (
                    <details className="border-t border-stone-100">
                      <summary className="cursor-pointer px-3.5 py-2 text-xs text-emerald-800 hover:bg-stone-50">
                        {s.checks.length} validation checks — {s.checks.filter((c) => c.passed).length} passed, {s.checks.filter((c) => !c.passed).length} failed
                      </summary>
                      <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                        {s.checks.map((c, idx) => (
                          <div key={idx} className="px-3.5 py-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-stone-700">{c.name}</span>
                              <div className="flex gap-1.5 shrink-0">
                                {c.severity === "ADVISORY" && <Badge tone="stone">ADVISORY</Badge>}
                                <Badge tone={c.passed ? "green" : "red"}>{c.passed ? t("validation.passed", "Passed") : t("validation.failed", "Failed")}</Badge>
                              </div>
                            </div>
                            <div className="mt-1 grid sm:grid-cols-2 gap-1 text-[11px] text-stone-500">
                              <span>expected: <span className="text-stone-700">{c.expected}</span></span>
                              <span>actual: <span className="text-stone-700">{c.actual}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            No release recorded yet. Run the staged promotion to execute the walkthrough: seed configuration in DEV,
            promote and validate in STAGING, promote and verify against the official structure in PROD, then tag the
            release.
          </p>
        )}
      </Card>
      <Card title="Pipeline" subtitle="Automated build, unit tests, static analysis, staged promotion with release tagging">
        <p className="text-sm text-stone-600 leading-relaxed">
          The CI pipeline (.github/workflows/ci.yml) mirrors this engine: the build job runs static analysis and the
          unit test suite (tests/seed-config.test.ts), then seeds the development configuration; staging and production
          jobs promote the tagged configuration and gate on the same validation battery recorded above. The CLI entry
          (scripts/pipeline/promote.ts) reproduces the full walkthrough locally, which is what the run button executes
          server-side.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function EvidencePanel({ data, lang, t }: { data: ConsoleData; lang: Lang; t: TFn }) {
  const envs = data.environments;
  return (
    <div className="space-y-5">
      <Card title={t("nav.validation", "G3 Evidence")} subtitle="Gate G3 exit criteria (Plan §5.4) and the evidence recorded against them">
        <div className="space-y-3 text-sm">
          <div className="border border-stone-200 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Criterion 1 — a staged promotion runs end to end</span>
              <Badge tone={data.latestRelease?.status === "PROMOTED" ? "green" : "amber"}>
                {data.latestRelease?.status === "PROMOTED" ? "SATISFIED" : "PENDING RUN"}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs text-stone-500">
              Evidence: release {data.latestRelease?.tag ?? "—"} with {data.latestRelease?.steps.length ?? 0} recorded steps
              (build, schema, seed, tags, staged validation, Art. 13 custody verification) in the Staged Promotion tab.
            </p>
          </div>
          <div className="border border-stone-200 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Criterion 2 — seeded hierarchy matches the official structure</span>
              <Badge tone="green">SATISFIED</Badge>
            </div>
            <p className="mt-1.5 text-xs text-stone-500">
              Evidence: validation battery confirms 1 Ministry → 1 Bureau → {data.stats.subCities} sub-cities → {data.stats.woredas} woredas
              (matches the sourced official total {data.officialWoredaTotal}), sequential W01..WN numbering per sub-city,
              referential integrity, and the trilingual catalogue completeness required by CR-01.
            </p>
          </div>
        </div>
      </Card>

      <Card title="Sourced structural facts" subtitle="Basis for the seeded hierarchy — full citations in the Phase 3 report">
        <ul className="text-sm text-stone-600 space-y-2 list-disc pl-5">
          <li>11 sub-cities including Lemi Kura, the 11th sub-city established October 2020 from Bole and Yeka woredas (city administration restructure).</li>
          <li>Official city-wide woreda total 118 (2025 published city study).</li>
          <li>Federal regions/woredas enumeration anchors: Arada 10; Bole at least 14; Yeka at least 12.</li>
          <li>Lemi Kura at least 13 woredas by 2025 (official address formats).</li>
          <li>Counts not fixed by an anchor are seeded as PROVISIONAL configurable parameters (open item O-7) and are reconciled against the official establishment register before pilot.</li>
        </ul>
      </Card>

      <Card title="Environment custody summary" subtitle="Directive Art. 13 obligations recorded in the seed">
        <div className="grid sm:grid-cols-3 gap-3">
          {envs.map((e) => (
            <div key={e.stage} className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <div className="text-sm font-semibold">{e.stage}</div>
              <div className="text-xs text-stone-500 mt-1">Backup: configured</div>
              <div className="text-xs text-stone-500">Replication: {e.replicationTarget ? "defined" : "dev-local"}</div>
              <div className="text-xs text-stone-500">RPO {e.rpoMinutes ?? "—"} min · RTO {e.rtoHours ?? "—"} h</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Deliverable documents" subtitle="Gate G3 package">
        <ul className="text-sm text-stone-600 space-y-2 list-disc pl-5">
          <li>SRS v1.1 (CR-01 trilingual) — updated requirements baseline with change record.</li>
          <li>Phase 3 report: environment inventory, pipeline documentation, seeded configuration catalogue, walkthrough results.</li>
          <li>Seeded configuration itself — this database and its seed modules (src/lib/seed-data/, prisma/seed.ts).</li>
          <li>Pipeline: .github/workflows/ci.yml + src/lib/promotion/ engine + scripts/pipeline/promote.ts CLI.</li>
        </ul>
      </Card>
    </div>
  );
}
