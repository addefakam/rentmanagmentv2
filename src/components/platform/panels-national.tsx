"use client";

// ============================================================================
// panels-national.tsx — NATIONAL MANAGEMENT center for the System Super User
// (owner directives). LINK-FIRST IA: the four zones are TABS — each opens on
// demand instead of stacking everything on one page ("i prefer links instead
// of so many content on single page ... use the space properly"):
//   1. Overview — fleet statistics + the live management-duty statuses.
//   2. Cities — the per-city management table.
//   3. Regulations — the national regulation register; entries are REFLECTED
//      TO EVERY CITY automatically (every city console reads the register).
//   4. Model contracts — push a new contract version with section amendments
//      to ALL active cities in one action (Proc. Art. 5; Dir. 4).
// Registry, Operations and Project tools are intentionally NOT part of this
// surface — they stay with the city tiers.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { call } from "./panels-s1";
import { useBoot } from "./shell";
import { Panel, Stat, Field, TextField, SelectField, ActionButton, DataTable, StatusBadge, TabRail, useHashTab } from "./kit";
import { t } from "./i18n";

type Stats = {
  cities: { total: number; active: number; suspended: number; deactivated: number };
  officers: number; parties: number; properties: number;
  files: { total: number; inProgress: number; registered: number; rejected: number };
  payments: { count: number; amount: number };
  complaints: { total: number; open: number; decided: number };
  adjustments: { published: number; draft: number };
  publications: number; auditEvents30d: number;
  deadlines: { open: number; overdue: number };
};
type Task = { key: string; label: string; status: string; detail: string };
type CityRow = { cityCode: string; nameEn: string; status: string; isActive: boolean; officers: number; files: number; complaintsOpen: number; contractVersion: string | null };
type Regulation = { id: string; code: string; titleEn: string; titleAm?: string; type: string; year: number; note?: string; status: string; addedBy: string; addedAt: string };
type SectionRef = { code: string; titleEn: string };
type Payload = {
  scope: string; stats: Stats; tasks: Task[]; rows: CityRow[]; regulations: Regulation[];
  sections: SectionRef[]; federalVersion: string | null;
};
type PropResult = { cityCode: string; created: boolean; version?: string; detail?: string };

const TABS = [
  { key: "overview", labelKey: "nat.tab.overview" },
  { key: "cities", labelKey: "nat.tab.cities" },
  { key: "regulations", labelKey: "nat.tab.regulations" },
  { key: "contracts", labelKey: "nat.tab.contracts" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const TAB_KEYS: readonly string[] = TABS.map((x) => x.key);

export function NationalManagementPage() {
  const { officer, lang } = useBoot();
  const [tab] = useHashTab(TAB_KEYS, "overview");
  const [data, setData] = useState<Payload | null>(null);
  const [propResults, setPropResults] = useState<PropResult[] | null>(null);

  const load = useCallback(async () => {
    const d = await call("/api/national", "GET", null, officer.staffCode);
    if (d) setData(d as Payload);
  }, [officer.staffCode]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const d = await call("/api/national", "GET", null, officer.staffCode);
      if (alive && d) setData(d as Payload);
    })();
    return () => { alive = false; };
  }, [officer.staffCode]);

  if (!data) return <p className="px-1 py-6 text-sm text-muted-foreground">Loading national management data…</p>;
  if (data.scope !== "SYSTEM_ADMIN") {
    return (
      <Panel title="National regulation register" subtitle="Federal regulations and model changes issued by the System Super User — one national register, reflected in every city.">
        <RegulationTable regulations={data.regulations} canManage={false} onChanged={load} staffCode={officer.staffCode} />
      </Panel>
    );
  }
  const s = data.stats;
  const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(s.payments.amount);

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Tab rail — the access layer: each zone is a LINK (e.g.
          /platform/management#regulations) and renders only when opened. */}
      <TabRail
        active={tab}
        ariaLabel="National management sections"
        tabs={TABS.map((x) => ({ key: x.key, label: t(x.labelKey, lang) }))}
      />

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-4">
          <Panel title="Fleet statistics" subtitle={`The national picture across all ${s.cities.total} tenant cities — registry, operations, payments and audit posture.`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Active cities" value={s.cities.active} hint={`${s.cities.suspended} suspended · ${s.cities.deactivated} deactivated`} />
              <Stat label="Officers" value={s.officers} hint="active accounts, all cities" />
              <Stat label="Parties" value={s.parties} hint="landlords · tenants · agents" />
              <Stat label="Properties" value={s.properties} hint="registered dwellings" />
              <Stat label="Registration files" value={s.files.total} hint={`${s.files.inProgress} in progress · ${s.files.registered} registered`} />
              <Stat label="Payments" value={`${money} ETB`} hint={`${s.payments.count} receipts · electronic only`} />
              <Stat label="Open complaints" value={s.complaints.open} hint={`${s.complaints.decided} decided of ${s.complaints.total}`} />
              <Stat label="Rent adjustments" value={s.adjustments.published} hint={`${s.adjustments.draft} in draft`} />
              <Stat label="Publications" value={s.publications} hint="public notices issued" />
              <Stat label="Audit events (30d)" value={s.auditEvents30d} hint="tamper-evident chain" />
              <Stat label="Deadline clocks" value={s.deadlines.open} hint={s.deadlines.overdue > 0 ? `${s.deadlines.overdue} OVERDUE` : "none overdue"} />
              <Stat label="Federal model contract" value={data.federalVersion ?? "—"} hint="version in force" />
            </div>
          </Panel>

          <Panel title="Management duties" subtitle="What the super user must keep healthy — live status from the platform itself.">
            <div className="grid gap-2">
              {data.tasks.map((t2) => (
                <div key={t2.key} className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{t2.label}</p>
                    <p className="text-xs text-muted-foreground">{t2.detail}</p>
                  </div>
                  <StatusBadge value={t2.status === "OK" ? "REGISTERED" : "OVERDUE"} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "cities" ? (
        <Panel title="Per-city management table" subtitle="Every tenant city: staffing, registry volume, open disputes and the model contract version in force.">
          <DataTable
            headers={["City", "Status", "Officers", "Files", "Open complaints", "Contract version"]}
            empty="No cities onboarded yet."
            rows={data.rows.map((r) => [
              `${r.nameEn} (${r.cityCode})`,
              <StatusBadge key={r.cityCode} value={r.status} />,
              String(r.officers),
              String(r.files),
              String(r.complaintsOpen),
              r.contractVersion ?? "—",
            ])}
          />
        </Panel>
      ) : null}

      {tab === "regulations" ? (
        <Panel title="National regulation register" subtitle="Add a new regulation, modification or model change here — the entry is immediately REFLECTED TO ALL CITIES: every city console reads this same national register (visible in each city's Settings page).">
          <RegulationManager regulations={data.regulations} onChanged={load} staffCode={officer.staffCode} />
        </Panel>
      ) : null}

      {tab === "contracts" ? (
        <Panel title="Model contract propagation (fleet-wide)" subtitle={`Amend the federal model contract (${data.federalVersion ?? "n/a"}) into a new version and push it to EVERY active city in one action. Cities keep per-city version numbers (<CITY>-suffix); the parity duty in Overview turns green when all match.`}>
          <ContractPropagation sections={data.sections} onDone={(results) => { setPropResults(results); void load(); }} staffCode={officer.staffCode} />
          {propResults ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Propagation result — {propResults.filter((r) => r.created).length} of {propResults.length} cities updated:</p>
              <DataTable
                headers={["City", "Outcome", "Version / detail"]}
                empty="No result."
                rows={propResults.map((r) => [
                  r.cityCode,
                  r.created ? <StatusBadge key={`${r.cityCode}-ok`} value="REGISTERED" /> : <StatusBadge key={`${r.cityCode}-ko`} value="REJECTED" />,
                  r.created ? (r.version ?? "") : (r.detail ?? ""),
                ])}
              />
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RegulationTable({ regulations, canManage, onChanged, staffCode }: {
  regulations: Regulation[]; canManage: boolean; onChanged: () => void; staffCode: string;
}) {
  const active = regulations.filter((r) => r.status === "ACTIVE");
  return (
    <div className="grid gap-3">
      <DataTable
        headers={["Code", "Title", "Type", "Year", "Added"]}
        empty="No national regulations on the register yet."
        rows={active.map((r) => [
          <span key={r.id} className="font-mono text-xs">{r.code}</span>,
          <span key={`${r.id}-t`}>{r.titleEn}{r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}</span>,
          r.type,
          String(r.year),
          `${new Date(r.addedAt).toISOString().slice(0, 10)} · ${r.addedBy}`,
        ])}
      />
      {canManage && active.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {active.map((r) => (
            <ActionButton key={`arc-${r.id}`} onClick={async () => {
              await call("/api/national", "POST", { action: "ARCHIVE_REGULATION", id: r.id }, staffCode);
              onChanged();
            }}>Archive {r.code}</ActionButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
function RegulationManager({ regulations, onChanged, staffCode }: {
  regulations: Regulation[]; onChanged: () => void; staffCode: string;
}) {
  const [code, setCode] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [type, setType] = useState("REGULATION");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await call("/api/national", "POST", {
        action: "ADD_REGULATION", code, titleEn, type, year: Number(year), note,
      }, staffCode);
      setCode(""); setTitleEn(""); setNote("");
      onChanged();
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4">
      <RegulationTable regulations={regulations} canManage onChanged={onChanged} staffCode={staffCode} />
      <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Code (e.g. Reg. 435/2025)"><TextField value={code} onChange={(e) => setCode(e.target.value)} placeholder="Reg. 435/2025" /></Field>
        <Field label="Title (English)"><TextField value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Federal rent ceiling modification…" /></Field>
        <Field label="Instrument type">
          <SelectField value={type} onChange={setType} placeholder="Type"
            options={["PROCLAMATION", "REGULATION", "DIRECTIVE", "MODIFICATION", "MODEL_CHANGE"].map((v) => ({ value: v, label: v }))} />
        </Field>
        <Field label="Year"><TextField value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" /></Field>
        <Field label="Note (optional)"><TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed and why" /></Field>
        <div className="sm:col-span-2 lg:col-span-5">
          <ActionButton onClick={add} disabled={!code || !titleEn || busy}>{busy ? "Adding…" : "Add to the national register (reflected to all cities)"}</ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ContractPropagation({ sections, onDone, staffCode }: {
  sections: SectionRef[]; onDone: (results: PropResult[]) => void; staffCode: string;
}) {
  const [suffix, setSuffix] = useState("");
  const [note, setNote] = useState("");
  const [sectionCode, setSectionCode] = useState(sections[0]?.code ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!sectionCode && sections.length > 0) setSectionCode(sections[0].code); }, [sections, sectionCode]);

  const propagate = async () => {
    setBusy(true);
    try {
      const res = await call("/api/national", "POST", {
        action: "PROPAGATE_MODEL_CONTRACT",
        suffix, note,
        changes: [{ sectionCode, contentEn: content }],
      }, staffCode);
      if (res && Array.isArray((res as { results?: PropResult[] }).results)) {
        onDone((res as { results: PropResult[] }).results);
        setSuffix(""); setContent("");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New version suffix (applied to every city, e.g. 1.1)"><TextField value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="1.1" /></Field>
        <Field label="Amendment note"><TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the change (Dir. Art. 4)" /></Field>
        <Field label="Section to amend">
          <SelectField value={sectionCode} onChange={setSectionCode} placeholder="Section"
            options={sections.map((s) => ({ value: s.code, label: `${s.code} — ${s.titleEn}` }))} />
        </Field>
        <Field label="New English content for the section">
          <textarea
            className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="The revised clause text applied in every city…"
            aria-label="New section content"
          />
        </Field>
      </div>
      <div>
        <ActionButton onClick={propagate} disabled={!suffix || !sectionCode || !content || busy}>
          {busy ? "Propagating…" : "Propagate new version to ALL active cities"}
        </ActionButton>
        <p className="mt-2 text-xs text-muted-foreground">
          One action amends every active city&rsquo;s contract: each city receives version &lt;CITY&gt;-suffix with the amended section; all other sections are carried over unchanged; the previous version is kept as SUPERSEDED (audit-logged).
        </p>
      </div>
    </div>
  );
}
