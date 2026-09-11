// ============================================================================
// panels-dashboard.tsx — "/" landing page: city KPI cards + the seven sprint
// increments as deep links into their own routes, plus the project tools.
// ============================================================================

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Stat, RuleNote } from "./kit";
import { useBoot } from "./shell";
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

export function DashboardPage() {
  const { boot, lang } = useBoot();
  if (!boot) return null;
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
