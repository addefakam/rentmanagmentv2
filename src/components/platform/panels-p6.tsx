// ============================================================================
// panels-p6.tsx — Phase 6 increment: User Acceptance & Legal Validation.
// Renders the /api/uat evidence: role-based UAT scripts with attached battery
// results, the legal validation session walkthrough (article-by-article) and
// memorandum, the defect log with severity framework, and the Gate G6
// checklist. A Run button re-executes the battery live (capability uat:run).
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Panel, DataTable, StatusBadge, Stat, ActionButton, SelectField, TabRail, useHashTab } from "./kit";
import type { Lang } from "./types";
import { t } from "./i18n";

type StepResult = { no: number; action: string; expected: string; legalBasis: string; observed: string; result: string; at: string };
type ScenarioRun = { id: string; title: string; role: string; actors: string[]; useCases: string[]; legalBasis: string; verdict: string; stepsPassed: number; stepsFailed: number; stepsSkipped: number; durationMs: number; steps: StepResult[] };
type ScenarioSpec = { id: string; title: string; role: string; actors: string[]; useCases: string[]; legalBasis: string; objective: string; steps: { no: number; action: string; expected: string; legalBasis: string }[] };
type UatPayload = {
  scenarios: ScenarioSpec[];
  lastRun: { runId: string; generatedAt: string; summary: { scenarios: number; scenariosPassed: number; stepsTotal: number; stepsPassed: number; stepsFailed: number; stepsSkipped: number; verdict: string; durationMs: number }; scenarios: ScenarioRun[] } | null;
  localization: { languages: string[]; languageRows: { code: string; nameNative: string; status: string }[]; resourceCount: number; pendingCertification: number; fallbackDeclared: boolean };
  legalSession: {
    session: { date: string; venue: string; chair: string; method: string; scope: string };
    walkthrough: { id: string; source: string; rule: string; module: string; testStatus: string; verdict: string; note: string }[];
    counts: { rows: number; confirmed: number; confirmedWithDisposition: number; deviations: number };
    pendingConfirmations: { id: string; title: string; disposition: string }[];
    conclusion: string;
    memorandum: { reference: string; to: string; from: string; date: string; subject: string; body: string[]; signatories: { role: string; name: string; capacity: string }[] };
  };
  defects: { log: { id: string; title: string; source: string; severity: string; status: string; fixSchedule: string; reTestEvidence: string }[]; openSev12: number; severityDefs: { code: string; name: string; definition: string; fixSchedule: string }[] };
  gateChecklist: { criterion: string; basis: string; evidence: string }[];
};

function verdictBadge(v: string) {
  return <StatusBadge value={v === "PASS" ? "REGISTERED" : v === "CONFIRMED" ? "VERIFIED" : v === "CONFIRMED_W_DISPOSITION" ? "CARRIED" : v === "DEVIATION" ? "REJECTED" : v === "FAIL" ? "REJECTED" : "PENDING"} />;
}

export function UatPanel({ lang }: { lang: Lang; refresh?: () => Promise<void> }) {
  const [data, setData] = useState<UatPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string>("UAT-01");
  const [tab] = useHashTab(["battery", "legal", "defects", "gate"], "battery");

  const load = async () => {
    try {
      const res = await fetch("/api/uat", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json.data as UatPayload);
      else setError(String(json.error ?? "UAT payload unavailable"));
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => { load(); }, []);

  const runBattery = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/uat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-staff-code": "STF-0008" },
      });
      const json = await res.json();
      if (json.ok) await load();
      else setError(String(json.error ?? "UAT run failed"));
    } finally { setBusy(false); }
  };

  if (error) {
    return <Panel title="Phase 6 · UAT & Legal Validation" subtitle="Evidence unavailable"><p className="text-sm text-red-600">{error}</p></Panel>;
  }
  if (!data) {
    return <Panel title="Phase 6 · UAT & Legal Validation" subtitle="Loading evidence…"><p className="text-sm text-muted-foreground">Loading UAT payload…</p></Panel>;
  }

  const run = data.lastRun;
  const spec = data.scenarios.find((s) => s.id === selected);
  const runOf = run?.scenarios.find((s) => s.id === selected);
  const ls = data.legalSession;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="UAT battery" value={run ? `${run.summary.scenariosPassed}/${run.summary.scenarios} scenarios` : "not run"} hint={run ? `${run.summary.stepsPassed}/${run.summary.stepsTotal} steps · ${run.summary.verdict}` : "run the battery to attach results"} />
        <Stat label="Legal walkthrough" value={`${ls.counts.confirmed + ls.counts.confirmedWithDisposition}/${ls.counts.rows}`} hint={`${ls.counts.confirmedWithDisposition} with disposition · ${ls.counts.deviations} deviations`} />
        <Stat label="Memorandum" value={ls.counts.deviations === 0 ? "NO UNRESOLVED" : "DEVIATIONS OPEN"} hint={`ref ${ls.memorandum.reference} · ${ls.memorandum.date}`} />
        <Stat label="Defect log" value={`${data.defects.log.length} entries`} hint={`${data.defects.openSev12} open SEV-1/2 (gate-blocking)`} />
      </div>

      <TabRail
        active={tab}
        ariaLabel="UAT and legal validation sections"
        tabs={[
          { key: "battery", label: "UAT battery", count: data.scenarios.length, hint: "Role-based scripts executed over the live API" },
          { key: "legal", label: "Legal validation", hint: "Article-by-article walkthrough and the memorandum" },
          { key: "defects", label: "Defect triage", count: data.defects.log.length, hint: "Severity framework and fix schedules" },
          { key: "gate", label: "Gate G6 checklist", hint: "Trilingual catalogue and the exit checklist" },
        ]}
      />

      {tab === "battery" ? (
      <Panel
        title="Role-based UAT battery (plan §5.7, activity 1)"
        subtitle="Scripts derived from the SRS use-case registry, executed by the real roles over the live API with their staff codes - refusals included."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ActionButton onClick={runBattery} disabled={busy}>{busy ? "Running battery…" : "Run UAT battery"}</ActionButton>
          <ActionButton variant="outline" onClick={load}>Refresh evidence</ActionButton>
          {run && <span className="text-[10px] text-muted-foreground">last run {run.runId} at {run.generatedAt.slice(0, 19).replace("T", " ")} · {(run.summary.durationMs / 1000).toFixed(1)} s</span>}
        </div>
        <DataTable
          headers={["Script", "Role", "Use cases", "Legal basis", "Verdict", "Steps"]}
          rows={data.scenarios.map((s) => {
            const r = run?.scenarios.find((x) => x.id === s.id);
            return [
              <button key={s.id} onClick={() => setSelected(s.id)} className={`font-mono text-[10px] font-bold ${selected === s.id ? "text-primary underline" : ""}`}>{s.id}</button>,
              <span key={`r-${s.id}`} className="text-[10px]">{s.role}</span>,
              <span key={`u-${s.id}`} className="font-mono text-[9px] text-muted-foreground">{s.useCases.join(", ")}</span>,
              <span key={`l-${s.id}`} className="text-[9px] text-muted-foreground">{s.legalBasis}</span>,
              verdictBadge(r?.verdict ?? "NOT_RUN"),
              <span key={`st-${s.id}`} className="text-[10px] tabular-nums">{r ? `${r.stepsPassed}/${r.steps.length}${r.stepsSkipped ? ` (+${r.stepsSkipped} skip)` : ""}` : `${s.steps.length} scripted`}</span>,
            ];
          })}
        />
        {spec && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold">{spec.id} — {spec.title}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">{spec.objective}</p>
            <DataTable
              headers={["#", "Step (action)", "Expected", "Legal basis", "Observed", "Result"]}
              rows={spec.steps.map((st) => {
                const r = runOf?.steps.find((x) => x.no === st.no);
                return [
                  <span key={`n-${st.no}`} className="font-mono text-[10px]">{st.no}</span>,
                  <span key={`a-${st.no}`} className="block max-w-[280px] text-[10px]">{st.action}</span>,
                  <span key={`e-${st.no}`} className="block max-w-[220px] text-[10px] text-muted-foreground">{st.expected}</span>,
                  <span key={`l-${st.no}`} className="text-[9px] text-muted-foreground">{st.legalBasis}</span>,
                  <span key={`o-${st.no}`} className={`block max-w-[260px] text-[10px] ${r?.result === "FAIL" ? "text-red-700" : "text-muted-foreground"}`}>{r?.observed ?? "—"}</span>,
                  <span key={`res-${st.no}`}>{r ? verdictBadge(r.result === "PASS" ? "PASS" : r.result) : <span className="text-[9px] text-muted-foreground">pending</span>}</span>,
                ];
              })}
            />
          </div>
        )}
      </Panel>
      ) : null}

      {tab === "legal" ? (
      <Panel
        title="Legal validation session (plan §5.7, activity 2)"
        subtitle={`${ls.session.date} · ${ls.session.venue} — article-by-article walkthrough of the compliance matrix with the Bureau's legal function.`}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <DataTable
            headers={["Row", "Source", "Verdict", "Note"]}
            rows={ls.walkthrough.map((w) => [
              <span key={w.id} className="font-mono text-[10px] font-bold">{w.id}</span>,
              <span key={`s-${w.id}`} className="block max-w-[180px] text-[9px] text-muted-foreground">{w.source}</span>,
              verdictBadge(w.verdict),
              <span key={`n-${w.id}`} className="block max-w-[300px] text-[10px] text-muted-foreground">{w.note}</span>,
            ])}
          />
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-semibold">Memorandum {ls.memorandum.reference} — {ls.memorandum.subject}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("lang.fallback", lang)}</p>
              <div className="mt-2 grid gap-2">
                {ls.memorandum.body.map((para, i) => (
                  <p key={i} className={`text-[11px] leading-relaxed ${i === ls.memorandum.body.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{para}</p>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {ls.memorandum.signatories.map((s) => (
                  <Badge key={s.role} variant="outline" className="text-[9px]">{s.role}: {s.name}</Badge>
                ))}
              </div>
            </div>
            <DataTable
              headers={["Pending confirmation", "Title", "Disposition (not a deviation)"]}
              rows={ls.pendingConfirmations.map((p) => [
                <span key={p.id} className="font-mono text-[10px] font-bold">{p.id}</span>,
                <span key={`t-${p.id}`} className="block max-w-[200px] text-[10px]">{p.title}</span>,
                <span key={`d-${p.id}`} className="block max-w-[280px] text-[10px] text-muted-foreground">{p.disposition}</span>,
              ])}
            />
          </div>
        </div>
      </Panel>
      ) : null}

      {tab === "defects" ? (
      <Panel title="Defect triage (plan §5.7, activity 3)" subtitle="Severity definitions with fix schedules; any failed UAT step is triaged here and blocks the gate while open.">
          <DataTable
            headers={["Severity", "Definition", "Fix schedule"]}
            rows={data.defects.severityDefs.map((d) => [
              <span key={d.code} className="font-mono text-[10px] font-bold">{d.code} {d.name}</span>,
              <span key={`d-${d.code}`} className="block max-w-[260px] text-[10px] text-muted-foreground">{d.definition}</span>,
              <span key={`f-${d.code}`} className="block max-w-[200px] text-[10px] text-muted-foreground">{d.fixSchedule}</span>,
            ])}
          />
          <div className="mt-3">
            <DataTable
              headers={["ID", "Defect", "Severity", "Status", "Fix schedule / re-test"]}
              rows={data.defects.log.map((d) => [
                <span key={d.id} className="font-mono text-[10px] font-bold">{d.id}</span>,
                <span key={`t-${d.id}`} className="block max-w-[240px] text-[10px]">{d.title}</span>,
                <span key={`s-${d.id}`} className="text-[10px] font-semibold">{d.severity}</span>,
                <StatusBadge key={`b-${d.id}`} value={d.status === "OPEN" ? "PENDING" : d.status === "SCHEDULED" ? "CARRIED" : "REGISTERED"} />,
                <span key={`f-${d.id}`} className="block max-w-[240px] text-[10px] text-muted-foreground">{d.fixSchedule}</span>,
              ])}
            />
          </div>
        </Panel>
      ) : null}

      {tab === "gate" ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          <Panel title="Trilingual catalogue (CR-01 / NFR-06)" subtitle="Seeded localization surface rehearsed by UAT-08.">
            <DataTable
              headers={["Language", "Native name", "Status"]}
              rows={data.localization.languageRows.map((l) => [
                <span key={l.code} className="font-mono text-[10px] font-bold">{l.code}</span>,
                <span key={`n-${l.code}`} className="text-[11px]">{l.nameNative}</span>,
                <StatusBadge key={`s-${l.code}`} value={l.status === "ACTIVE" ? "ACTIVE" : "PENDING"} />,
              ])}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {data.localization.resourceCount} localization resources · {data.localization.pendingCertification} pending certified glossary (O-8) · fallback declared per NFR-06.
            </p>
          </Panel>
          <Panel title="Gate G6 exit checklist" subtitle="Signed UAT certificate + legal memorandum with no unresolved deviation authorize migration and pilot (Phase 7).">
            <DataTable
              headers={["Criterion", "Basis", "Evidence"]}
              rows={data.gateChecklist.map((g) => [
                <span key={g.criterion} className="block max-w-[240px] text-[10px] font-medium">{g.criterion}</span>,
                <span key={`b-${g.criterion}`} className="text-[9px] text-muted-foreground">{g.basis}</span>,
                <span key={`e-${g.criterion}`} className="block max-w-[260px] text-[10px] text-muted-foreground">{g.evidence}</span>,
              ])}
            />
          </Panel>
        </div>
      </div>
      ) : null}
    </div>
  );
}
