// ============================================================================
// panels-p8.tsx — Phase 8 increment: Go-Live, Operations and Continuous
// Improvement (plan §5.9). Renders the /api/phase8 evidence: the wave rollout
// plan, the Wave 1 cutover checklist with live evidence, go-live drills
// (rollback, restore, session hardening, staging perf re-run), the O-7
// official register confirmation, support roster and hypercare schedule,
// configuration freeze, awareness distribution, and the Gate G8 readiness
// check. The go-live order itself is the owner's Gate G8 decision.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Panel, DataTable, Stat, ActionButton } from "./kit";
import { Badge } from "@/components/ui/badge";
import type { Lang } from "./types";
import { t } from "./i18n";

type WaveRow = {
  id: string; code: string; nameEn: string; scope: string; subCityCode: string | null;
  woredaCodes: string | null; plannedOrder: number; status: string;
  goLiveOrderRef: string | null; cutoverAt: string | null; notes: string | null;
  items: { id: string; seq: number; key: string; description: string; owner: string; basis: string; status: string; evidence: string | null; checkedAt: string | null }[];
};
type DrillRow = { id: string; kind: string; waveCode: string | null; scenario: string; result: string; rtoMinutes: number | null; notes: string | null; ranAt: string; ranBy: string };
type RosterRow = { id: string; tier: string; role: string; assignee: string; backup: string; channel: string; hours: string; escalationLevel: number };
type HypercareRow = { id: string; waveCode: string; days: number; dailyReportTime: string; slaJson: string; signedBy: string; signedAt: string; reference: string; status: string };
type O7Row = { id: string; subCityCode: string; subCityNameEn: string; officialWoredas: number; configuredWoredas: number; verdict: string; sourceRef: string; note: string | null; confirmedAt: string };
type FreezeState = { frozen: boolean; matches: boolean; version: string | null; frozenAt?: string; hash?: string; itemCount?: number };
type G8Check = { ready: boolean; checks: { criterion: string; basis: string; pass: boolean; detail: string }[]; metrics: Record<string, unknown> };
type AwarenessRow = { id: string; basis: string; channel: string; titleEn: string; status: string; ownerApprovalRef: string | null; distributedAt: string | null; distributionRef: string | null };
type P8Payload = {
  waves: WaveRow[]; drills: DrillRow[]; roster: RosterRow[]; hypercare: HypercareRow[];
  freeze: FreezeState; awareness: AwarenessRow[]; sessions: number;
  o7: { rows: O7Row[]; confirmed: number; total: number; closed: boolean; pendingWoredas: number };
  readiness: G8Check; authMode: string;
};

export function GoLivePanel({ lang, refresh }: { lang: Lang; refresh?: () => Promise<void> }) {
  const [data, setData] = useState<P8Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/phase8", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json.data as P8Payload);
      else setError(String(json.error ?? "Phase 8 payload unavailable"));
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => { load(); }, []);

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/phase8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-staff-code": String(payload.actor ?? "STF-0008") },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) await load();
      else setError(String(json.error ?? "Action failed"));
    } finally { setBusy(false); }
  };

  if (error) {
    return <Panel title="Phase 8 · Go-Live & Operations" subtitle="Evidence unavailable"><p className="text-sm text-red-600">{error}</p></Panel>;
  }
  if (!data) {
    return <Panel title="Phase 8 · Go-Live & Operations" subtitle="Loading evidence…"><p className="text-sm text-muted-foreground">Loading Phase 8 payload…</p></Panel>;
  }

  const wave1 = data.waves.find((w) => w.code === "WAVE-1");
  const greenCount = wave1?.items.filter((i) => i.status === "GREEN").length ?? 0;
  const greenTotal = wave1?.items.length ?? 0;
  const latestDrill = (kind: string) => data.drills.find((d) => d.kind === kind);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Wave rollout" value={`${data.waves.filter((w) => w.status === "LIVE").length} live / ${data.waves.length} waves`} hint="pilot → sub-city → city-wide → replication prep" />
        <Stat label="Cutover checklist" value={`${greenCount}/${greenTotal} GREEN`} hint={wave1?.status === "READY" ? "Wave 1 READY — awaiting the G8 order" : `Wave 1 status: ${wave1?.status ?? "-"}`} />
        <Stat label="O-7 register confirmation" value={`${data.o7.confirmed}/${data.o7.total} sub-cities`} hint={data.o7.closed ? "closed — all 118 woreda entries confirmed" : `${data.o7.pendingWoredas} woreda entries pending`} />
        <Stat label="Gate G8" value={data.readiness.ready ? "READY" : "NOT READY"} hint={data.readiness.ready ? "cutover checklist green — go-live order requested" : `${data.readiness.checks.filter((c) => !c.pass).length} check(s) failing`} />
      </div>

      <Panel
        title="Gate G8 readiness check (plan §5.9: 'Give go-live order')"
        subtitle="Every criterion is evaluated against live platform state; the go-live order executes only on a fully green board."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "checklist-execute", waveCode: "WAVE-1", actor: "STF-0008" })}>
            Re-run cutover checklist
          </ActionButton>
          <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "drill-restore", actor: "STF-0008" })}>
            Run restore drill
          </ActionButton>
          <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "drill-rollback", actor: "STF-0008" })}>
            Run rollback drill
          </ActionButton>
          <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "o7-confirm", actor: "STF-0008" })}>
            Re-confirm O-7 register
          </ActionButton>
          <ActionButton
            disabled={busy || !data.readiness.ready || data.authMode !== "demo"}
            onClick={() => {
              if (window.confirm("Give the go-live order for Wave 1 (Bole sub-city, 14 woredas)? This is the Gate G8 decision and switches authentication to production mode.")) {
                act({ kind: "golive-order", waveCode: "WAVE-1", orderRef: `GATE-G8-${new Date().toISOString().slice(0, 10)}`, actor: "STF-0005" })
                  .then(() => act({ kind: "auth-mode", mode: "production", actor: "STF-0008" }));
              }
            }}
          >
            Give go-live order (Gate G8)
          </ActionButton>
          {data.authMode === "production" && (
            <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "auth-mode", mode: "demo", actor: "STF-0008" })}>
              Return to demo authentication
            </ActionButton>
          )}
          <ActionButton variant="ghost" onClick={load}>Refresh</ActionButton>
        </div>
        <DataTable
          headers={["Criterion", "Basis", "Verdict", "Detail"]}
          rows={data.readiness.checks.map((c) => [
            <span key={c.criterion} className="text-[11px] font-medium">{c.criterion}</span>,
            <span key={`b-${c.criterion}`} className="text-[10px] text-muted-foreground">{c.basis}</span>,
            c.pass
              ? <Badge key={`p-${c.criterion}`} className="bg-emerald-100 text-emerald-800">PASS</Badge>
              : <Badge key={`p-${c.criterion}`} className="bg-red-100 text-red-800">FAIL</Badge>,
            <span key={`d-${c.criterion}`} className="block max-w-[420px] text-[10px] text-muted-foreground">{c.detail}</span>,
          ])}
        />
        <p className="mt-2 text-[10px] text-muted-foreground">
          Authentication mode: <span className="font-mono">{data.authMode}</span> · active sessions: {data.sessions} · {t("lang.fallback", lang)}
        </p>
      </Panel>

      <Panel
        title="Wave rollout plan (pilot → pilot sub-city → city-wide → replication preparation)"
        subtitle="Wave 0 has been live since the Phase 7 pilot under the owner's authorization; Wave 1 carries the full cutover checklist; Wave 2 is gated on O-7; Wave 3 prepares per-city configuration sets."
      >
        <DataTable
          headers={["Wave", "Scope", "Coverage", "Status", "Order reference", "Notes"]}
          rows={data.waves.map((w) => [
            <span key={w.id} className="font-mono text-[10px] font-semibold">{w.code}</span>,
            <span key={`s-${w.id}`} className="text-[10px]">{w.scope}</span>,
            <span key={`c-${w.id}`} className="text-[10px]">{w.woredaCodes ? w.woredaCodes.split(",").length + " woredas" : w.scope === "SUB_CITY" ? "all woredas of the sub-city" : w.scope === "CITY_WIDE" ? "remaining 10 sub-cities" : "other cities (config sets)"}</span>,
            <Badge key={`st-${w.id}`} variant="outline" className={`text-[10px] ${w.status === "LIVE" ? "border-emerald-300 text-emerald-700" : w.status === "READY" ? "border-sky-300 text-sky-700" : ""}`}>{w.status}</Badge>,
            <span key={`o-${w.id}`} className="font-mono text-[10px] text-muted-foreground">{w.goLiveOrderRef ?? "—"}</span>,
            <span key={`n-${w.id}`} className="block max-w-[260px] text-[10px] text-muted-foreground">{w.notes}</span>,
          ])}
        />
      </Panel>

      <Panel
        title="Wave 1 cutover checklist (plan §9.5 — each item carries owner, basis and evidence)"
        subtitle="Executed against live platform state: reconciliation, training, support, rollback, awareness, freeze, restore, hypercare, staging perf re-run and session hardening."
      >
        <DataTable
          headers={["#", "Item", "Owner", "Basis", "Status", "Evidence"]}
          rows={(wave1?.items ?? []).map((i) => [
            <span key={`${i.key}-n`} className="text-[10px] tabular-nums">{i.seq}</span>,
            <span key={`${i.key}-d`} className="block max-w-[240px] text-[10px] font-medium">{i.description}</span>,
            <span key={`${i.key}-o`} className="text-[10px]">{i.owner}</span>,
            <span key={`${i.key}-b`} className="text-[10px] text-muted-foreground">{i.basis}</span>,
            <Badge key={`${i.key}-s`} className={`text-[10px] ${i.status === "GREEN" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{i.status}</Badge>,
            <span key={`${i.key}-e`} className="block max-w-[360px] text-[10px] text-muted-foreground">{i.evidence}</span>,
          ])}
        />
      </Panel>

      <Panel
        title="Go-live drills (rollback · restore · session hardening · staging performance re-run)"
        subtitle="Restore and rollback drills execute real platform operations; the hardening drill transcripts the DEF-06-01 production-mode drill; the perf re-run is the standing item carried from the Phase 5 assessment."
      >
        <DataTable
          headers={["Kind", "Scenario", "Result", "RTO", "Notes", "Ran"]}
          rows={data.drills.slice(0, 8).map((d) => [
            <Badge key={`${d.id}-k`} variant="outline" className="font-mono text-[10px]">{d.kind}</Badge>,
            <span key={`${d.id}-s`} className="block max-w-[300px] text-[10px]">{d.scenario}</span>,
            <Badge key={`${d.id}-r`} className={`text-[10px] ${d.result === "PASS" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{d.result}</Badge>,
            <span key={`${d.id}-t`} className="text-[10px] tabular-nums">{d.rtoMinutes != null ? `${d.rtoMinutes} min` : "—"}</span>,
            <span key={`${d.id}-n`} className="block max-w-[300px] text-[10px] text-muted-foreground">{d.notes}</span>,
            <span key={`${d.id}-a`} className="text-[10px] text-muted-foreground">{new Date(d.ranAt).toLocaleString()}</span>,
          ])}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="O-7 official register confirmation"
          subtitle={data.o7.closed ? "Closed: the register confirms the configured structure in every sub-city." : "Open: structure corrections required before the city-wide wave."}
        >
          <DataTable
            headers={["Sub-city", "Register", "Configured", "Verdict"]}
            rows={data.o7.rows.map((r) => [
              <span key={r.id} className="text-[10px]">{r.subCityNameEn}</span>,
              <span key={`o-${r.id}`} className="text-[10px] tabular-nums">{r.officialWoredas}</span>,
              <span key={`c-${r.id}`} className="text-[10px] tabular-nums">{r.configuredWoredas}</span>,
              <Badge key={`v-${r.id}`} className={`text-[10px] ${r.verdict === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{r.verdict}</Badge>,
            ])}
          />
        </Panel>

        <Panel title="Support arrangements & hypercare (plan §5.9)" subtitle="Roster, escalation tree and the signed daily-report schedule with agreed service levels.">
          <DataTable
            headers={["Level", "Role", "Assignee", "Backup", "Hours"]}
            rows={data.roster.map((r) => [
              <span key={r.id} className="font-mono text-[10px]">L{r.escalationLevel}</span>,
              <span key={`ro-${r.id}`} className="block max-w-[150px] text-[10px]">{r.role}</span>,
              <span key={`as-${r.id}`} className="text-[10px]">{r.assignee}</span>,
              <span key={`bk-${r.id}`} className="text-[10px] text-muted-foreground">{r.backup}</span>,
              <span key={`ho-${r.id}`} className="text-[10px] text-muted-foreground">{r.hours}</span>,
            ])}
          />
          {data.hypercare.map((h) => (
            <div key={h.id} className="mt-3 rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold">{h.reference} · {h.days} days · daily report {h.dailyReportTime} · {h.status}</p>
              <p className="text-[10px] text-muted-foreground">Signed by {h.signedBy}</p>
              <ul className="mt-1 list-inside list-disc text-[10px] text-muted-foreground">
                {Object.entries(JSON.parse(h.slaJson) as Record<string, string>).map(([k, v]) => (
                  <li key={k}><span className="font-mono">{k}</span>: {v}</li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Configuration freeze & authentication posture" subtitle="The governed configuration set is hash-frozen; the DEF-06-01 read-path hardening is armed and drilled.">
          <div className="grid gap-2 text-[11px]">
            <p><span className="font-medium">Freeze:</span> {data.freeze.frozen ? `${data.freeze.version} · ${data.freeze.itemCount} items · hash ${data.freeze.hash?.slice(0, 16)}… · ${data.freeze.matches ? "verified" : "MISMATCH"}` : "not frozen"}</p>
            <p><span className="font-medium">Auth mode:</span> <span className="font-mono">{data.authMode}</span> {data.authMode === "demo" ? "(console review surface open; production enforcement armed)" : "(production sessions required on guarded reads)"}</p>
            <p><span className="font-medium">Latest drills:</span> RESTORE {latestDrill("RESTORE")?.result ?? "-"} · ROLLBACK {latestDrill("ROLLBACK")?.result ?? "-"} · SESSION_HARDENING {latestDrill("SESSION_HARDENING")?.result ?? "-"} · PERF_RERUN {latestDrill("PERF_RERUN")?.result ?? "-"}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <ActionButton variant="outline" disabled={busy} onClick={() => act({ kind: "freeze-config", actor: "STF-0008" })}>Re-freeze configuration</ActionButton>
            </div>
          </div>
        </Panel>

        <Panel title="Awareness distribution (Proc. Arts. 14, 16)" subtitle="Materials approved at Gate G7 and distributed through the campaign channels.">
          <DataTable
            headers={["Basis", "Channel", "Material", "Status"]}
            rows={data.awareness.map((a) => [
              <span key={a.id} className="text-[10px]">{a.basis}</span>,
              <span key={`ch-${a.id}`} className="font-mono text-[10px]">{a.channel}</span>,
              <span key={`ti-${a.id}`} className="block max-w-[220px] text-[10px]">{a.titleEn}</span>,
              <Badge key={`st-${a.id}`} className={`text-[10px] ${a.distributedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{a.distributedAt ? "DISTRIBUTED" : a.status}</Badge>,
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
