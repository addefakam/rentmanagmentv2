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
type HypercareReportRow = { id: string; waveCode: string; dayNumber: number; reportDate: string; ticketsOpened: number; ticketsClosed: number; sev1: number; sev2: number; sev3: number; sev4: number; slaMet: boolean; breaches: string | null; notes: string | null };
type CycleStepRow = { id: string; cycleYear: number; step: string; basis: string; reference: string; executedAt: string; detail: string | null };
type ReferralRow = { id: string; reference: string; kind: string; subject: string; competentBody: string; basisRef: string; amount: number | null; recovered: number; status: string; outcomeRef: string | null; notes: string | null; penaltyCase: { caseNumber: string; status: string } | null };
type FeedRow = { id: string; period: string; reference: string; itemCount: number; hash: string; publishedAt: string; publishedBy: string };
type HandoverRow = { id: string; reference: string; waveCode: string; manualVersion: string; runbookRef: string; signedBy: string; signedAt: string; status: string; notes: string | null };
type PirRow = { id: string; reference: string; waveCode: string; windowFrom: string; windowTo: string; summary: string; conductedBy: string; conductedAt: string; findings: { id: string; category: string; description: string; severity: string; disposition: string; backlogRef: string | null }[] };
type MinuteRow = { id: string; reference: string; lessonsJson: string; transitionsJson: string; openItemsJson: string; status: string; signedBy: string | null; signedAt: string | null; g9Ref: string | null };
type G9Check = { ready: boolean; checks: { criterion: string; basis: string; pass: boolean; detail: string }[]; metrics: Record<string, unknown> };
type OperationsPayload = {
  hypercare: { waveCode: string; daysPlanned: number; daysLogged: number; ticketsOpened: number; ticketsClosed: number; sev1: number; sev2: number; sev3: number; sev4: number; slaMetDays: number; slaPct: number; reports: HypercareReportRow[] };
  handover: HandoverRow | null;
  annualCycle: CycleStepRow[];
  referrals: ReferralRow[];
  feeds: FeedRow[];
  pir: PirRow | null;
  minute: MinuteRow | null;
  g9: G9Check;
};
type P8Payload = {
  waves: WaveRow[]; drills: DrillRow[]; roster: RosterRow[]; hypercare: HypercareRow[];
  freeze: FreezeState; awareness: AwarenessRow[]; sessions: number;
  o7: { rows: O7Row[]; confirmed: number; total: number; closed: boolean; pendingWoredas: number };
  readiness: G8Check; authMode: string; operations: OperationsPayload;
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
  const ops = data.operations;
  const wave1Live = wave1?.status === "LIVE";

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Wave rollout" value={`${data.waves.filter((w) => w.status === "LIVE").length} live / ${data.waves.length} waves`} hint={wave1Live ? "Wave 1 live under the G8 order" : "pilot \u2192 sub-city \u2192 city-wide \u2192 replication prep"} />
        <Stat label="Cutover checklist" value={`${greenCount}/${greenTotal} GREEN`} hint={wave1Live ? "Wave 1 executed; Wave 2 prepared, order pending" : `Wave 1 status: ${wave1?.status ?? "-"}`} />
        <Stat label="Hypercare (28 days)" value={`${ops.hypercare.daysLogged}/${ops.hypercare.daysPlanned} · SLA ${ops.hypercare.slaPct}%`} hint={`tickets ${ops.hypercare.ticketsOpened} · SEV-1: ${ops.hypercare.sev1}`} />
        <Stat label="Gate G9 closure" value={ops.g9.ready ? "READY" : "NOT READY"} hint={ops.g9.ready ? "closure minute drafted — signature requested" : `${ops.g9.checks.filter((c) => !c.pass).length} check(s) failing`} />
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
            disabled={busy || wave1Live}
            onClick={() => {
              if (window.confirm("Give the go-live order for Wave 1 (Bole sub-city, 14 woredas)? This is the Gate G8 decision and switches authentication to production mode.")) {
                act({ kind: "golive-execute", waveCode: "WAVE-1", orderRef: `GATE-G8-${new Date().toISOString().slice(0, 10)}`, actor: "STF-0005" });
              }
            }}
          >
            {wave1Live ? "Go-live order executed (Gate G8)" : "Give go-live order (Gate G8)"}
          </ActionButton>
          <ActionButton
            variant="outline"
            disabled={busy || !wave1Live}
            onClick={() => {
              if (window.confirm("Give the city-wide cutover order for Wave 2 (remaining 10 sub-cities)? Sequencing gates must hold; the PIR records this order as an operations decision.")) {
                act({ kind: "golive-order", waveCode: "WAVE-2", orderRef: `OPS-W2-${new Date().toISOString().slice(0, 10)}`, actor: "STF-0005" });
              }
            }}
          >
            Give Wave 2 order (operations)
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
          <div className="grid grid-cols-1 gap-2 text-[11px]">
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

      <Panel
        title="Gate G9 closure check (plan §5.9: 'Close project at Gate G9 with lessons recorded')"
        subtitle="Every criterion evaluates the operational record under the go-live order: hypercare, the annual cycle, enforcement, the Ministry feed, the handover, the PIR and the drafted closure minute."
      >
        <DataTable
          headers={["Criterion", "Basis", "Verdict", "Detail"]}
          rows={ops.g9.checks.map((c) => [
            <span key={c.criterion} className="text-[11px] font-medium">{c.criterion}</span>,
            <span key={`b-${c.criterion}`} className="text-[10px] text-muted-foreground">{c.basis}</span>,
            c.pass
              ? <Badge key={`p-${c.criterion}`} className="bg-emerald-100 text-emerald-800">PASS</Badge>
              : <Badge key={`p-${c.criterion}`} className="bg-red-100 text-red-800">FAIL</Badge>,
            <span key={`d-${c.criterion}`} className="block max-w-[420px] text-[10px] text-muted-foreground">{c.detail}</span>,
          ])}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Hypercare daily service reports (plan A-42; HC-SCHED-P8-01)"
          subtitle={`${ops.hypercare.daysLogged}/${ops.hypercare.daysPlanned} days · ${ops.hypercare.ticketsOpened} tickets opened, ${ops.hypercare.ticketsClosed} closed · SEV-1 ${ops.hypercare.sev1} · SLA ${ops.hypercare.slaPct}%`}
        >
          <DataTable
            headers={["Day", "Open/Close", "SEV 2/3/4", "SLA", "Notes"]}
            rows={ops.hypercare.reports.slice(-10).reverse().map((r) => [
              <span key={r.id} className="font-mono text-[10px] tabular-nums">D{r.dayNumber}</span>,
              <span key={`t-${r.id}`} className="text-[10px] tabular-nums">{r.ticketsOpened}/{r.ticketsClosed}</span>,
              <span key={`s-${r.id}`} className="text-[10px] tabular-nums">{r.sev2}/{r.sev3}/{r.sev4}</span>,
              r.slaMet
                ? <Badge key={`m-${r.id}`} className="bg-emerald-100 text-emerald-800 text-[10px]">MET</Badge>
                : <Badge key={`m-${r.id}`} className="bg-amber-100 text-amber-800 text-[10px]">MISSED</Badge>,
              <span key={`n-${r.id}`} className="block max-w-[260px] text-[10px] text-muted-foreground">{r.breaches ?? r.notes ?? "—"}</span>,
            ])}
          />
          <p className="mt-2 text-[10px] text-muted-foreground">Showing the latest 10 daily reports of the 28-day arc.</p>
        </Panel>

        <Panel
          title="First annual adjustment cycle (plan A-43; Proc. Art. 8)"
          subtitle="Operated through the real services: Bureau study, June 1 publication, June 30 effect, amendment wave — the effected rate set governs ceilings platform-wide."
        >
          <DataTable
            headers={["Cycle", "Step", "Basis", "Reference / detail"]}
            rows={ops.annualCycle.map((s) => [
              <span key={s.id} className="font-mono text-[10px]">{s.cycleYear}</span>,
              <Badge key={`st-${s.id}`} variant="outline" className="font-mono text-[10px]">{s.step}</Badge>,
              <span key={`b-${s.id}`} className="text-[10px] text-muted-foreground">{s.basis}</span>,
              <span key={`d-${s.id}`} className="block max-w-[300px] text-[10px] text-muted-foreground">{s.detail ?? s.reference}</span>,
            ])}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Penalty referrals & court recovery (plan A-44; Dir. Art. 22)"
          subtitle="Referrals wrap the real penalty-case flow (compute → notify → refer) and track outcomes with the competent bodies."
        >
          <DataTable
            headers={["Ref", "Subject", "Body", "Amount", "Recovered", "Status"]}
            rows={ops.referrals.map((r) => [
              <span key={r.id} className="font-mono text-[10px]">{r.reference}</span>,
              <span key={`s-${r.id}`} className="block max-w-[220px] text-[10px]">{r.subject}</span>,
              <Badge key={`b-${r.id}`} variant="outline" className="text-[10px]">{r.competentBody}</Badge>,
              <span key={`a-${r.id}`} className="text-[10px] tabular-nums">{r.amount != null ? r.amount.toFixed(0) : "—"}</span>,
              <span key={`r-${r.id}`} className="text-[10px] tabular-nums">{r.recovered ? r.recovered.toFixed(0) : "—"}</span>,
              <Badge key={`st-${r.id}`} className={`text-[10px] ${["RESOLVED", "RECOVERED", "CLOSED"].includes(r.status) ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>{r.status}</Badge>,
            ])}
          />
        </Panel>

        <Panel
          title="Ministry feed publications (plan A-45; Dir. Art. 13 hop 3)"
          subtitle="Monthly national aggregates, hash-verified and propagated upward; periods are immutable."
        >
          <DataTable
            headers={["Period", "Reference", "Records", "Payload hash", "Published"]}
            rows={ops.feeds.map((f) => [
              <span key={f.id} className="font-mono text-[10px]">{f.period}</span>,
              <span key={`r-${f.id}`} className="font-mono text-[10px]">{f.reference}</span>,
              <span key={`c-${f.id}`} className="text-[10px] tabular-nums">{f.itemCount}</span>,
              <span key={`h-${f.id}`} className="font-mono text-[10px] text-muted-foreground">{f.hash.slice(0, 16)}…</span>,
              <span key={`p-${f.id}`} className="text-[10px] text-muted-foreground">{new Date(f.publishedAt).toISOString().slice(0, 10)}</span>,
            ])}
          />
          {ops.handover && (
            <div className="mt-3 rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold">{ops.handover.reference} · {ops.handover.manualVersion} / {ops.handover.runbookRef} · {ops.handover.status}</p>
              <p className="text-[10px] text-muted-foreground">Signed by {ops.handover.signedBy}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{ops.handover.notes}</p>
            </div>
          )}
        </Panel>
      </div>

      {ops.pir && (
        <Panel
          title="Ninety-day post-implementation review (plan A-47)"
          subtitle={`${ops.pir.reference} · window ${ops.pir.windowFrom.slice(0, 10)} → ${ops.pir.windowTo.slice(0, 10)} · conducted by ${ops.pir.conductedBy}`}
        >
          <p className="mb-3 text-[11px] text-muted-foreground">{ops.pir.summary}</p>
          <DataTable
            headers={["Category", "Severity", "Finding", "Disposition"]}
            rows={ops.pir.findings.map((f) => [
              <span key={f.id} className="font-mono text-[10px]">{f.category}</span>,
              <Badge key={`s-${f.id}`} variant="outline" className="text-[10px]">{f.severity}</Badge>,
              <span key={`d-${f.id}`} className="block max-w-[420px] text-[10px]">{f.description}</span>,
              <Badge key={`x-${f.id}`} className={`text-[10px] ${f.disposition === "BACKLOG" ? "bg-sky-100 text-sky-800" : f.disposition === "ACCEPTED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {f.disposition}{f.backlogRef ? ` · ${f.backlogRef}` : ""}
              </Badge>,
            ])}
          />
        </Panel>
      )}

      {ops.minute && (
        <Panel
          title="Closure minute (plan A-48; Gate G9)"
          subtitle={`${ops.minute.reference} · ${ops.minute.status}${ops.minute.status === "DRAFT" ? " — signature reserved for the owner's Gate G9 decision" : ` — signed under ${ops.minute.g9Ref}`}`}
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold">Lessons recorded</p>
              <ul className="mt-1 list-inside list-disc text-[10px] text-muted-foreground">
                {(JSON.parse(ops.minute.lessonsJson) as string[]).map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold">BAU transitions</p>
              <ul className="mt-1 list-inside list-disc text-[10px] text-muted-foreground">
                {(JSON.parse(ops.minute.transitionsJson) as string[]).map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold">Final open-item register</p>
              <ul className="mt-1 list-inside list-disc text-[10px] text-muted-foreground">
                {(JSON.parse(ops.minute.openItemsJson) as string[]).map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
