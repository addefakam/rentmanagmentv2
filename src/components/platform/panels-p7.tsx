// ============================================================================
// panels-p7.tsx — Phase 7 increment: Data Migration, Training and Pilot
// (plan §5.8). Renders the /api/phase7 evidence: legacy registry books with
// the migration register (Dir. Art. 8(2)), reconciliation reports (Dir.
// Art. 13), the role-and-tier training curriculum with competence records,
// the active pilot with its day logs and the Gate G7 exit check, and the
// trilingual awareness materials (Proc. Arts. 14, 16) awaiting the owner's
// approval. Officers act through capability-guarded buttons.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Panel, DataTable, StatusBadge, Stat, ActionButton, TabRail, useHashTab } from "./kit";
import type { Lang } from "./types";
import { t } from "./i18n";

type BookRow = {
  id: string; bookRef: string; pageNo: number; entryNo: number;
  landlordName: string; tenantName: string; houseAddress: string;
  monthlyRent: number; leaseYears: number; scanAttached: boolean; migrated: boolean;
  woreda: { id: string; code: string; nameEn: string };
};
type MigrationRow = { id: string; status: string; note: string | null; migratedBy: string; migratedAt: string; woreda: { code: string }; file: { fileNumber: string; status: string } };
type ReconRow = { id: string; bookCount: number; migratedCount: number; platformCount: number; variance: number; balanced: boolean; createdAt: string; woreda: { code: string } };
type CourseRow = { id: string; code: string; titleEn: string; tierScope: string; audienceRole: string; durationHours: number; legalBasis: string; sessions: { id: string; trainees: { id: string; name: string; roleCode: string; attendance: string; assessmentScore: number | null; competence: string | null }[] }[] };
type DayLog = { id: string; seq: number; date: string; woredaCode: string; filesOpened: number; filesRegistered: number; avgCycleMinutes: number; checklistCompliancePct: number; replicationCorrect: boolean; severity: string; incidents: string | null };
type ExitCheck = {
  ready: boolean;
  checks: { criterion: string; basis: string; pass: boolean; detail: string }[];
  metrics: { daysLogged: number; woredas: string[]; avgCycleMinutes: number | null; avgChecklistPct: number | null; replicationCorrectPct: number | null; sev1Count: number; balancedWoredas: number; totalBookRows: number; missingRoles: string[]; awarenessByBasis: Record<string, { total: number; approved: number }> };
};
type AwarenessRow = { id: string; basis: string; channel: string; titleEn: string; titleAm: string; titleOm: string; bodyEn: string; status: string; ownerApprovalRef: string | null };
type P7Payload = {
  books: BookRow[]; migrations: MigrationRow[]; reconciliations: ReconRow[];
  latestByWoreda: ReconRow[]; courses: CourseRow[];
  pilot: { id: string; subCity: { code: string; nameEn: string }; woredaCodes: string; startedAt: string; plannedWeeks: number; ownerApprovalRef: string; active: boolean; dayLogs: DayLog[] } | null;
  awareness: AwarenessRow[]; exit: ExitCheck;
};

export function PilotPanel({ lang }: { lang: Lang; refresh?: () => Promise<void> }) {
  const [data, setData] = useState<P7Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab] = useHashTab(["migration", "pilot", "awareness"], "migration");

  const load = async () => {
    try {
      const res = await fetch("/api/phase7", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setData(json.data as P7Payload);
      else setError(String(json.error ?? "Phase 7 payload unavailable"));
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => { load(); }, []);

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/phase7", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-staff-code": String(payload.actor ?? "STF-0001") },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) await load();
      else setError(String(json.error ?? "Action failed"));
    } finally { setBusy(false); }
  };

  if (error) {
    return <Panel title="Phase 7 · Migration, Training & Pilot" subtitle="Evidence unavailable"><p className="text-sm text-red-600">{error}</p></Panel>;
  }
  if (!data) {
    return <Panel title="Phase 7 · Migration, Training & Pilot" subtitle="Loading evidence…"><p className="text-sm text-muted-foreground">Loading Phase 7 payload…</p></Panel>;
  }

  const exit = data.exit;
  const pendingByWoreda = new Map<string, number>();
  for (const b of data.books) {
    if (!b.migrated) pendingByWoreda.set(b.woreda.id, (pendingByWoreda.get(b.woreda.id) ?? 0) + 1);
  }
  const woredaIds = [...new Set(data.books.map((b) => ({ id: b.woreda.id, code: b.woreda.code })))].filter(
    (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i,
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Legacy migration" value={`${data.migrations.length}/${data.books.length} rows`} hint="Dir. Art. 8(2) annotated intake" />
        <Stat label="Reconciliation" value={`${data.latestByWoreda.filter((r) => r.balanced).length}/${data.latestByWoreda.length} woredas balanced`} hint="Dir. Art. 13 custody" />
        <Stat label="Pilot day logs" value={`${exit.metrics.daysLogged} entries`} hint={data.pilot ? `${data.pilot.subCity.code} · ${data.pilot.woredaCodes.split(",").length} woredas` : "no pilot"} />
        <Stat label="Gate G7 exit" value={exit.ready ? "READY" : "NOT READY"} hint={exit.ready ? "no SEV1 · reconciled · replication 100%" : `${exit.checks.filter((c) => !c.pass).length} check(s) failing`} />
      </div>

      <TabRail
        active={tab}
        ariaLabel="Migration, training and pilot sections"
        tabs={[
          { key: "migration", label: "Migration & training", count: data.books.length, hint: "Legacy book rows (Proc. Art. 7), reconciliation, training records" },
          { key: "pilot", label: "Pilot operation", count: exit.metrics.daysLogged, hint: "Day logs and the Gate G7 exit check" },
          { key: "awareness", label: "Awareness materials", count: data.awareness.length, hint: "Trilingual campaign materials (Proc. Arts. 14, 16)" },
        ]}
      />

      {tab === "migration" ? (
      <>
      <Panel
        title="Legacy registry-book migration (Proc. Art. 7; Dir. Art. 8(2))"
        subtitle="Paper book rows of the pilot woredas enter the platform as parties + property + registered file, each carrying the LEGACY_ART7 annotation and its 30+3 day clock."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {woredaIds.map((w) => (
            <ActionButton key={w.id} disabled={busy || (pendingByWoreda.get(w.id) ?? 0) === 0}
              onClick={() => act({ kind: "migrate", woredaId: w.id, actor: "STF-0001" })}>
              Migrate {w.code}{(pendingByWoreda.get(w.id) ?? 0) > 0 ? ` (${pendingByWoreda.get(w.id)} pending)` : " — done"}
            </ActionButton>
          ))}
          <ActionButton variant="outline" disabled={busy}
            onClick={() => act({ kind: "reconcile", actor: "STF-0003" })}>
            Reconcile all woredas
          </ActionButton>
          <ActionButton variant="outline" onClick={load}>Refresh</ActionButton>
        </div>
        <DataTable
          headers={["Woreda", "Book / page / entry", "Parties (landlord → tenant)", "Rent", "Term", "Scan", "State"]}
          rows={data.books.slice(0, 30).map((b) => [
            <span key={b.id} className="font-mono text-[10px]">{b.woreda.code}</span>,
            <span key={`bk-${b.id}`} className="font-mono text-[10px] text-muted-foreground">{b.bookRef} p.{b.pageNo} e.{b.entryNo}</span>,
            <span key={`pt-${b.id}`} className="block max-w-[240px] text-[10px]">{b.landlordName} → {b.tenantName}</span>,
            <span key={`r-${b.id}`} className="text-[10px] tabular-nums">{b.monthlyRent.toLocaleString()} ETB</span>,
            <span key={`t-${b.id}`} className="text-[10px] tabular-nums">{b.leaseYears} y</span>,
            <StatusBadge key={`s-${b.id}`} value={b.scanAttached ? "ACTIVE" : "PENDING"} />,
            b.migrated
              ? <Badge key={`m-${b.id}`} variant="outline" className="text-[9px]">MIGRATED</Badge>
              : <Badge key={`m-${b.id}`} variant="destructive" className="text-[9px]">PENDING</Badge>,
          ])}
        />
        {data.books.length > 30 && (
          <p className="mt-2 text-[10px] text-muted-foreground">Showing 30 of {data.books.length} book rows.</p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Reconciliation reports (Dir. Art. 13)" subtitle="Latest report per woreda: paper book vs migration register vs platform.">
          <DataTable
            headers={["Woreda", "Book", "Migrated", "Platform", "Variance", "Balanced"]}
            rows={data.latestByWoreda.map((r) => [
              <span key={r.id} className="font-mono text-[10px] font-bold">{r.woreda.code}</span>,
              <span key={`b-${r.id}`} className="text-[10px] tabular-nums">{r.bookCount}</span>,
              <span key={`m-${r.id}`} className="text-[10px] tabular-nums">{r.migratedCount}</span>,
              <span key={`p-${r.id}`} className="text-[10px] tabular-nums">{r.platformCount}</span>,
              <span key={`v-${r.id}`} className={`text-[10px] tabular-nums font-semibold ${r.variance === 0 ? "" : "text-red-700"}`}>{r.variance}</span>,
              <StatusBadge key={`x-${r.id}`} value={r.balanced ? "REGISTERED" : "REJECTED"} />,
            ])}
          />
        </Panel>

        <Panel title="Training by role and tier (plan §5.8)" subtitle="Curriculum, held sessions and competence records; competence requires attendance and score >= 70.">
          <DataTable
            headers={["Course", "Tier / audience", "Hours", "Sessions", "Competent"]}
            rows={data.courses.map((c) => {
              const trainees = c.sessions.flatMap((s) => s.trainees);
              const competent = trainees.filter((x) => x.competence === "COMPETENT").length;
              return [
                <span key={c.id} className="block max-w-[200px] text-[10px] font-medium">{c.code} — {c.titleEn}</span>,
                <span key={`a-${c.id}`} className="text-[9px] text-muted-foreground">{c.tierScope} · {c.audienceRole}</span>,
                <span key={`h-${c.id}`} className="text-[10px] tabular-nums">{c.durationHours}</span>,
                <span key={`s-${c.id}`} className="text-[10px] tabular-nums">{c.sessions.length}</span>,
                <span key={`c-${c.id}`} className="text-[10px] font-semibold tabular-nums">{competent}/{trainees.length}</span>,
              ];
            })}
          />
        </Panel>
      </div>
      </>
      ) : null}

      {tab === "pilot" ? (
      <Panel
        title="Pilot operation (plan §5.8)"
        subtitle={data.pilot ? `${data.pilot.subCity.nameEn} · woredas ${data.pilot.woredaCodes} · since ${data.pilot.startedAt.slice(0, 10)} · owner approval ${data.pilot.ownerApprovalRef}` : "No active pilot"}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <DataTable
            headers={["Day", "Woreda", "Opened", "Registered", "Cycle (min)", "Checklist %", "Replication", "Severity"]}
            rows={data.pilot?.dayLogs.slice(-18).reverse().map((d) => [
              <span key={d.id} className="font-mono text-[10px]">D{d.seq} {d.date.slice(0, 10)}</span>,
              <span key={`w-${d.id}`} className="font-mono text-[10px]">{d.woredaCode}</span>,
              <span key={`o-${d.id}`} className="text-[10px] tabular-nums">{d.filesOpened}</span>,
              <span key={`r-${d.id}`} className="text-[10px] tabular-nums">{d.filesRegistered}</span>,
              <span key={`c-${d.id}`} className="text-[10px] tabular-nums">{d.avgCycleMinutes}</span>,
              <span key={`x-${d.id}`} className="text-[10px] tabular-nums">{d.checklistCompliancePct}</span>,
              <StatusBadge key={`p-${d.id}`} value={d.replicationCorrect ? "ACTIVE" : "REJECTED"} />,
              <Badge key={`s-${d.id}`} variant={d.severity === "NONE" ? "outline" : d.severity === "SEV4" ? "secondary" : "destructive"} className="text-[9px]">{d.severity}</Badge>,
            ]) ?? []}
          />
          <div className="grid grid-cols-1 gap-2">
            <div className={`rounded-md border p-3 ${exit.ready ? "border-green-600/40 bg-green-50" : "border-red-600/40 bg-red-50"}`}>
              <p className="text-xs font-bold">Gate G7 exit check — {exit.ready ? "ALL CRITERIA MET" : "NOT READY"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                avg cycle {exit.metrics.avgCycleMinutes ?? "—"} min · avg checklist {exit.metrics.avgChecklistPct ?? "—"}% · replication {exit.metrics.replicationCorrectPct ?? "—"}% · SEV1 {exit.metrics.sev1Count} · balanced {exit.metrics.balancedWoredas}/{exit.metrics.woredas.length}
              </p>
            </div>
            <DataTable
              headers={["Exit criterion", "Basis", "Result"]}
              rows={exit.checks.map((c) => [
                <span key={c.criterion} className="block max-w-[220px] text-[10px] font-medium">{c.criterion}</span>,
                <span key={`b-${c.criterion}`} className="text-[9px] text-muted-foreground">{c.basis}</span>,
                <span key={`r-${c.criterion}`} className={c.pass ? "text-[10px] font-bold text-green-700" : "text-[10px] font-bold text-red-700"}>{c.pass ? "PASS" : "FAIL"}</span>,
              ])}
            />
          </div>
        </div>
      </Panel>
      ) : null}

      {tab === "awareness" ? (
      <Panel
        title="Public awareness materials (Proc. Arts. 14, 16; CR-01/NFR-06)"
        subtitle="Trilingual by rule — an item cannot exist without Amharic, English and Afan Oromo titles. The owner approves the materials at Gate G7."
      >
        <DataTable
          headers={["Basis", "Channel", "Amharic", "English", "Afan Oromo", "Status", ""]}
          rows={data.awareness.map((a) => [
            <span key={a.id} className="text-[9px] text-muted-foreground">{a.basis}</span>,
            <Badge key={`c-${a.id}`} variant="outline" className="text-[9px]">{a.channel}</Badge>,
            <span key={`am-${a.id}`} className="block max-w-[160px] text-[10px]" dir="rtl">{a.titleAm}</span>,
            <span key={`en-${a.id}`} className="block max-w-[160px] text-[10px]">{a.titleEn}</span>,
            <span key={`om-${a.id}`} className="block max-w-[160px] text-[10px]">{a.titleOm}</span>,
            <StatusBadge key={`s-${a.id}`} value={a.status === "APPROVED" ? "REGISTERED" : "PENDING"} />,
            a.status !== "APPROVED" && (
              <ActionButton key={`ap-${a.id}`} disabled={busy}
                onClick={() => act({ kind: "awareness-approve", id: a.id, ownerApprovalRef: "G7-OWNER-APPROVAL", actor: "STF-0007" })}>
                Approve
              </ActionButton>
            ),
          ])}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">{t("lang.fallback", lang)}</p>
      </Panel>
      ) : null}
    </div>
  );
}
