// ============================================================================
// panels-dashboard.tsx — "/" landing page, ROLE-AWARE (owner directive:
// "customize the dashboard, use it to present general information").
//  · SYSTEM_ADMIN (the super user) gets a GENERAL INFORMATION hub: what the
//    platform is, the fleet at a glance, the federal regulation register
//    highlights, the management-duty snapshot and his working surfaces —
//    none of the city-operational sprint links he no longer holds.
//  · Every other role keeps the city KPI cards + the seven sprint
//    increments as deep links into their own routes, plus the project tools.
// ============================================================================

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Stat, Panel, StatusBadge, RuleNote } from "./kit";
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
// GENERAL INFORMATION hub — the super user's customized dashboard (owner
// directive). Presents what the platform IS and how the fleet stands: the
// national numbers, the federal register highlights and the live duty
// statuses, with quick entry into each working surface.
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

  // Owner directive: City Settings and the Service Catalog are city-tier
  // surfaces — removed from the super user's console along with registry,
  // operations, project tools and Insights.
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
  const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(s.payments.amount);
  const activeRegs = data.regulations.filter((r) => r.status === "ACTIVE");
  const attention = data.tasks.filter((x) => x.status !== "OK");

  return (
    <div className="grid grid-cols-1 gap-4">
      <Panel
        title="General information"
        subtitle="What this platform is and where it stands — the national picture at sign-in."
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform</p>
            <p className="mt-1 font-semibold">Residential Rent Control &amp; Administration Platform</p>
            <p className="mt-1 text-xs text-muted-foreground">Proclamation 1320/2016 · Directive 7/2016 · Model Agreement — a multi-tenant system in which each city administration runs its own registry, operations and public services.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your role</p>
            <p className="mt-1 font-semibold">{fullName} — System Super User</p>
            <p className="mt-1 text-xs text-muted-foreground">The one platform administrator: you run the fleet, issue federal regulations and model-contract changes to ALL cities, and hold the audit trail. Registry, operations and project tools belong to the city tiers.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tenant fleet</p>
            <p className="mt-1 font-semibold">{s.cities.total} cities — {s.cities.active} active</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.cities.suspended} suspended · {s.cities.deactivated} deactivated. Onboarding, suspension and deactivation live in City Management.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Federal state</p>
            <p className="mt-1 font-semibold">Model contract {data.federalVersion ?? "—"} in force</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeRegs.length} active national regulation{activeRegs.length === 1 ? "" : "s"} on the federal register, reflected in every city console. {attention.length === 0 ? "All management duties are healthy." : `${attention.length} management dut${attention.length === 1 ? "y needs" : "ies need"} attention — see the snapshot below.`}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Platform at a glance" subtitle="The general numbers across the whole fleet — registry, operations, payments and oversight.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Active cities" value={s.cities.active} hint={`of ${s.cities.total} onboarded`} />
          <Stat label="Officers" value={s.officers} hint="active accounts, all cities" />
          <Stat label="Parties" value={s.parties} hint="landlords · tenants · agents" />
          <Stat label="Properties" value={s.properties} hint="registered dwellings" />
          <Stat label="Registration files" value={s.files.total} hint={`${s.files.registered} registered`} />
          <Stat label="Payments" value={`${money} ETB`} hint={`${s.payments.count} receipts`} />
          <Stat label="Open complaints" value={s.complaints.open} hint={`${s.complaints.decided} decided of ${s.complaints.total}`} />
          <Stat label="Rent adjustments" value={s.adjustments.published} hint={`${s.adjustments.draft} in draft`} />
          <Stat label="Publications" value={s.publications} hint="public notices issued" />
          <Stat label="Audit events (30d)" value={s.auditEvents30d} hint="tamper-evident chain" />
          <Stat label="Deadline clocks" value={s.deadlines.open} hint={s.deadlines.overdue > 0 ? `${s.deadlines.overdue} OVERDUE` : "none overdue"} />
          <Stat label="Federal contract" value={data.federalVersion ?? "—"} hint="version in force" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Federal regulation register — latest" subtitle="The most recent entries you added; every city console already shows them.">
          {activeRegs.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No active national regulations yet — add the first one in National Management.</p>
          ) : (
            <div className="grid gap-2">
              {activeRegs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight"><span className="font-mono text-xs">{r.code}</span> — {r.titleEn}</p>
                    <p className="text-xs text-muted-foreground">{r.type} · {r.year} · added {new Date(r.addedAt).toISOString().slice(0, 10)} by {r.addedBy}</p>
                  </div>
                  <StatusBadge value="ACTIVE" />
                </div>
              ))}
              {activeRegs.length > 5 ? <p className="text-xs text-muted-foreground">+{activeRegs.length - 5} more — manage the register in National Management.</p> : null}
            </div>
          )}
        </Panel>

        <Panel title="Management duties snapshot" subtitle="Live platform health — what the super user keeps running.">
          <div className="grid gap-2">
            {data.tasks.map((x) => (
              <div key={x.key} className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{x.label}</p>
                  <p className="text-xs text-muted-foreground">{x.detail}</p>
                </div>
                <StatusBadge value={x.status === "OK" ? "REGISTERED" : "OVERDUE"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Your working surfaces" subtitle="Everything the System Super User operates — city settings, service catalogs, registry, operations and project tools stay with the city tiers by design.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {surfaces.map((surf) => (
            <Link key={surf.href} href={surf.href} className="rounded-xl border bg-white p-4 transition-colors hover:border-[#D4875A]/50 hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{surf.name}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{surf.href}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{surf.desc}</p>
            </Link>
          ))}
        </div>
      </Panel>
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
              <span className="text-sm font-semibold">{s.key} · {s.name}</span>
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
