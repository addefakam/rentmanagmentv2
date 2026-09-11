// ============================================================================
// console.tsx — Phase 4 platform console shell. Fetches the /api/platform
// boot payload, hosts the trilingual language switcher (CR-01) and routes
// the seven sprint increment tabs plus the evidence tab.
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { AdminPanel, PartiesPanel } from "./panels-s1";
import { AssetsPanel, RegistrationPanel } from "./panels-s2s3";
import { RentPanel, DisputesPanel } from "./panels-s4s5";
import { EnforcementPanel, DataPanel } from "./panels-s6s7";
import { EvidencePanel } from "./panels-evidence";
import { QualityPanel } from "./panels-p5";
import { UatPanel } from "./panels-p6";
import { PilotPanel } from "./panels-p7";
import { GoLivePanel } from "./panels-p8";
import { Stat, RuleNote } from "./kit";

const TABS = [
  ["overview", "nav.overview"],
  ["admin", "nav.admin"],
  ["parties", "nav.parties"],
  ["assets", "nav.assets"],
  ["registration", "nav.registration"],
  ["rent", "nav.rent"],
  ["disputes", "nav.disputes"],
  ["enforcement", "nav.enforcement"],
  ["data", "nav.data"],
  ["evidence", "nav.evidence"],
  ["p5", "nav.p5"],
  ["p6", "nav.p6"],
  ["p7", "nav.p7"],
  ["p8", "nav.p8"],
] as const;

type TabKey = (typeof TABS)[number][0];

export default function PlatformConsole() {
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<TabKey>("overview");
  const [boot, setBoot] = useState<BootPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/platform", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setBoot(json.data as BootPayload);
    else toast.error(json.error ?? "Failed to load platform state");
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const tr = (key: string) => t(key, lang);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold sm:text-lg">{tr("app.title")}</h1>
            <p className="truncate text-xs text-muted-foreground">{tr("app.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Phase 4 · S1–S7</Badge>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="h-8 w-[150px] text-sm" aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="am">አማርኛ · Amharic</SelectItem>
                <SelectItem value="om">Afaan Oromoo · Oromo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2 pb-1" aria-label="Modules">
          <div className="flex min-w-max gap-1">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-t-md px-3 py-2 text-xs font-medium transition-colors hover:bg-muted ${tab === key ? "border-b-2 border-primary bg-muted/60 text-primary" : "text-muted-foreground"}`}
              >
                {tr(label)}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        {loading || !boot ? (
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
            <p className="text-center text-xs text-muted-foreground">{tr("state.loading")}</p>
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewPanel boot={boot} lang={lang} onTab={setTab} />}
            {tab === "admin" && <AdminPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "parties" && <PartiesPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "assets" && <AssetsPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "registration" && <RegistrationPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "rent" && <RentPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "disputes" && <DisputesPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "enforcement" && <EnforcementPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "data" && <DataPanel boot={boot} lang={lang} refresh={refresh} />}
            {tab === "evidence" && <EvidencePanel lang={lang} />}
            {tab === "p5" && <QualityPanel lang={lang} refresh={refresh} />}
            {tab === "p6" && <UatPanel lang={lang} refresh={refresh} />}
            {tab === "p7" && <PilotPanel lang={lang} refresh={refresh} />}
            {tab === "p8" && <GoLivePanel lang={lang} refresh={refresh} />}
          </>
        )}
      </main>

      <footer className="mt-auto border-t bg-white py-3">
        <div className="mx-auto max-w-7xl px-4 text-[11px] text-muted-foreground">
          {boot ? `Boot ${new Date(boot.generatedAt).toLocaleString()} · ${boot.counts.orgUnits} org units · ${boot.counts.woredas} woredas · ` : ""}
          Proc. 1320/2016 · Dir. 7/2016 · SRS v1.1 (CR-01)
        </div>
      </footer>
    </div>
  );
}

function OverviewPanel({ boot, lang, onTab }: { boot: BootPayload; lang: Lang; onTab: (k: TabKey) => void }) {
  const sprints: { key: string; name: string; modules: string; highlight: string; tab: TabKey; count?: number }[] = [
    { key: "S1", name: "Organization & Parties", modules: "M13, M1", highlight: "Hierarchy, roles, staff; party onboarding with identification and proxy handling", tab: "admin", count: boot.counts.parties },
    { key: "S2", name: "Properties & Model Contract", modules: "M2, M3", highlight: "Registry with status and exemption clocks; contract studio versioning", tab: "assets", count: boot.counts.properties },
    { key: "S3", name: "Registration & Certification", modules: "M4", highlight: "Nine-point checklist, registrar acts, interpreter flow, stamping, numbering, registry book, legacy annotation", tab: "registration", count: boot.counts.files },
    { key: "S4", name: "Rent Adjustment & Payments", modules: "M5, M6", highlight: "June calendar engine, increase validation; electronic ledger with cash flagging", tab: "rent", count: boot.counts.payments },
    { key: "S5", name: "Complaints & Deadlines", modules: "M8, M12", highlight: "Eight-grounds intake, register, decisions, appeals; statutory clock engine", tab: "disputes", count: boot.counts.complaints },
    { key: "S6", name: "Control & Penalties", modules: "M7, M9", highlight: "Team control, vacancy monitoring; fine ladder with 3-month cap, referrals", tab: "enforcement", count: boot.counts.penalties },
    { key: "S7", name: "Data & Reporting", modules: "M10, M11", highlight: "Tier replication, backups; aggregation, dashboards, publication feed", tab: "data", count: boot.replications.length },
  ];
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registered contracts" value={boot.counts.registeredFiles} />
        <Stat label="Properties" value={boot.counts.properties} />
        <Stat label="Complaints" value={boot.counts.complaints} hint={`${boot.appeals.length} appeals`} />
        <Stat label="Deadline clocks" value={boot.counts.deadlines} hint={`${boot.counts.overdueDeadlines} overdue`} />
      </div>
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Phase 4 — Incremental Module Construction</h2>
        <p className="text-xs text-muted-foreground">
          Seven sprints build the thirteen SRS modules. Each tab below is a working increment demonstrated to the owner; Gate G4 tests that all seven are demonstrated and no severity-1/2 defects remain open.
        </p>
        <RuleNote lang={lang} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sprints.map((s) => (
          <button key={s.key} onClick={() => onTab(s.tab)} className="rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{s.key} · {s.name}</span>
              <Badge variant="outline" className="font-mono text-[10px]">{s.modules}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.highlight}</p>
            {s.count != null && <p className="mt-2 text-xs font-medium">{s.count} record{s.count === 1 ? "" : "s"} in scope</p>}
          </button>
        ))}
        <button onClick={() => onTab("evidence")} className="rounded-lg border border-dashed bg-white p-4 text-left transition-colors hover:border-primary/40">
          <div className="text-sm font-semibold">Evidence & Gates</div>
          <p className="mt-1 text-xs text-muted-foreground">Phase 3 promotion evidence, traceability closure and the Gate G4 exit checklist.</p>
        </button>
      </div>
    </div>
  );
}
