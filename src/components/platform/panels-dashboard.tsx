// ============================================================================
// panels-dashboard.tsx — "/" landing page, ROLE-AWARE (owner directives:
// "customize the dashboard, use it to present general information" +
// "i prefer links instead of so many content on single page ... use the
// space properly").
//  · SYSTEM_ADMIN (the super user) gets a LINK-FIRST GENERAL INFORMATION
//    page: a compact identity band, four numbers that decide the day, and
//    the working surfaces as the primary content — deep data (fleet stats,
//    register, duties) stays one click away in National Management.
//  · Every other role keeps the city KPI cards + the seven sprint
//    increments as deep links into their own routes, plus the project tools.
// ============================================================================

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis,
} from "recharts";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Stat, RuleNote } from "./kit";
import { useBoot } from "./shell";
import { call } from "./panels-s1";
import { canAccess } from "@/lib/rbac-pages";
import type { BureauReport } from "./panels-s6s7";
import { t } from "./i18n";

const SPRINTS = [
  { key: "S1", name: "Organization & Parties", modules: "M13, M1", highlight: "Hierarchy, roles, staff; party onboarding with identification and proxy handling", href: "/parties", countKey: "parties" },
  { key: "S2", name: "Properties & Model Contract", modules: "M2, M3", highlight: "Registry with status and exemption clocks; contract studio versioning", href: "/properties", countKey: "properties" },
  { key: "S3", name: "Registration & Certification", modules: "M4", highlight: "Nine-point checklist, registrar acts, interpreter flow, stamping, numbering, registry book, legacy annotation", href: "/registration", countKey: "files" },
  { key: "S4", name: "Rent Adjustment & Payments", modules: "M5, M6", highlight: "June calendar engine, increase validation; electronic ledger with cash flagging", href: "/rent", countKey: "payments" },
  { key: "S5", name: "Complaints & Deadlines", modules: "M8, M12", highlight: "Eight-grounds intake, register, decisions, appeals; statutory clock engine", href: "/complaints", countKey: "complaints" },
  { key: "S6", name: "Control & Penalties", modules: "M7, M9", highlight: "Team control, vacancy monitoring; fine ladder with 3-month cap, referrals", href: "/enforcement", countKey: "penalties" },
  { key: "S7", name: "Data & Reporting", modules: "M10, M11", highlight: "Tier replication, backups; aggregation, dashboards, publication feed", href: "/reports", countKey: "replications" },
] as const;

type NationalStats = {
  cities: { total: number; active: number; suspended: number; deactivated: number };
  officers: number; parties: number; properties: number;
  files: { total: number; inProgress: number; registered: number; rejected: number };
  payments: { count: number; amount: number };
  complaints: { total: number; open: number; decided: number };
  adjustments: { published: number; draft: number };
  publications: number; auditEvents30d: number;
  deadlines: { open: number; overdue: number };
};
type NationalTask = { key: string; label: string; status: string; detail: string };
type NationalRegulation = { id: string; code: string; titleEn: string; type: string; year: number; status: string; addedBy: string; addedAt: string };
type NationalPayload = {
  scope: string; stats: NationalStats; tasks: NationalTask[];
  regulations: NationalRegulation[]; federalVersion: string | null;
};

// ---------------------------------------------------------------------------
// GENERAL INFORMATION — the super user's customized dashboard (owner
// directives). LINK-FIRST: the page launches the work instead of hosting it —
// identity band, four essential numbers, the surfaces as large link cards,
// and a one-line federal summary. The dense material (12 fleet stats, the
// register, the duty statuses) lives in the National Management tabs.
// ---------------------------------------------------------------------------
function SuperUserGeneralInfo({ staffCode, fullName }: { staffCode: string; fullName: string }) {
  const [data, setData] = useState<NationalPayload | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const d = await call("/api/national", "GET", null, staffCode);
      if (alive && d) setData(d as NationalPayload);
    })();
    return () => { alive = false; };
  }, [staffCode]);

  const surfaces = [
    { href: "/platform/management", name: "National Management", desc: "Fleet statistics, management duties, the national regulation register and model-contract propagation." },
    { href: "/platform/audit", name: "Audit Trail", desc: "Fleet-wide, tamper-evident oversight of every state-changing action in every city." },
    { href: "/platform/cities", name: "City Management", desc: "Onboard, suspend or deactivate tenant cities — the one supreme-admin URL." },
  ];

  if (!data) return <p className="px-1 py-6 text-sm text-muted-foreground">Loading general platform information…</p>;
  if (data.scope !== "SYSTEM_ADMIN") {
    return <p className="px-1 py-6 text-sm text-muted-foreground">General platform information is available to the System Super User.</p>;
  }

  const s = data.stats;
  const activeRegs = data.regulations.filter((r) => r.status === "ACTIVE");
  const attention = data.tasks.filter((x) => x.status !== "OK");

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Identity band — what this place is and who holds it. Nothing else. */}
      <div className="rounded-xl border bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">General information</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Welcome, {fullName}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          You operate the platform itself — the federal register, the model contract every city signs under, and the audit trail of every city.
          Registry and operations stay with the city tiers. Choose where to work below; the numbers follow when you need them.
        </p>
      </div>

      {/* Four numbers that decide the day — everything else lives one link away. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active cities" value={s.cities.active} hint={`of ${s.cities.total} onboarded`} />
        <Stat label="Officers" value={s.officers} hint="active accounts, all cities" />
        <Stat label="Registration files" value={s.files.total} hint={`${s.files.registered} registered`} />
        <Stat label="Duties need attention" value={attention.length} hint={attention.length === 0 ? "all duties healthy" : "see National Management"} />
      </div>

      {/* Working surfaces — the primary content of this page. */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Working surfaces — open on demand</p>
        <div className="grid gap-3 md:grid-cols-3">
          {surfaces.map((surf) => (
            <Link key={surf.href} href={surf.href} className="group rounded-xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#D4875A]/60 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-base font-semibold tracking-tight">{surf.name}</span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-[#D4875A]" aria-hidden />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{surf.desc}</p>
              <Badge variant="outline" className="mt-3 font-mono text-[10px]">{surf.href}</Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* One-line federal facts — deep data stays exactly one link away. */}
      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Federal contract <span className="font-mono font-medium text-foreground">{data.federalVersion ?? "—"}</span> in force ·{" "}
        {activeRegs.length} active national regulation{activeRegs.length === 1 ? "" : "s"} reflected in every city ·{" "}
        {s.auditEvents30d} audit events in the last 30 days · full fleet statistics in{" "}
        <Link href="/platform/management" className="font-medium text-foreground underline decoration-[#D4875A]/50 underline-offset-2 hover:text-[#D4875A]">National Management</Link>.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OWNER DIRECTIVE (Task 45) — CITY REPORT CHARTS on the city dashboard:
// "in addition to current data display, city level report using different
// charts in same artistic way". One fetch of GET /api/reports/bureau (the
// Task 44 suite) feeds SIX distinct chart types — registration pipeline
// (horizontal bars), property share (donut), payment ledger (vertical bars),
// complaints (stacked bars), penalty profile (area) and staffing composition
// (stacked bars) — rendered in the dashboard's own visual language: white
// rounded cards, font-display titles, the tenant accent palette. Visible to
// the reports:bureau desks (city bureau head + city admin); every other
// keeps the dashboard exactly as it was.
// ---------------------------------------------------------------------------

const CHART_FALLBACK = { accent: "#D4875A", accentBright: "#E8A87E", primary: "#1D4ED8", secondary: "#0F766E" };

// Read the ACTIVE tenant palette off :root so the charts follow each city's
// white-label colors (same artistic way on every tenant, city-branded hues).
// Memoized per boot identity — the tenant theme vars are already applied to
// :root by TenantThemeProvider before the console shell renders any page.
function useTenantPalette() {
  const { boot } = useBoot();
  return useMemo(() => {
    if (typeof document === "undefined") return CHART_FALLBACK;
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    return {
      accent: v("--tenant-accent", CHART_FALLBACK.accent),
      accentBright: v("--tenant-accent-bright", CHART_FALLBACK.accentBright),
      primary: v("--tenant-primary", CHART_FALLBACK.primary),
      secondary: v("--tenant-secondary", CHART_FALLBACK.secondary),
    };
  }, [boot]);
}

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
// Axis-short form: strip the city prefix ("AA-BOLE-W01" -> "BOLE-W01").
const shortUnit = (code: string) => code.replace(/^[A-Z]+-/, "");
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border bg-white p-4">
      <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-lg border border-dashed px-6 text-center text-xs text-muted-foreground">
      No records in city scope yet — the chart appears with the first entries.
    </div>
  );
}

function CityReportCharts({ staffCode, cityCode }: { staffCode: string; cityCode: string }) {
  const pal = useTenantPalette();
  const [rep, setRep] = useState<BureauReport | null>(null);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    let alive = true;
    void call("/api/reports/bureau", "GET", null, staffCode).then((d) => {
      if (!alive) return;
      if (d) setRep(d as BureauReport);
      else setDead(true); // 403/network — the section stays out of the way
    });
    return () => { alive = false; };
  }, [staffCode]);

  const agg = useMemo(() => {
    if (!rep) return null;
    const woredas = rep.woredaRows;

    const pipeline = rep.fileStatuses.map((s) => ({
      stage: s, label: statusLabel(s),
      count: woredas.reduce((n, w) => n + (w.files[s] ?? 0), 0),
    }));

    const bySub = new Map<string, { code: string; name: string; props: number }>();
    for (const w of woredas) {
      const e = bySub.get(w.subCityCode) ?? { code: w.subCityCode, name: w.subCityName, props: 0 };
      e.props += w.properties;
      bySub.set(w.subCityCode, e);
    }
    const propShare = [...bySub.values()].sort((a, b) => b.props - a.props);

    const payTop = [...woredas]
      .sort((a, b) => b.payments.totalEtb - a.payments.totalEtb).slice(0, 8)
      .map((w) => ({ unit: shortUnit(w.woredaCode), full: `${w.woredaCode} — ${w.woredaName}`, etb: w.payments.totalEtb }));

    const complaintTop = rep.complaintRows
      .map((c) => ({ unit: shortUnit(c.unitCode), full: `${c.unitCode} — ${c.unitName}`, open: c.open, decided: c.decided }))
      .sort((a, b) => b.open + b.decided - (a.open + a.decided)).slice(0, 8);

    const finesTop = [...woredas]
      .sort((a, b) => b.penalties.imposedEtb - a.penalties.imposedEtb).slice(0, 10)
      .map((w) => ({ unit: shortUnit(w.woredaCode), full: `${w.woredaCode} — ${w.woredaName}`, etb: w.penalties.imposedEtb }));

    const staffing = rep.staffing.map((s) => ({
      unit: shortUnit(s.subCityCode), full: `${s.subCityCode} — ${s.subCityName}`,
      Registrars: s.registrars, Stampers: s.stampers, Committee: s.committee,
    }));

    const blank = (rows: Record<string, unknown>[], keys: string[]) =>
      rows.every((r) => keys.every((k) => !r[k]));

    return {
      pipeline, propShare, payTop, complaintTop, finesTop, staffing,
      totalProps: propShare.reduce((n, r) => n + r.props, 0),
      blank: {
        pipeline: blank(pipeline, ["count"]),
        propShare: blank(propShare, ["props"]),
        payTop: blank(payTop, ["etb"]),
        complaintTop: blank(complaintTop, ["open", "decided"]),
        finesTop: blank(finesTop, ["etb"]),
        staffing: blank(staffing, ["Registrars", "Stampers", "Committee"]),
      },
    };
  }, [rep]);

  if (dead) return null;
  if (!agg) {
    return (
      <div className="grid gap-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">City report charts</p>
        <p className="px-1 py-4 text-sm text-muted-foreground">Preparing the city report charts…</p>
      </div>
    );
  }

  // Terracotta pipeline: bright at PRESENTED, deep at REGISTERED, red REJECTED.
  const PIPELINE = [pal.accentBright, pal.accent, "#C1713F", "#A65A2E", "#7C4121", "#B91C1C"];
  const DONUT = [pal.accent, pal.accentBright, pal.primary, pal.secondary, "#B45309", "#7C3AED", "#0369A1", "#059669", "#BE185D", "#4D7C0F", "#A16207"];

  const cfgPipeline = { count: { label: "Files", color: pal.accent } } satisfies ChartConfig;
  const cfgProps = { props: { label: "Properties", color: pal.accent } } satisfies ChartConfig;
  const cfgPay = { etb: { label: "Received (ETB)", color: pal.accent } } satisfies ChartConfig;
  const cfgComplaint = {
    open: { label: "Open", color: "#D97706" }, decided: { label: "Decided", color: "#059669" },
  } satisfies ChartConfig;
  const cfgFines = { etb: { label: "Imposed (ETB)", color: "#B91C1C" } } satisfies ChartConfig;
  const cfgStaff = {
    Registrars: { label: "Registrars", color: pal.accent },
    Stampers: { label: "Stampers", color: pal.accentBright },
    Committee: { label: "Committee", color: pal.secondary },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          City report charts — {cityCode || rep?.cityCode} level down to every woreda
        </p>
        <Link
          href="/reports#bureau"
          className="text-xs font-medium text-foreground underline decoration-[#D4875A]/50 underline-offset-2 transition-colors hover:text-[#D4875A]"
        >
          Full report tables &amp; CSV
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* 1 — Registration lifecycle per stage, horizontal bars (funnel read) */}
        <ChartCard
          title="Registration pipeline — files per lifecycle stage"
          subtitle="Dir. Arts. 6–9 · every woreda of all sub-cities, presented to registered"
        >
          {agg.blank.pipeline ? <ChartEmpty /> : (
            <ChartContainer config={cfgPipeline} className="h-[230px] w-full">
              <BarChart data={agg.pipeline} layout="vertical" margin={{ left: 4, right: 28, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={116} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {agg.pipeline.map((p, i) => <Cell key={p.stage} fill={PIPELINE[i] ?? pal.accent} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* 2 — Property registry share per sub-city, donut with center total */}
        <ChartCard
          title="Property registry — share per sub-city"
          subtitle="M2 · properties on the city register, aggregated per sub-city"
        >
          {agg.blank.propShare ? <ChartEmpty /> : (
            <div className="relative">
              <ChartContainer config={cfgProps} className="h-[230px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="code" />} />
                  <Pie data={agg.propShare} dataKey="props" nameKey="code" innerRadius={58} outerRadius={88} paddingAngle={2} strokeWidth={1}>
                    {agg.propShare.map((p, i) => <Cell key={p.code} fill={DONUT[i % DONUT.length]} />)}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
                <span className="font-display text-xl font-bold tabular-nums">{agg.totalProps.toLocaleString()}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">properties</span>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {agg.propShare.slice(0, 5).map((p, i) => (
                  <span key={p.code} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: DONUT[i % DONUT.length] }} />
                    {shortUnit(p.code)}
                  </span>
                ))}
                {agg.propShare.length > 5 ? (
                  <span className="text-[10px] text-muted-foreground">+{agg.propShare.length - 5} more</span>
                ) : null}
              </div>
            </div>
          )}
        </ChartCard>

        {/* 3 — Payment ledger per woreda, vertical bars (top 8 by ETB) */}
        <ChartCard
          title="Payment ledger — ETB received per woreda"
          subtitle="Proc. Art. 13 · eight woredas with the highest electronic receipts"
        >
          {agg.blank.payTop ? <ChartEmpty /> : (
            <ChartContainer config={cfgPay} className="h-[230px] w-full">
              <BarChart data={agg.payTop} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="unit" tick={{ fontSize: 9 }} interval={0} angle={-32} textAnchor="end" height={46} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 10 }} width={52} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent labelKey="full" />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="etb" fill="var(--color-etb)" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* 4 — Complaints per receiving desk, stacked horizontal bars */}
        <ChartCard
          title="Complaints — open vs decided per receiving desk"
          subtitle="M8/M12 · desks city-wide, eight busiest first"
        >
          {agg.blank.complaintTop ? <ChartEmpty /> : (
            <ChartContainer config={cfgComplaint} className="h-[230px] w-full">
              <BarChart data={agg.complaintTop} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="unit" width={92} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent labelKey="full" />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="open" stackId="c" fill="var(--color-open)" barSize={14} />
                <Bar dataKey="decided" stackId="c" fill="var(--color-decided)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* 5 — Penalty profile per woreda, area curve over the ranked profile */}
        <ChartCard
          title="Penalty profile — fines imposed per woreda"
          subtitle="Proc. Arts. 29–32 · ten woredas with the heaviest imposed fines"
        >
          {agg.blank.finesTop ? <ChartEmpty /> : (
            <ChartContainer config={cfgFines} className="h-[230px] w-full">
              <AreaChart data={agg.finesTop} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillFines" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#B91C1C" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="unit" tick={{ fontSize: 9 }} interval={0} angle={-32} textAnchor="end" height={46} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 10 }} width={52} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent labelKey="full" />} cursor={{ stroke: "rgba(0,0,0,0.15)" }} />
                <Area dataKey="etb" type="monotone" stroke="#B91C1C" strokeWidth={2} fill="url(#fillFines)" dot={false} />
              </AreaChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* 6 — Staffing composition per sub-city, stacked vertical bars */}
        <ChartCard
          title="Staffing — active woreda desks per sub-city"
          subtitle="Sub-city delegation · registrars, stampers and committee members"
        >
          {agg.blank.staffing ? <ChartEmpty /> : (
            <ChartContainer config={cfgStaff} className="h-[230px] w-full">
              <BarChart data={agg.staffing} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="unit" tick={{ fontSize: 9 }} interval={0} angle={-24} textAnchor="end" height={42} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent labelKey="full" />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="Registrars" stackId="d" fill="var(--color-Registrars)" barSize={22} />
                <Bar dataKey="Stampers" stackId="d" fill="var(--color-Stampers)" barSize={22} />
                <Bar dataKey="Committee" stackId="d" fill="var(--color-Committee)" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        {rep
          ? `Generated ${new Date(rep.generatedAt).toISOString().replace("T", " ").slice(0, 16)} by ${rep.generatedBy.fullName} (${rep.generatedBy.staffCode}). Every figure aggregates ALL sub-cities and their woredas; bureau-head modifications are reflected in these numbers the moment they happen.`
          : null}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { boot, lang, officer } = useBoot();
  if (!boot) return null;
  if (officer.roleCode === "SYSTEM_ADMIN") {
    return <SuperUserGeneralInfo staffCode={officer.staffCode} fullName={officer.fullName} />;
  }
  // Task 45: city report charts ride the dashboard ONLY for the desks that
  // hold reports:bureau (city bureau head + city admin) — the same gate as
  // the Bureau reports tab; other roles keep the dashboard untouched.
  const canCityCharts = officer.roleCode === "BUREAU_HEAD" || officer.roleCode === "CITY_ADMIN";
  // Task 46 (owner directive — city bureau head MINIMAL console): his
  // dashboard keeps the KPI band + city report charts + exactly the two
  // working surfaces of his delegation role. The sprint construction grid
  // and project evidence links belong to the desks, not to him.
  const isBureauHead = officer.roleCode === "BUREAU_HEAD";
  // Every other role: sprint deep links are filtered by the page RBAC so a
  // card can never lead to a page the role cannot open (this also fixes the
  // committee member's pre-existing dead sprint links).
  const sprints = SPRINTS.filter((s) => canAccess(s.href, officer.roleCode));
  const projectAccess = canAccess("/project", officer.roleCode);
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registered contracts" value={boot.counts.registeredFiles} />
        <Stat label="Properties" value={boot.counts.properties} />
        <Stat label="Complaints" value={boot.counts.complaints} hint={`${boot.appeals.length} appeals`} />
        <Stat label="Deadline clocks" value={boot.counts.deadlines} hint={`${boot.counts.overdueDeadlines} overdue`} />
      </div>

      {canCityCharts ? (
        <CityReportCharts staffCode={officer.staffCode} cityCode={boot.cityCode ?? officer.cityCode ?? ""} />
      ) : null}

      {isBureauHead ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/settings#org"
            className="rounded-xl border bg-white p-4 text-left transition-colors hover:border-[#D4875A]/50 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold tracking-tight">{t("nav.settings", lang)} — Sub-cities & City Rules</span>
              <Badge variant="outline" className="font-mono text-[10px]">M13</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Found sub-cities and appoint their one responsible officer; city-wide identity, parameters and penalty ladder — every modification is reflected in all sub-city consoles.
            </p>
          </Link>
          <Link
            href="/reports#bureau"
            className="rounded-xl border bg-white p-4 text-left transition-colors hover:border-[#D4875A]/50 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold tracking-tight">{t("nav.data", lang)}</span>
              <Badge variant="outline" className="font-mono text-[10px]">M10, M11</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              City-level reports across all sub-cities down to every woreda — staffing, registration pipeline, properties, payments, complaints, penalties — exportable to CSV.
            </p>
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold">
              {boot.cityConfig ? `${boot.cityConfig.nameEn} — ` : ""}Incremental Module Construction
            </h2>
            <p className="text-xs text-muted-foreground">
              Seven sprints build the thirteen SRS modules. Each page is a working increment demonstrated to the owner; Gate G4 tests that all seven are demonstrated and no severity-1/2 defects remain open.
            </p>
            <RuleNote lang={lang} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sprints.map((s) => (
              <Link
                key={s.key} href={s.href}
                className="rounded-xl border bg-white p-4 text-left transition-colors hover:border-[#D4875A]/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold tracking-tight">{s.key} · {s.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">{s.modules}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.highlight}</p>
                <p className="mt-2 text-xs font-medium">{boot.counts[s.countKey]} record{boot.counts[s.countKey] === 1 ? "" : "s"} in scope</p>
              </Link>
            ))}
            {projectAccess ? (
              <Link href="/project" className="rounded-xl border border-dashed bg-white p-4 text-left transition-colors hover:border-[#D4875A]/50">
                <div className="text-sm font-semibold">{t("nav.evidence", lang)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Phase 3 promotion evidence, traceability closure and the Gate G4 exit checklist.</p>
              </Link>
            ) : null}
            {!projectAccess && sprints.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">
                Registry and operations desks open here for the officer roles they belong to.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
