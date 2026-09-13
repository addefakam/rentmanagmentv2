// ============================================================================
// panels-settings.tsx — City Settings (Dir. Art. 14 per-city rule sets).
// LINK-FIRST IA: the editors are link-addressable zones — one per screen,
// opened on demand (/settings#org · /settings#staff ·
// /settings#identity · /settings#federal · /settings#ladder):
//   1. Org hierarchy    — sub-cities and woredas (M13) with trilingual names
//   2. Staff register   — officers of this city (city admin only)
//   3. City identity    — trilingual names, currency, work week, canonical lang
//   4. Federal register — national regulations reflected to every city (read-only)
//   5. Penalty ladder   — M9 offense catalogue values (Dir. Art. 22)
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { t } from "./i18n";
import { call } from "./panels-s1";
import { useBoot } from "./shell";
import { Panel, Field, TextField, SelectField, ActionButton, DataTable, StatusBadge, TabRail, useHashTab } from "./kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import type { OrgUnit, PenaltyParam } from "./types";

// ---------------------------------------------------------------------------
// 1 + 2 — identity and statutory parameters share one form per city.
// ---------------------------------------------------------------------------
function CityConfigForm() {
  const { boot, refresh } = useBoot();
  const cfg = boot?.cityConfig;
  const [form, setForm] = useState<Record<string, string> | null>(null);

  const value = (k: string, fallback = "") => form?.[k] ?? (cfg ? String((cfg as unknown as Record<string, unknown>)[k] ?? fallback) : fallback);
  const set = (k: string, v: string) => setForm({ ...(form ?? {}), [k]: v });

  if (!cfg) return <p className="text-sm text-muted-foreground">No city configuration loaded.</p>;

  const save = async () => {
    const data = await call("/api/settings", "PATCH", {
      cityCode: cfg.cityCode,
      nameEn: value("nameEn"), nameAm: value("nameAm"), nameOm: value("nameOm"),
      currency: value("currency", "ETB"), workWeek: value("workWeek", "MON-FRI"),
      canonicalLang: value("canonicalLang", "am"),
      minLeaseYears: value("minLeaseYears", "2"), maxPrepayMonths: value("maxPrepayMonths", "2"),
      complaintDecisionDays: value("complaintDecisionDays", "30"), appealDays: value("appealDays", "15"),
    });
    if (data) {
      toast.success(`${data.cityCode} configuration saved`);
      setForm(null);
      await refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="City name (English)"><TextField value={value("nameEn")} onChange={(e) => set("nameEn", e.target.value)} /></Field>
        <Field label="የከተማ ስም (አማርኛ)"><TextField value={value("nameAm")} onChange={(e) => set("nameAm", e.target.value)} /></Field>
        <Field label="Magaalaa (Afaan Oromoo)"><TextField value={value("nameOm")} onChange={(e) => set("nameOm", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Currency"><TextField value={value("currency", "ETB")} onChange={(e) => set("currency", e.target.value)} /></Field>
        <Field label="Work week">
          <SelectField value={value("workWeek", "MON-FRI")} onChange={(v) => set("workWeek", v)}
            options={[{ value: "MON-FRI", label: "Mon–Fri" }, { value: "MON-SAT", label: "Mon–Sat" }]} />
        </Field>
        <Field label="Primary legal language (CR-01)">
          <SelectField value={value("canonicalLang", "am")} onChange={(v) => set("canonicalLang", v)}
            options={[{ value: "am", label: "Amharic" }, { value: "om", label: "Afaan Oromoo" }, { value: "en", label: "English" }]} />
        </Field>
        <Field label="City code (read-only)"><TextField value={cfg.cityCode} disabled /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Min lease years (Proc. Art. 6)"><TextField type="number" min="1" value={value("minLeaseYears", "2")} onChange={(e) => set("minLeaseYears", e.target.value)} /></Field>
        <Field label="Max advance months (Proc. Art. 12)"><TextField type="number" min="0" value={value("maxPrepayMonths", "2")} onChange={(e) => set("maxPrepayMonths", e.target.value)} /></Field>
        <Field label="Complaint decision days (Proc. Art. 22)"><TextField type="number" min="1" value={value("complaintDecisionDays", "30")} onChange={(e) => set("complaintDecisionDays", e.target.value)} /></Field>
        <Field label="Appeal window days (Proc. Art. 24)"><TextField type="number" min="1" value={value("appealDays", "15")} onChange={(e) => set("appealDays", e.target.value)} /></Field>
      </div>
      <div><ActionButton onClick={save}>Save city configuration</ActionButton></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3 — penalty ladder editor (values editable; catalogue per Dir. Art. 22).
// ---------------------------------------------------------------------------
function LadderEditor() {
  const { boot, refresh } = useBoot();
  const [draft, setDraft] = useState({ code: "", offenseEn: "", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: "", valueMax: "", basisRef: "Dir. Art. 22" });
  const rows = boot?.penaltyParams ?? [];

  const patch = async (id: string, data: Record<string, unknown>) => {
    const out = await call("/api/penalty-ladder", "PATCH", { id, ...data });
    if (out) { toast.success(`${out.code} updated`); await refresh(); }
  };
  const remove = async (row: PenaltyParam) => {
    const out = await call("/api/penalty-ladder", "DELETE", { id: row.id });
    if (out) { toast.success(out.deleted ? `${out.code} deleted` : `${out.code} deactivated (in use by penalty cases)`); await refresh(); }
  };
  const create = async () => {
    const out = await call("/api/penalty-ladder", "POST", draft);
    if (out) { toast.success(`${out.code} added to the ladder`); setDraft({ code: "", offenseEn: "", valueType: "MULTIPLE_OF_MONTHLY_RENT", valueMin: "", valueMax: "", basisRef: "Dir. Art. 22" }); await refresh(); }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <DataTable
        headers={["Code", "Offense", "Kind", "Range", "Basis", "State", "Acts"]}
        rows={rows.map((r) => [
          <span key={r.id} className="font-mono text-[10px]">{r.code}</span>,
          <span key={`o-${r.id}`} className="block max-w-[240px] text-[10px]">{r.offenseEn}</span>,
          <span key={`v-${r.id}`} className="text-[10px]">{r.valueType.replace(/_/g, " ").toLowerCase()}</span>,
          <span key={`r-${r.id}`} className="text-[10px] tabular-nums">
            {r.valueMin ?? "—"}{r.valueMax != null ? ` – ${r.valueMax}` : "+"}
          </span>,
          <span key={`b-${r.id}`} className="text-[10px]">{r.basisRef}</span>,
          r.isActive ? <StatusBadge key={`s-${r.id}`} value="ACTIVE" /> : <StatusBadge key={`s-${r.id}`} value="CLOSED" />,
          <span key={`a-${r.id}`} className="flex flex-wrap gap-1">
            <ActionButton variant="outline" onClick={() => patch(r.id, { isActive: !r.isActive })}>{r.isActive ? "Disable" : "Enable"}</ActionButton>
            <ActionButton variant="ghost" onClick={() => remove(r)}>Delete</ActionButton>
          </span>,
        ])}
        empty="No ladder rows."
      />
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold">Add an offense row</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label="Code"><TextField value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="PEN-SUBLET" /></Field>
          <Field label="Offense (English)"><TextField value={draft.offenseEn} onChange={(e) => setDraft({ ...draft, offenseEn: e.target.value })} /></Field>
          <Field label="Value kind">
            <SelectField value={draft.valueType} onChange={(v) => setDraft({ ...draft, valueType: v })}
              options={[
                { value: "MULTIPLE_OF_MONTHLY_RENT", label: "Multiple of monthly rent" },
                { value: "PERCENT", label: "Percent" },
                { value: "PERCENT_PER_CASH_PAYMENT", label: "Percent per cash payment" },
              ]} />
          </Field>
          <Field label="Value min"><TextField type="number" value={draft.valueMin} onChange={(e) => setDraft({ ...draft, valueMin: e.target.value })} /></Field>
          <Field label="Value max"><TextField type="number" value={draft.valueMax} onChange={(e) => setDraft({ ...draft, valueMax: e.target.value })} /></Field>
          <Field label="Legal basis"><TextField value={draft.basisRef} onChange={(e) => setDraft({ ...draft, basisRef: e.target.value })} /></Field>
        </div>
        <div className="mt-2"><ActionButton onClick={create} disabled={!draft.code || !draft.offenseEn}>Add row</ActionButton></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4 — org hierarchy editor: add sub-cities / woredas with trilingual names,
// and EDIT existing ones (EN / Amharic / Oromoo) via the row Edit dialog.
// Codes are permanent — they anchor file numbers, staff assignments and the
// establishment register (O-7); only the three names are editable.
// NOTE: actions run as the SIGNED-IN officer (no hardcoded actor) — the city
// scope wall rejects any unit reference outside the officer's own city.
// ---------------------------------------------------------------------------
function OrgEditor() {
  const { boot, refresh, officer } = useBoot();
  const units = boot?.orgUnits ?? [];
  const bureaus = useMemo(() => units.filter((u) => u.tier === "BUREAU"), [units]);
  const [bureauId, setBureauId] = useState("");
  const effectiveBureau = bureauId || bureaus[0]?.id || "";
  const subCities = units.filter((u) => u.tier === "SUB_CITY" && u.parentId === effectiveBureau);
  const [scId, setScId] = useState("");
  const effectiveSc = scId || subCities[0]?.id || "";
  const woredas = units.filter((u) => u.tier === "WOREDA" && u.parentId === effectiveSc);

  const [unit, setUnit] = useState({ tier: "WOREDA", code: "", nameEn: "", nameAm: "", nameOm: "" });
  const create = async () => {
    const parentId = unit.tier === "SUB_CITY" ? effectiveBureau : effectiveSc;
    const out = await call("/api/org-units", "POST", { ...unit, parentId }, officer.staffCode);
    if (out) { toast.success(`${out.code} registered (pending official register, O-7)`); setUnit({ tier: "WOREDA", code: "", nameEn: "", nameAm: "", nameOm: "" }); await refresh(); }
  };

  // Row editing — trilingual names via dialog (codes stay permanent).
  const [edit, setEdit] = useState<OrgUnit | null>(null);
  const [editForm, setEditForm] = useState({ nameEn: "", nameAm: "", nameOm: "" });
  const [busy, setBusy] = useState(false);
  const openEdit = (u: OrgUnit) => { setEdit(u); setEditForm({ nameEn: u.nameEn, nameAm: u.nameAm, nameOm: u.nameOm }); };
  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    const out = await call("/api/org-units", "PATCH", { id: edit.id, ...editForm }, officer.staffCode) as { code?: string } | null;
    setBusy(false);
    if (out) { toast.success(`${out.code ?? edit.code} updated`); setEdit(null); await refresh(); }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Bureau">
          <SelectField value={effectiveBureau} onChange={setBureauId}
            options={bureaus.map((b) => ({ value: b.id, label: `${b.code} — ${b.nameEn}` }))} />
        </Field>
        <Field label="Sub-city (for woreda edits)">
          <SelectField value={effectiveSc} onChange={setScId}
            options={subCities.map((s) => ({ value: s.id, label: `${s.code} — ${s.nameEn}` }))} />
        </Field>
      </div>

      <DataTable
        headers={["Code", "Tier", "Names (EN · AM · OM)", "Status", "Actions"]}
        rows={[...subCities, ...woredas].map((u) => [
          <span key={u.id} className="font-mono text-[10px]">{u.code}</span>,
          <span key={`t-${u.id}`} className="text-[10px]">{u.tier.replace("_", " ")}</span>,
          <span key={`n-${u.id}`} className="block max-w-[260px]">
            <span className="block text-[11px] font-semibold">{u.nameEn}</span>
            <span className="block text-[10px] text-muted-foreground">{u.nameAm} · {u.nameOm}</span>
          </span>,
          <span key={`c-${u.id}`} className="text-[10px] text-muted-foreground">
            {u.tier === "SUB_CITY" ? `${units.filter((w) => w.parentId === u.id).length} woredas` : u.confirmationStatus === "CONFIRMED" ? "confirmed" : "pending O-7"}
          </span>,
          <ActionButton key={`a-${u.id}`} variant="outline" onClick={() => openEdit(u)}>Edit</ActionButton>,
        ])}
        empty="No units under this bureau."
      />

      {/* Edit dialog — trilingual names (code is permanent) ---------------- */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {edit?.tier === "SUB_CITY" ? "sub-city" : "woreda"} {edit?.code}</DialogTitle>
            <DialogDescription>
              Correct the unit&apos;s trilingual names. The code {edit?.code} is permanent — it anchors file numbers, staff assignments and the establishment register (O-7).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Name (English)"><TextField value={editForm.nameEn} onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))} /></Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="ስም (አማርኛ)"><TextField value={editForm.nameAm} onChange={(e) => setEditForm((f) => ({ ...f, nameAm: e.target.value }))} /></Field>
              <Field label="Maqaa (Afaan Oromoo)"><TextField value={editForm.nameOm} onChange={(e) => setEditForm((f) => ({ ...f, nameOm: e.target.value }))} /></Field>
            </div>
          </div>
          <DialogFooter>
            <ActionButton variant="ghost" onClick={() => setEdit(null)}>Cancel</ActionButton>
            <ActionButton onClick={saveEdit} disabled={busy || !editForm.nameEn.trim()}>
              {busy ? "Saving…" : "Save changes"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold">Register a new unit</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <Field label="Level">
            <SelectField value={unit.tier} onChange={(v) => setUnit({ ...unit, tier: v })}
              options={[{ value: "WOREDA", label: "Woreda" }, { value: "SUB_CITY", label: "Sub-city" }]} />
          </Field>
          <Field label="Code"><TextField value={unit.code} onChange={(e) => setUnit({ ...unit, code: e.target.value.toUpperCase() })} placeholder="AA-BOLE-W15" /></Field>
          <Field label="Name (English)"><TextField value={unit.nameEn} onChange={(e) => setUnit({ ...unit, nameEn: e.target.value })} /></Field>
          <Field label="ስም (አማርኛ)"><TextField value={unit.nameAm} onChange={(e) => setUnit({ ...unit, nameAm: e.target.value })} /></Field>
          <Field label="Maqaa (Oromoo)"><TextField value={unit.nameOm} onChange={(e) => setUnit({ ...unit, nameOm: e.target.value })} /></Field>
        </div>
        <div className="mt-2">
          <ActionButton onClick={create} disabled={!unit.code || !unit.nameEn || (unit.tier === "WOREDA" && !effectiveSc)}>
            Register unit
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5 — staff register: the city super-admin adds and manages the officers of
// ONE city (sign-in code auto-issued). System admins do the same for any
// city they view. Capability: staff:manage (CITY_ADMIN, SYSTEM_ADMIN).
// ---------------------------------------------------------------------------
const CITY_ROLE_CODES = [
  "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
  "BUREAU_HEAD", "COMMITTEE_MEMBER", "CITY_ADMIN",
];

function StaffRegister() {
  const { boot, refresh, officer } = useBoot();
  const [draft, setDraft] = useState({ fullName: "", roleCode: "WOREDA_REGISTRAR", orgUnitId: "", language: "en" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ staffCode: string; fullName: string } | null>(null);
  const staff = boot?.staff ?? [];
  const roles = (boot?.roles ?? []).filter((r) => CITY_ROLE_CODES.includes(r.code));
  const units = boot?.orgUnits ?? [];

  const add = async () => {
    setBusy(true);
    const out = await call("/api/staff", "POST", draft, officer.staffCode) as { staffCode: string; fullName: string; message: string } | null;
    setBusy(false);
    if (out) {
      setCreated({ staffCode: out.staffCode, fullName: out.fullName });
      toast.success(out.message);
      setDraft({ fullName: "", roleCode: "WOREDA_REGISTRAR", orgUnitId: "", language: draft.language });
      await refresh();
    }
  };
  const toggle = async (u: { id?: string; staffCode: string; isActive?: boolean }) => {
    if (!u.id) return;
    setBusy(true);
    const out = await call("/api/staff", "PATCH", { id: u.id, isActive: !u.isActive }, officer.staffCode) as { message: string } | null;
    setBusy(false);
    if (out) { toast.success(out.message); await refresh(); }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <DataTable
        headers={["Code", "Officer", "Role", "Office", "State", "Action"]}
        rows={staff.map((u) => [
          <span key={u.staffCode} className="font-mono text-[10px]">{u.staffCode}</span>,
          <span key={`n-${u.staffCode}`} className="text-[11px] font-semibold">{u.fullName}</span>,
          <span key={`r-${u.staffCode}`} className="text-[10px]">{u.role?.nameEn ?? u.roleCode}</span>,
          <span key={`o-${u.staffCode}`} className="font-mono text-[10px]">{u.orgUnit?.code ?? "—"}</span>,
          u.isActive ? <StatusBadge key={`s-${u.staffCode}`} value="ACTIVE" /> : <StatusBadge key={`s-${u.staffCode}`} value="CLOSED" />,
          u.id && u.staffCode !== officer.staffCode ? (
            <ActionButton key={`a-${u.staffCode}`} variant="outline" disabled={busy} onClick={() => void toggle(u)}>
              {u.isActive ? "Deactivate" : "Reactivate"}
            </ActionButton>
          ) : (
            <span key={`a-${u.staffCode}`} className="text-[10px] text-muted-foreground">—</span>
          ),
        ])}
        empty="No staff registered in this city yet."
      />

      {created ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <p className="font-semibold text-emerald-900">{created.fullName} registered — sign-in code {created.staffCode}.</p>
          <p className="text-emerald-800">Hand over the code: it is the officer’s sign-in credential for {boot?.cityConfig?.nameEn ?? "this city"}.</p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold">Add an officer to {boot?.cityConfig?.nameEn ?? "this city"}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Field label="Full name"><TextField value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="e.g. Kebebe Tsegaye" /></Field>
          <Field label="Role">
            <SelectField value={draft.roleCode} onChange={(v) => setDraft({ ...draft, roleCode: v })}
              options={roles.map((r) => ({ value: r.code, label: r.nameEn }))} />
          </Field>
          <Field label="Home office">
            <SelectField value={draft.orgUnitId} onChange={(v) => setDraft({ ...draft, orgUnitId: v })}
              options={units.map((u) => ({ value: u.id, label: `${u.code} — ${u.nameEn}` }))}
              placeholder="select office" />
          </Field>
          <Field label="Language">
            <SelectField value={draft.language} onChange={(v) => setDraft({ ...draft, language: v })}
              options={[{ value: "am", label: "አማርኛ" }, { value: "en", label: "English" }, { value: "om", label: "Afaan Oromoo" }]} />
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionButton onClick={add} disabled={busy || !draft.fullName.trim() || !draft.orgUnitId}>Register officer</ActionButton>
          <span className="text-[11px] text-muted-foreground">Staff codes are issued automatically (STF-####) and serve as the sign-in code. National roles are federal appointments and cannot be created from a city.</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function SettingsPage() {
  const { boot, officer } = useBoot();
  const canManageStaff = officer.roleCode === "CITY_ADMIN" || officer.roleCode === "SYSTEM_ADMIN";
  const tabs = [
    { key: "org", label: "Organization hierarchy", hint: "Sub-cities and woredas (M13)" },
    ...(canManageStaff ? [{ key: "staff", label: "Staff register", hint: "Officers of this city — add, deactivate, reactivate" }] : []),
    { key: "identity", label: "City identity & parameters", hint: "The per-city rule set (Dir. Art. 14)" },
    { key: "federal", label: "Federal register", hint: "National regulations reflected to every city" },
    { key: "ladder", label: "Penalty ladder", hint: "M9 offense catalogue values (Dir. Art. 22)" },
  ];
  const [tab] = useHashTab(tabs.map((x) => x.key), "org");
  if (!boot) return null;
  return (
    <div className="grid grid-cols-1 gap-4">
      <TabRail active={tab} ariaLabel="City settings sections" tabs={tabs} />
      {tab === "identity" ? (
        <Panel title="City identity & statutory parameters" subtitle="Per-city rule set (Dir. Art. 14). Changes take effect immediately; the statutory clock params drive complaints and appeal windows.">
          <CityConfigForm />
        </Panel>
      ) : null}
      {tab === "federal" ? <NationalRegulationsCard /> : null}
      {tab === "staff" && canManageStaff ? (
        <Panel title="Staff register" subtitle="The city’s officers: add new staff, issue sign-in codes, deactivate or reactivate accounts, and move officers between offices. City admin authority stops at this city’s boundary.">
          <StaffRegister />
        </Panel>
      ) : null}
      {tab === "ladder" ? (
        <Panel title="Penalty ladder (M9 · Dir. Art. 22)" subtitle="The Directive’s offense catalogue; values are configurable parameters (open item O1). Rows referenced by penalty cases are deactivated, never deleted.">
          <LadderEditor />
        </Panel>
      ) : null}
      {tab === "org" ? (
        <Panel title="Organization hierarchy (M13 · Dir. Arts. 2, 6)" subtitle="Sub-cities and woredas of the city bureau. New units enter PENDING_OFFICIAL_REGISTER until reconciled with the establishment register (O-7).">
          <OrgEditor />
        </Panel>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// National regulation register — REFLECTED TO EVERY CITY (owner directive).
// Regulations, modifications and model changes added by the System Super
// User land in ONE national register; every city console reads the same
// entries here. Read-only at city level — the register is managed from the
// National Management center by the super user.
// ---------------------------------------------------------------------------
function NationalRegulationsCard() {
  const { officer } = useBoot();
  const [regs, setRegs] = useState<Array<{ id: string; code: string; titleEn: string; type: string; year: number; note?: string; addedBy: string; addedAt: string }> | null>(null);

  useEffect(() => {
    let alive = true;
    call("/api/national", "GET", null, officer.staffCode).then((d) => {
      if (!alive) return;
      if (d && Array.isArray((d as { regulations?: unknown }).regulations)) {
        setRegs((d as { regulations: Array<{ id: string; code: string; titleEn: string; type: string; year: number; note?: string; addedBy: string; addedAt: string }> }).regulations);
      }
    });
    return () => { alive = false; };
  }, [officer.staffCode]);

  return (
    <Panel title="National regulations & model changes (federal)" subtitle="Issued by the System Super User — one national register, automatically in force for EVERY city. Read-only here; managed from the National Management center.">
      {!regs ? (
        <p className="py-2 text-sm text-muted-foreground">Loading the national register…</p>
      ) : regs.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No national regulations issued yet — the register is maintained by the System Super User.</p>
      ) : (
        <DataTable
          headers={["Code", "Title", "Type", "Year", "Issued"]}
          empty="—"
          rows={regs.map((r) => [
            <span key={r.id} className="font-mono text-xs">{r.code}</span>,
            <span key={`${r.id}-t`}>{r.titleEn}{r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}</span>,
            r.type,
            String(r.year),
            `${new Date(r.addedAt).toISOString().slice(0, 10)} · ${r.addedBy}`,
          ])}
        />
      )}
    </Panel>
  );
}
