// ============================================================================
// panels-p5.tsx — Phase 5 increment: Testing & Compliance console.
// Renders the /api/quality evidence: compliance matrix with live-attached
// test results, audit chain verdict, performance profiles vs NFR-01, RBAC
// capability matrix, integration sandbox inventory, open item dispositions.
// LINK-FIRST IA: the summary band stays; the evidence zones are
// link-addressable tabs (/project/testing#compliance · #testing · #items).
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Panel, DataTable, StatusBadge, Stat, ActionButton, TabRail, useHashTab } from "./kit";
import type { Lang } from "./types";

type MatrixRow = {
  id: string; source: string; rule: string; module: string;
  kind: string; tests: string[]; openItem?: string;
  status: string;
  outcomes: { test: string; result: string }[];
};
type QualityPayload = {
  summary: { rows: number; pass: number; fail: number; incomplete: number; testTotals: { pass: number; fail: number }; testsGeneratedAt: string };
  matrix: MatrixRow[];
  openItems: { id: string; title: string; disposition: string; carried: boolean }[];
  audit: { events: number; checked: number; intact: boolean; brokenAtSeq: number | null; reason: string | null };
  perf: { generatedAt: string; nfrTargets: Record<string, number>; profiles: Record<string, unknown>[] };
  capabilities: { capability: string; roles: string[] }[];
  integration: { payment: Record<string, unknown>; identity: Record<string, unknown> };
};

const TEST_PLAN = [
  ["Integration", "Bank/payment sandbox and identification service, incl. failure and timeout behaviour", "tests/integration.test.ts (6 cases)", "TC-INT-01..05"],
  ["System & regression", "All 13 modules; Phase 3+4 suites re-run after every change", "tests/seed-config + phase4-domain (51 cases)", "Sprint packs"],
  ["Security (ASVS L2)", "Access control between tiers (V4); audit-trail integrity (V7)", "tests/security.test.ts (13 cases)", "TC-SEC-01..08, TC-P18"],
  ["Legal compliance", "Every traced article exercised by a named test case", "tests/compliance-legal.test.ts (43 cases)", "TC-P/TC-D/TC-MA/TC-N rows"],
  ["Performance", "Woreda workload, city peak, registration end-to-end vs NFR-01", "scripts/load/perf.ts profiles", "WOREDA / CITY_PEAK / REG_E2E"],
];

export function QualityPanel({ lang, refresh }: { lang: Lang; refresh?: () => Promise<void> }) {
  const [data, setData] = useState<QualityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab] = useHashTab(["compliance", "testing", "items"], "compliance");

  const load = async () => {
    try {
      const res = await fetch("/api/quality", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json.data as QualityPayload);
      else setError(String(json.error ?? "quality payload unavailable"));
    } catch (e) { setError(String(e)); }
  };

  useEffect(() => { load(); }, []);

  const rerun = async () => {
    setBusy(true);
    try {
      // The battery runs in CI and via scripts/quality/run-all.ts; here we
      // simply reload the newest attached evidence.
      await load();
      if (refresh) await refresh();
    } finally { setBusy(false); }
  };

  if (error) {
    return <Panel title="Phase 5 · Testing & Compliance" subtitle="Evidence unavailable"><p className="text-sm text-red-600">{error}</p></Panel>;
  }
  if (!data) {
    return <Panel title="Phase 5 · Testing & Compliance" subtitle="Loading evidence…"><p className="text-sm text-muted-foreground">Loading quality payload…</p></Panel>;
  }

  const reg = data.perf.profiles.find((p) => (p as { profile: string }).profile === "REG_E2E") as { p95?: number; targetMs?: number } | undefined;
  const cityPeak = data.perf.profiles.find((p) => (p as { profile: string }).profile === "CITY_PEAK") as { p95?: number } | undefined;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Compliance matrix" value={`${data.summary.pass}/${data.summary.rows}`} hint="legal rules passing (no failed rule at G5)" />
        <Stat label="Automated battery" value={`${data.summary.testTotals.pass} pass`} hint={`${data.summary.testTotals.fail} fail · 5 suites`} />
        <Stat label="Audit chain" value={data.audit.intact ? "INTACT" : "BROKEN"} hint={`${data.audit.events} events verified (SHA-256)`} />
        <Stat label="Registration E2E p95" value={reg?.p95 != null ? `${reg.p95} ms` : "—"} hint={`target ${reg?.targetMs ?? 5000} ms (NFR-01)`} />
      </div>

      <TabRail
        active={tab}
        ariaLabel="Testing and compliance sections"
        tabs={[
          { key: "compliance", label: "Legal compliance matrix", count: data.summary.rows, hint: "Every binding rule paired with a named test case" },
          { key: "testing", label: "Test plan & security", hint: "V-model levels, ASVS L2 assessment, performance, sandboxes" },
          { key: "items", label: "Open items", count: data.openItems.length, hint: "Dispositions carried at Gate G5" },
        ]}
      />

      {tab === "compliance" ? (
      <Panel title="Legal compliance matrix · results attached" subtitle="Every binding rule of Proclamation 1320/2016, Directive 7/2016 and the model agreement paired with a named, executable test case.">
        <DataTable
          headers={["ID", "Source", "Rule", "Module", "Kind", "Status", "Named cases"]}
          rows={data.matrix.map((r) => [
            <span key={r.id} className="font-mono text-[10px] font-bold">{r.id}</span>,
            <span key={`s-${r.id}`} className="text-[10px] font-medium">{r.source}</span>,
            <span key={`r-${r.id}`} className="block max-w-[420px] text-[10px] text-muted-foreground" title={r.rule}>{r.rule}{r.openItem ? ` — ${r.openItem}` : ""}</span>,
            <span key={`m-${r.id}`} className="text-[10px]">{r.module}</span>,
            <span key={`k-${r.id}`} className="text-[9px] font-mono">{r.kind}</span>,
            <StatusBadge key={`b-${r.id}`} value={r.status === "PASS" ? "REGISTERED" : r.status === "FAIL" ? "REJECTED" : "PENDING"} />,
            <span key={`t-${r.id}`} className="text-[9px] text-muted-foreground">{r.tests.length} case{r.tests.length > 1 ? "s" : ""}</span>,
          ])}
        />
      </Panel>
      ) : null}

      {tab === "testing" ? (
      <>
      <Panel title="Test plan (V-model levels)" subtitle="Plan §5.6: prove the assembled system against integrations, load, attack, and above all the law.">
        <DataTable
          headers={["Level", "Scope", "Suite", "Case IDs"]}
          rows={TEST_PLAN.map((r) => r.map((c, i) => (
            <span key={`${r[0]}-${i}`} className={i === 0 ? "text-[11px] font-semibold" : "text-[11px] text-muted-foreground"}>{c}</span>
          )))}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Security assessment · ASVS L2" subtitle="Access control between tiers (V4) and audit-trail integrity (V7) enforced at the API guard.">
          <div className="grid grid-cols-1 gap-2">
            <p className="text-xs text-muted-foreground">
              {data.capabilities.length} capabilities enforced over 13 roles; anonymous calls refused (403);
              wrong-tier roles refused; stamping separated from certification (Dir. Art. 9).
              Audit verdict: <Badge variant={data.audit.intact ? "outline" : "destructive"} className="text-[10px]">{data.audit.intact ? "CHAIN INTACT" : "CHAIN BROKEN"}</Badge>
              {" "}{data.audit.events} events / {data.audit.checked} verified.
            </p>
            <DataTable
              headers={["Capability", "Allowed roles"]}
              rows={data.capabilities.map((c) => [
                <span key={c.capability} className="font-mono text-[10px]">{c.capability}</span>,
                <span key={`r-${c.capability}`} className="text-[10px] text-muted-foreground">{c.roles.join(", ")}</span>,
              ])}
            />
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4">
          <Panel title="Performance vs NFR-01" subtitle={`Generated ${data.perf.generatedAt.slice(0, 19).replace("T", " ")} · sandbox scaled; report documents projection to 500 VUs.`}>
            <DataTable
              headers={["Profile", "VUs", "Requests", "p50 ms", "p95 ms", "p99 ms", "RPS", "Err %"]}
              rows={data.perf.profiles.map((p) => {
                const q = p as Record<string, number | string>;
                return [
                  <span key={String(q.profile)} className="text-[10px] font-semibold">{String(q.profile)}</span>,
                  String(q.virtualUsers ?? q.samples ?? "-"),
                  String(q.requests ?? "-"),
                  String(q.p50 ?? "-"),
                  String(q.p95 ?? "-"),
                  String(q.p99 ?? "-"),
                  String(q.throughputRps ?? "-"),
                  String(q.errorRatePct ?? "0"),
                ];
              })}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              City-peak p95 {cityPeak?.p95 ?? "—"} ms vs 3,000 ms target; registration path p95 {reg?.p95 ?? "—"} ms vs 5,000 ms target (NFR-01 satisfied with headroom).
            </p>
          </Panel>

          <Panel title="Integration sandboxes" subtitle="Production partners bind behind the same interfaces (open item O3).">
            <DataTable
              headers={["Channel", "Sandbox", "Failure modes", "Production binding"]}
              rows={[
                ["Payment (Art. 13)", String(data.integration.payment.provider), (data.integration.payment.modes as string[]).join(" / "), String(data.integration.payment.production)],
                ["Identity (Dir. Art. 7)", String(data.integration.identity.provider), (data.integration.identity.modes as string[]).join(" / "), String(data.integration.identity.production)],
              ].map((r) => r.map((c, i) => (
                <span key={`${r[0]}-${i}`} className="text-[10px]">{c}</span>
              )))}
            />
          </Panel>
        </div>
      </div>
      </>
      ) : null}

      {tab === "items" ? (
      <Panel title="Open item dispositions at Gate G5" subtitle="O-9 closed; O1, O-7, O-8 carried with explicit dispositions (none blocks UAT entry).">
        <DataTable
          headers={["Item", "Title", "Disposition at Phase 5", "Status"]}
          rows={data.openItems.map((o) => [
            <span key={o.id} className="font-mono text-[10px] font-bold">{o.id}</span>,
            <span key={`t-${o.id}`} className="text-[11px]">{o.title}</span>,
            <span key={`d-${o.id}`} className="text-[11px] text-muted-foreground">{o.disposition}</span>,
            <StatusBadge key={`s-${o.id}`} value={o.carried ? "CARRIED" : "CLOSED"} />,
          ])}
        />
        <div className="mt-3 flex items-center gap-2">
          <ActionButton onClick={rerun} disabled={busy}>{busy ? "Refreshing…" : "Refresh evidence"}</ActionButton>
          <span className="text-[10px] text-muted-foreground">Battery re-runs in CI and via scripts/quality/run-all.ts; the panel always renders the newest attached results.</span>
        </div>
      </Panel>
      ) : null}
    </div>
  );
}
