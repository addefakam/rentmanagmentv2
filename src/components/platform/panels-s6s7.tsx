// ============================================================================
// panels-s6s7.tsx — Sprint S6 (M7 control & monitoring + M9 penalty ladder)
// and Sprint S7 (M10 replication & backup + M11 analytics & publication).
// LINK-FIRST IA: zones are link-addressable tabs (/enforcement#control ·
// /enforcement#penalties · /reports#replication · /reports#analytics).
// ============================================================================

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { Panel, Field, TextField, SelectField, BoolField, ActionButton, DataTable, StatusBadge, RuleBadge, Stat, TabRail, useHashTab } from "./kit";
import { call } from "./panels-s1";

type PanelProps = { boot: BootPayload; lang: Lang; refresh: () => Promise<void> };
const fmtDate = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "—");

export function EnforcementPanel({ boot, lang, refresh }: PanelProps) {
  const subCities = useMemo(() => boot.orgUnits.filter((o) => o.tier === "SUB_CITY"), [boot.orgUnits]);
  const [team, setTeam] = useState({ teamCode: "CT-BOLE-01", subCityId: "", members: "Inspector One, Inspector Two" });
  const [visit, setVisit] = useState({ teamId: "", propertyId: "", origin: "OWN_INITIATIVE", findings: "", violations: "", vacancyMonths: "" });
  const [pen, setPen] = useState({ offenseCode: "PEN-UNREG-RENT", propertyId: "", monthlyRentRef: "", vacancyYears: "" });

  const createTeam = async () => {
    const data = await call("/api/control", "POST", { kind: "team", ...team, subCityId: team.subCityId || subCities[0]?.id });
    if (data) { toast.success(`${data.teamCode} formed at ${data.subCity.code}`); await refresh(); }
  };
  const recordVisit = async () => {
    const data = await call("/api/control", "POST", { kind: "visit", ...visit, vacancyMonths: visit.vacancyMonths || undefined });
    if (data) { toast.success(`${data.visitRef} recorded${(data.vacancyMonths ?? 0) > 6 ? " — vacancy beyond 6 months flagged (Dir. Art. 20)" : ""}`); await refresh(); }
  };
  const computePenalty = async () => {
    const data = await call("/api/penalties", "POST", { ...pen, subjectType: pen.offenseCode.startsWith("PEN-VAC") ? "VACANCY_SURCHARGE" : "UNREGISTERED_CONTRACT", monthlyRentRef: pen.monthlyRentRef ? Number(pen.monthlyRentRef) : undefined, vacancyYears: pen.vacancyYears ? Number(pen.vacancyYears) : undefined, basisRef: "Dir. Art. 22; Proc. Arts. 29-32" }, "STF-0005");
    if (data) { toast.success(`${data.caseNumber}: ${data.computedAmount.toLocaleString()} ETB${data.capApplied ? " (capped at 3 months, Proc. Arts. 29-32)" : ""}`); await refresh(); }
  };
  const pAct = async (id: string, action: string, targetBody?: string) => {
    const data = await call("/api/penalties", "PATCH", { id, action, targetBody }, "STF-0005");
    if (data) {
      toast.success(action === "refer" ? `${data.caseNumber} referred to ${targetBody}` : `${data.caseNumber} → ${data.status}`);
      await refresh();
    }
  };

  const [tab] = useHashTab(["control", "penalties"], "control");

  return (
    <div className="grid gap-4">
      <TabRail
        active={tab}
        ariaLabel="Enforcement sections"
        tabs={[
          { key: "control", label: "Control & visits", count: boot.visits.length, hint: "M7 — teams, visits, vacancy monitoring (Proc. Art. 20)" },
          { key: "penalties", label: "Penalty cases", count: boot.penalties.length, hint: "M9 — the fine ladder with 3-month cap (Proc. Arts. 29-32)" },
        ]}
      />

      {tab === "control" ? (
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M7 · Control team & visit" subtitle="Proc. Art. 20: own-initiative and complaint-based control. Dir. Art. 20: team identification duty; vacancy monitoring beyond six months.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Team code"><TextField value={team.teamCode} onChange={(e) => setTeam({ ...team, teamCode: e.target.value })} /></Field>
              <Field label="Sub-city">
                <SelectField value={team.subCityId} onChange={(v) => setTeam({ ...team, subCityId: v })}
                  options={subCities.slice(0, 40).map((s) => ({ value: s.id, label: s.code }))} placeholder="Pick sub-city" />
              </Field>
            </div>
            <Field label="Members"><TextField value={team.members} onChange={(e) => setTeam({ ...team, members: e.target.value })} /></Field>
            <ActionButton variant="secondary" onClick={createTeam}>Form team</ActionButton>
            <div className="mt-1 border-t pt-2" />
            <SelectField value={visit.teamId} onChange={(v) => setVisit({ ...visit, teamId: v })}
              options={boot.teams.map((tm) => ({ value: tm.id, label: `${tm.teamCode} (${tm.subCity.code})` }))} placeholder="Control team" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Property">
                <SelectField value={visit.propertyId} onChange={(v) => setVisit({ ...visit, propertyId: v })}
                  options={boot.properties.slice(0, 60).map((p) => ({ value: p.id, label: p.propertyCode }))} placeholder="Pick property" />
              </Field>
              <Field label="Origin">
                <SelectField value={visit.origin} onChange={(v) => setVisit({ ...visit, origin: v })}
                  options={[{ value: "OWN_INITIATIVE", label: "Own initiative (Art. 20)" }, { value: "COMPLAINT_REFERRAL", label: "Complaint referral" }]} />
              </Field>
            </div>
            <Field label="Findings"><TextField value={visit.findings} onChange={(e) => setVisit({ ...visit, findings: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Observed vacancy (months)"><TextField type="number" value={visit.vacancyMonths} onChange={(e) => setVisit({ ...visit, vacancyMonths: e.target.value })} /></Field>
              <Field label="Violation codes"><TextField value={visit.violations} onChange={(e) => setVisit({ ...visit, violations: e.target.value })} placeholder="PEN-UNREG-RENT, ..." /></Field>
            </div>
            <BoolField checked={visit.identificationShown ?? true} onChange={() => setVisit({ ...visit, identificationShown: visit.identificationShown === false ? true : false })} label="Team identification shown (Dir. Art. 20)" />
            <ActionButton onClick={recordVisit} disabled={!visit.teamId || !visit.propertyId}>{t("act.save", lang)}</ActionButton>
          </div>
        </Panel>
        <Panel title="M7 · Visit log" subtitle="Vacancy observations feed the vacancy-surcharge bands of Dir. Art. 22(8-9).">
          <DataTable
            headers={["Ref", "Team", "Property", "Origin", "Vacancy", "ID shown", "Findings"]}
            rows={boot.visits.map((v) => [
              <span key={v.id} className="font-mono text-[10px]">{v.visitRef}</span>,
              v.team.teamCode, v.property.propertyCode,
              v.origin.replace("_", " "),
              v.vacancyMonths != null ? `${v.vacancyMonths} mo${v.vacancyMonths > 6 ? " ⚠ beyond 6" : ""}` : "—",
              v.identificationShown ? "yes" : "NO",
              <span key={`f-${v.id}`} className="line-clamp-1 max-w-[220px]">{v.findings ?? "—"}</span>,
            ])}
            empty="No visits yet — form a team and record a visit."
          />
        </Panel>
      </div>
      ) : null}

      {tab === "penalties" ? (
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M9 · Compute penalty" subtitle="Proc. Arts. 29-32: fines capped at 3 months' rent. Dir. Art. 22: configurable ladder (O1), cash referral 10%, vacancy surcharge 5-25% of annual rent by band.">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Offense (penalty ladder)">
              <SelectField value={pen.offenseCode} onChange={(v) => setPen({ ...pen, offenseCode: v })}
                options={["PEN-UNREG-RENT", "PEN-LATE-REG", "PEN-UNREG-AMEND", "PEN-UNAUTH-INCREASE", "PEN-ILLEGAL-EVICTION", "PEN-EXCESS-ADVANCE", "PEN-NOTICELESS-TERM", "PEN-VAC-5"].map((c) => ({ value: c, label: c }))}
                placeholder="Offense code" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Monthly rent reference (ETB)"><TextField type="number" value={pen.monthlyRentRef} onChange={(e) => setPen({ ...pen, monthlyRentRef: e.target.value })} /></Field>
              <Field label="Vacancy years (surcharges)"><TextField type="number" step="0.1" value={pen.vacancyYears} onChange={(e) => setPen({ ...pen, vacancyYears: e.target.value })} /></Field>
            </div>
            <ActionButton onClick={computePenalty}>{t("act.create", lang)}</ActionButton>
            <p className="text-[11px] text-muted-foreground">Cash-payment cases arrive automatically from the M6 ledger with the 10% rule pre-computed.</p>
          </div>
        </Panel>
        <Panel title="M9 · Penalty cases, referrals and recovery" subtitle="Notify → pay, or refer to tax / enforcement / court, then track court recovery.">
          <DataTable
            headers={["Case", "Offense", "Amount", "Cap", "Status", "Refs", "Acts"]}
            rows={boot.penalties.map((p) => [
              <span key={p.id} className="font-mono text-[10px]">{p.caseNumber}</span>,
              <span key={`o-${p.id}`} className="text-[10px]">{p.offenseCode}{p.bandPercent ? ` (${p.bandPercent}%)` : ""}</span>,
              `${p.computedAmount.toLocaleString()} ETB`,
              p.capApplied ? <StatusBadge key={`c-${p.id}`} value="REJECTED" /> : "—",
              <StatusBadge key={`s-${p.id}`} value={p.status} />,
              p.referrals.length > 0 ? p.referrals.map((r) => r.targetBody).join(", ") : "—",
              <span key={`a-${p.id}`} className="flex flex-wrap gap-1">
                {p.status === "COMPUTED" && <ActionButton variant="outline" onClick={() => pAct(p.id, "notify")}>Notify</ActionButton>}
                {p.status === "NOTIFIED" && <ActionButton variant="outline" onClick={() => pAct(p.id, "pay")}>Pay</ActionButton>}
                {["NOTIFIED", "COMPUTED"].includes(p.status) && (
                  <>
                    <ActionButton variant="ghost" onClick={() => pAct(p.id, "refer", "TAX_AUTHORITY")}>→Tax</ActionButton>
                    <ActionButton variant="ghost" onClick={() => pAct(p.id, "refer", "ENFORCEMENT_BODY")}>→Enf.</ActionButton>
                  </>
                )}
                {p.status === "REFERRED" && <ActionButton variant="ghost" onClick={() => pAct(p.id, "recover")}>Court recovery</ActionButton>}
              </span>,
            ])}
            empty="No penalty cases — record a cash payment or compute an offense."
          />
        </Panel>
      </div>
      ) : null}
    </div>
  );
}

export function DataPanel({ boot, lang, refresh }: PanelProps) {
  const orgs = useMemo(() => boot.orgUnits.filter((o) => ["WOREDA", "SUB_CITY", "BUREAU", "MINISTRY"].includes(o.tier)), [boot.orgUnits]);
  const [rep, setRep] = useState({ fromOrgUnitId: "", recordType: "REGISTRY_ENTRY", recordRef: "" });
  const [snap, setSnap] = useState({ orgUnitId: "", period: new Date().toISOString().slice(0, 7) });
  const [pub, setPub] = useState({ code: "", category: "STATISTICS", titleEn: "", titleAm: "", titleOm: "", contentEn: "" });

  const replicate = async () => {
    const rows = await call("/api/replication", "POST", rep, "STF-0003");
    if (rows) { toast.success(`${rows.length} hop(s) propagated upward (Dir. Art. 13)`); await refresh(); }
  };
  const computeSnap = async () => {
    const data = await call("/api/analytics", "POST", { orgUnitId: snap.orgUnitId || orgs[0]?.id, period: snap.period }, "STF-0004");
    if (data) { toast.success(`${data.orgUnit.code} ${data.period}: ${data.contractsRegistered} registered, ${data.complaintsReceived} complaints`); await refresh(); }
  };
  const runBackupNow = async (environmentId: string, type: string) => {
    const data = await call("/api/backups", "POST", { environmentId, type, location: "tier-local vault" }, "STF-0008");
    if (data) { toast.success(`${data.environment.stage} ${type} backup succeeded`); await refresh(); }
  };
  const createPub = async () => {
    const data = await call("/api/publications", "POST", pub, "STF-0007");
    if (data) { toast.success(`${data.code} published to the public feed (Proc. Art. 18)`); await refresh(); }
  };

  const bureauTotal = boot.snapshots.find((s) => s.sourceTier === "BUREAU" || s.sourceTier === "MINISTRY");

  const [tab] = useHashTab(["replication", "analytics"], "replication");

  return (
    <div className="grid gap-4">
      {bureauTotal && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Contracts registered (period)" value={bureauTotal.contractsRegistered} />
          <Stat label="Active files" value={bureauTotal.activeFiles} />
          <Stat label="Complaints received" value={bureauTotal.complaintsReceived} />
          <Stat label="Complaints decided" value={bureauTotal.complaintsDecided} />
          <Stat label="Penalties imposed (ETB)" value={bureauTotal.penaltiesImposed.toLocaleString()} />
        </div>
      )}

      <TabRail
        active={tab}
        ariaLabel="Data and reporting sections"
        tabs={[
          { key: "replication", label: "Replication & backups", count: boot.replications.length, hint: "M10 — upward change propagation (Dir. Art. 13)" },
          { key: "analytics", label: "Analytics & publications", count: boot.publications.length, hint: "M11 — aggregation snapshots and the public feed (Proc. Art. 18)" },
        ]}
      />

      {tab === "replication" ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="M10 · Tier replication" subtitle="Dir. Art. 13: woreda → sub-city → Bureau → Ministry upward change propagation. Registry registrations enqueue automatically.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Source unit">
                <SelectField value={rep.fromOrgUnitId} onChange={(v) => setRep({ ...rep, fromOrgUnitId: v })}
                  options={orgs.slice(0, 80).map((o) => ({ value: o.id, label: `${o.tier} ${o.code}` }))} placeholder="Source" />
              </Field>
              <Field label="Record type">
                <SelectField value={rep.recordType} onChange={(v) => setRep({ ...rep, recordType: v })}
                  options={["REGISTRY_ENTRY", "COMPLAINT", "PAYMENT", "SNAPSHOT"].map((r) => ({ value: r, label: r }))} />
              </Field>
            </div>
            <Field label="Record reference"><TextField value={rep.recordRef} onChange={(e) => setRep({ ...rep, recordRef: e.target.value })} placeholder="e.g. file number" /></Field>
            <ActionButton onClick={replicate} disabled={!rep.fromOrgUnitId || !rep.recordRef}>{t("act.run", lang)}</ActionButton>
            <DataTable
              headers={["Batch", "Hop", "From → To", "Record", "Status"]}
              rows={boot.replications.map((r) => [
                <span key={r.id} className="font-mono text-[10px]">{r.batchRef.slice(0, 18)}</span>,
                `${r.hopOrder}`,
                <span key={`p-${r.id}`} className="text-[10px]">{boot.orgUnits.find((o) => o.id === r.fromOrgUnitId)?.code} → {boot.orgUnits.find((o) => o.id === r.toOrgUnitId)?.code}</span>,
                `${r.recordType} ${r.recordRef}`,
                <StatusBadge key={`s-${r.id}`} value={r.status} />,
              ])}
              empty="No replication yet — register a file or propagate a record."
            />
          </div>
        </Panel>

        <Panel title="M10 · Backup runs" subtitle="Environment backup schemes seeded in Phase 3 (Dir. Art. 13): RPO/RTO per tier.">
          <div className="grid grid-cols-1 gap-2">
            <DataTable
              headers={["Environment", "Scheme", "Type", "Status", "When"]}
              rows={boot.backups.map((b) => [
                `${b.environment.name} (${b.environment.stage})`,
                <span key={b.id} className="line-clamp-1 max-w-[200px] text-[10px]">{b.environment.backupScheme}</span>,
                b.type,
                <StatusBadge key={`s-${b.id}`} value={b.status} />,
                fmtDate(b.startedAt),
              ])}
              empty="No backups yet."
            />
            <div className="flex flex-wrap gap-1">
              {boot.environments.map((e) => (
                <ActionButton key={e.id} variant="outline" onClick={() => runBackupNow(e.id, e.stage === "PROD" ? "FULL" : "INCREMENTAL")}>
                  Backup {e.stage}
                </ActionButton>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      ) : null}

      {tab === "analytics" ? (
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="M11 · Aggregation snapshots" subtitle="Proc. Art. 18; Dir. Art. 13: sub-city aggregation duty; Bureau city analytics; Ministry national feed.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Org unit">
                <SelectField value={snap.orgUnitId} onChange={(v) => setSnap({ ...snap, orgUnitId: v })}
                  options={orgs.slice(0, 80).map((o) => ({ value: o.id, label: `${o.tier} ${o.code}` }))} placeholder="Org unit" />
              </Field>
              <Field label="Period"><TextField value={snap.period} onChange={(e) => setSnap({ ...snap, period: e.target.value })} placeholder="YYYY-MM" /></Field>
            </div>
            <ActionButton onClick={computeSnap}>{t("act.run", lang)}</ActionButton>
            <DataTable
              headers={["Unit", "Tier", "Period", "Registered", "Active", "Complaints", "Fines (ETB)"]}
              rows={boot.snapshots.map((s) => [
                s.orgUnit.code, s.sourceTier, s.period,
                String(s.contractsRegistered), String(s.activeFiles),
                `${s.complaintsReceived} / ${s.complaintsDecided}`,
                s.penaltiesImposed.toLocaleString(),
              ])}
              empty="No snapshots — compute one above."
            />
          </div>
        </Panel>

        <Panel title="M11 · Public data feed" subtitle="Proc. Arts. 14, 16, 18: ceilings, calendar, awareness material and statistics published to citizens.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code"><TextField value={pub.code} onChange={(e) => setPub({ ...pub, code: e.target.value })} placeholder="PUB-STAT-001" /></Field>
              <Field label="Category">
                <SelectField value={pub.category} onChange={(v) => setPub({ ...pub, category: v })}
                  options={["CEILING", "CALENDAR", "AWARENESS", "STATISTICS"].map((c) => ({ value: c, label: c }))} />
              </Field>
            </div>
            <Field label="Title (English)"><TextField value={pub.titleEn} onChange={(e) => setPub({ ...pub, titleEn: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ርዕስ (አማርኛ)"><TextField value={pub.titleAm} onChange={(e) => setPub({ ...pub, titleAm: e.target.value })} /></Field>
              <Field label="Mata dorgomaa (Afaan Oromoo)"><TextField value={pub.titleOm} onChange={(e) => setPub({ ...pub, titleOm: e.target.value })} /></Field>
            </div>
            <ActionButton onClick={createPub} disabled={!pub.code || !pub.titleEn}>{t("act.publish", lang)}</ActionButton>
            <DataTable
              headers={["Code", "Category", "Title", "Published"]}
              rows={boot.publications.map((p) => [
                <span key={p.id} className="font-mono text-[10px]">{p.code}</span>,
                p.category,
                <span key={`t-${p.id}`} className="line-clamp-1 max-w-[280px]">{p.titleEn} · {p.titleAm}</span>,
                fmtDate(p.publishedAt),
              ])}
            />
          </div>
        </Panel>
      </div>
      ) : null}
    </div>
  );
}
