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
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Stat, RuleNote } from "./kit";
import { useBoot } from "./shell";
import { call } from "./panels-s1";
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

export function DashboardPage() {
  const { boot, lang, officer } = useBoot();
  if (!boot) return null;
  if (officer.roleCode === "SYSTEM_ADMIN") {
    return <SuperUserGeneralInfo staffCode={officer.staffCode} fullName={officer.fullName} />;
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registered contracts" value={boot.counts.registeredFiles} />
        <Stat label="Properties" value={boot.counts.properties} />
        <Stat label="Complaints" value={boot.counts.complaints} hint={`${boot.appeals.length} appeals`} />
        <Stat label="Deadline clocks" value={boot.counts.deadlines} hint={`${boot.counts.overdueDeadlines} overdue`} />
      </div>

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
        {SPRINTS.map((s) => (
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
        <Link href="/project" className="rounded-xl border border-dashed bg-white p-4 text-left transition-colors hover:border-[#D4875A]/50">
          <div className="text-sm font-semibold">{t("nav.evidence", lang)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Phase 3 promotion evidence, traceability closure and the Gate G4 exit checklist.</p>
        </Link>
      </div>
    </div>
  );
}
