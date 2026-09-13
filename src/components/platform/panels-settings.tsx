// ============================================================================
// panels-settings.tsx — City Settings (Dir. Art. 14 per-city rule sets).
// LINK-FIRST IA: the editors are link-addressable zones — one per screen,
// opened on demand (/settings#org · /settings#staff ·
// /settings#identity · /settings#federal · /settings#ladder):
//   1. Org hierarchy    — sub-cities and woredas (M13) with trilingual names
//   2. Staff register   — officers of this scope (sub-city officer / city admin)
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
// 4 — org hierarchy editor. OWNER DIRECTIVE — SUB-CITY DELEGATION: the
// bureau head founds sub-cities (each with its one responsible officer);
// the sub-city officer registers the woredas of his own area; the city
// and system admins keep both tiers. Existing units are EDITABLE
// (EN / Amharic / Oromoo) via the row Edit dialog.
// Codes are permanent — they anchor file numbers, staff assignments and the
// establishment register (O-7); only the three names are editable.
// NOTE: actions run as the SIGNED-IN officer (no hardcoded actor) — the city
// scope wall rejects any unit reference outside the officer's own city.
// ---------------------------------------------------------------------------
function OrgEditor() {
  const { boot, refresh, officer } = useBoot();
  // OWNER DIRECTIVE — SUB-CITY DELEGATION: the bureau head only founds sub-cities
  // (each with its one responsible officer); the sub-city officer registers
  // the woredas of his own area; the city/system admin keeps both tiers.
  const isBureauHead = officer.roleCode === "BUREAU_HEAD";
  const isSubCityOfficer = officer.roleCode === "SUBCITY_MONITOR";
  const units = boot?.orgUnits ?? [];
  const bureaus = useMemo(() => units.filter((u) => u.tier === "BUREAU"), [units]);
  const [bureauId, setBureauId] = useState("");
  const effectiveBureau = bureauId || bureaus[0]?.id || "";
  const subCities = units.filter((u) => u.tier === "SUB_CITY" && u.parentId === effectiveBureau);
  const [scId, setScId] = useState("");
  const effectiveSc = scId || subCities[0]?.id || "";
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  // Every woreda visible in this console is listed and editable — for the
  // sub-city officer that is exactly his own area's woredas (boot scope).
  const allWoredas = useMemo(() => units.filter((u) => u.tier === "WOREDA").sort((a, b) => a.code.localeCompare(b.code)), [units]);
  const mySubCity = isSubCityOfficer ? unitById.get(officer.orgUnitId) : null;

  const defaultTier = isBureauHead ? "SUB_CITY" : "WOREDA";
  const [unit, setUnit] = useState({ tier: defaultTier, code: "", nameEn: "", nameAm: "", nameOm: "" });
  const [manager, setManager] = useState({ fullName: "", language: "en" });
  // OWNER DIRECTIVE (Task 44) — manage sub-cities: the bureau head sees WHO
  // runs each sub-city and (re)appoints its ONE responsible officer; every
  // sub-city console and bureau report reflects the change immediately.
  const officerByUnit = useMemo(() => {
    const m = new Map<string, { staffCode: string; fullName: string }>();
    for (const s of boot?.staff ?? []) {
      if (s.roleCode === "SUBCITY_MONITOR" && s.isActive) {
        m.set(s.orgUnitId, { staffCode: s.staffCode, fullName: s.fullName });
      }
    }
    return m;
  }, [boot?.staff]);
  const [appoint, setAppoint] = useState<{ unit: OrgUnit; sitting: { staffCode: string; fullName: string } | null; fullName: string; language: string } | null>(null);
  const [appointBusy, setAppointBusy] = useState(false);
  const openAppoint = (u: OrgUnit) => {
    setAppoint({ unit: u, sitting: officerByUnit.get(u.id) ?? null, fullName: "", language: "en" });
  };
  const saveAppoint = async () => {
    if (!appoint || !appoint.fullName.trim()) return;
    setAppointBusy(true);
    const out = await call("/api/org-units/manager", "POST", {
      orgUnitId: appoint.unit.id,
      fullName: appoint.fullName,
      language: appoint.language,
      replaceStaffCode: appoint.sitting?.staffCode ?? "",
    }, officer.staffCode) as { staffCode: string; message: string } | null;
    setAppointBusy(false);
    if (out) { toast.success(out.message); setAppoint(null); await refresh(); }
  };
  const create = async () => {
    const parentId = unit.tier === "SUB_CITY" ? effectiveBureau : (isSubCityOfficer ? officer.orgUnitId : effectiveSc);
    const payload = unit.tier === "SUB_CITY"
      ? { ...unit, parentId, managerFullName: manager.fullName, managerLanguage: manager.language }
      : { ...unit, parentId };
    const out = await call("/api/org-units", "POST", payload, officer.staffCode) as { code?: string; manager?: { staffCode: string; fullName: string } } | null;
    if (out) {
      toast.success(out.manager
        ? `${out.code} founded — responsible officer ${out.manager.fullName}, sign-in code ${out.manager.staffCode}`
        : `${out.code ?? "Unit"} registered (pending official register, O-7)`);
      setUnit({ tier: defaultTier, code: "", nameEn: "", nameAm: "", nameOm: "" });
      setManager({ fullName: "", language: manager.language });
      await refresh();
    }
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
      {!isBureauHead && !isSubCityOfficer ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Bureau">
            <SelectField value={effectiveBureau} onChange={setBureauId}
              options={bureaus.map((b) => ({ value: b.id, label: `${b.code} — ${b.nameEn}` }))} />
          </Field>
          <Field label="Sub-city (parent for new woredas)">
            <SelectField value={effectiveSc} onChange={setScId}
              options={subCities.map((s) => ({ value: s.id, label: `${s.code} — ${s.nameEn}` }))} />
          </Field>
        </div>
      ) : null}

      <DataTable
        headers={["Code", "Tier", "Under", "Names (EN · AM · OM)", "Responsible officer", "Status", "Actions"]}
        rows={[...(mySubCity ? [mySubCity] : []), ...subCities, ...allWoredas].map((u) => {
          const sitting = u.tier === "SUB_CITY" ? officerByUnit.get(u.id) ?? null : null;
          return [
            <span key={u.id} className="font-mono text-[10px]">{u.code}</span>,
            <span key={`t-${u.id}`} className="text-[10px]">{u.tier.replace("_", " ")}</span>,
            <span key={`p-${u.id}`} className="font-mono text-[10px] text-muted-foreground">
              {u.tier === "SUB_CITY" ? "city bureau" : unitById.get(u.parentId ?? "")?.code ?? "—"}
            </span>,
            <span key={`n-${u.id}`} className="block max-w-[260px]">
              <span className="block text-[11px] font-semibold">{u.nameEn}</span>
              <span className="block text-[10px] text-muted-foreground">{u.nameAm} · {u.nameOm}</span>
            </span>,
            <span key={`o-${u.id}`} className="text-[10px]">
              {u.tier === "SUB_CITY" ? (
                sitting ? (
                  <span className="font-semibold">{sitting.fullName} <span className="font-mono text-[9px] text-muted-foreground">{sitting.staffCode}</span></span>
                ) : (
                  <span className="font-semibold text-amber-600">No responsible officer</span>
                )
              ) : "—"}
            </span>,
            <span key={`c-${u.id}`} className="text-[10px] text-muted-foreground">
              {u.tier === "SUB_CITY" ? `${units.filter((w) => w.parentId === u.id).length} woredas` : u.confirmationStatus === "CONFIRMED" ? "confirmed" : "pending O-7"}
            </span>,
            <span key={`a-${u.id}`} className="flex flex-wrap gap-1">
              <ActionButton variant="outline" onClick={() => openEdit(u)}>Edit</ActionButton>
              {!isSubCityOfficer && u.tier === "SUB_CITY" ? (
                <ActionButton variant="ghost" onClick={() => openAppoint(u)}>{sitting ? "Replace officer" : "Appoint officer"}</ActionButton>
              ) : null}
            </span>,
          ];
        })}
        empty="No units registered yet."
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

      {/* Appoint dialog — the ONE responsible officer of a sub-city ------
         OWNER DIRECTIVE (Task 44): the bureau head manages his sub-cities —
          a vacant sub-city gets its officer; a departing officer is replaced
          (incumbent deactivated, successor's sign-in code auto-issued). The
          change is reflected immediately in every sub-city console. */}
      <Dialog open={!!appoint} onOpenChange={(o) => { if (!o) setAppoint(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {appoint?.sitting ? "Replace the responsible officer of " : "Appoint the responsible officer of "}{appoint?.unit.code}
            </DialogTitle>
            <DialogDescription>
              Each sub-city has exactly ONE responsible officer — he manages its woredas and its staff. {appoint?.sitting ? `${appoint.sitting.fullName} (${appoint.sitting.staffCode}) will be deactivated and the successor receives a new sign-in code.` : "The officer's sign-in code is issued automatically."} The change is reflected immediately in every sub-city console of {boot?.cityConfig?.nameEn ?? "the city"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Officer full name">
              <TextField value={appoint?.fullName ?? ""} onChange={(e) => setAppoint((a) => (a ? { ...a, fullName: e.target.value } : a))} placeholder="e.g. Kebebe Tsegaye" />
            </Field>
            <Field label="Officer language">
              <SelectField value={appoint?.language ?? "en"} onChange={(v) => setAppoint((a) => (a ? { ...a, language: v } : a))}
                options={[{ value: "am", label: "አማርኛ" }, { value: "en", label: "English" }, { value: "om", label: "Afaan Oromoo" }]} />
            </Field>
          </div>
          <DialogFooter>
            <ActionButton variant="ghost" onClick={() => setAppoint(null)}>Cancel</ActionButton>
            <ActionButton onClick={saveAppoint} disabled={appointBusy || !appoint?.fullName.trim()}>
              {appointBusy ? "Appointing…" : appoint?.sitting ? "Replace officer" : "Appoint officer"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-muted/20 p-3">
        {isBureauHead ? (
          <>
            <p className="mb-1 text-xs font-semibold">Found a new sub-city (with its responsible officer)</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              One officer is issued with the sub-city — from then on HE manages its woredas and its staff. Woreda and staff registration are not city-bureau duties anymore. A sub-city left without an officer (or whose officer departed) gets a new one from its row&apos;s Appoint officer action above.
            </p>
          </>
        ) : isSubCityOfficer ? (
          <>
            <p className="mb-1 text-xs font-semibold">Register a woreda of your sub-city</p>
            <p className="mb-2 text-[11px] text-muted-foreground">New woredas hang under your sub-city; you also appoint their staff under the Staff register tab.</p>
          </>
        ) : (
          <p className="mb-2 text-xs font-semibold">Register a new unit</p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {isBureauHead || isSubCityOfficer ? (
            <Field label="Level"><TextField value={isBureauHead ? "Sub-city" : "Woreda"} disabled /></Field>
          ) : (
            <Field label="Level">
              <SelectField value={unit.tier} onChange={(v) => setUnit({ ...unit, tier: v })}
                options={[{ value: "WOREDA", label: "Woreda" }, { value: "SUB_CITY", label: "Sub-city" }]} />
            </Field>
          )}
          <Field label="Code"><TextField value={unit.code} onChange={(e) => setUnit({ ...unit, code: e.target.value.toUpperCase() })} placeholder={isBureauHead ? "AA-BOLE" : "AA-BOLE-W15"} /></Field>
          <Field label="Name (English)"><TextField value={unit.nameEn} onChange={(e) => setUnit({ ...unit, nameEn: e.target.value })} /></Field>
          <Field label="ስም (አማርኛ)"><TextField value={unit.nameAm} onChange={(e) => setUnit({ ...unit, nameAm: e.target.value })} /></Field>
          <Field label="Maqaa (Oromoo)"><TextField value={unit.nameOm} onChange={(e) => setUnit({ ...unit, nameOm: e.target.value })} /></Field>
          {unit.tier === "SUB_CITY" ? (
            <>
              <Field label="Responsible officer (full name)"><TextField value={manager.fullName} onChange={(e) => setManager({ ...manager, fullName: e.target.value })} placeholder="e.g. Kebebe Tsegaye" /></Field>
              <Field label="Officer language">
                <SelectField value={manager.language} onChange={(v) => setManager({ ...manager, language: v })}
                  options={[{ value: "am", label: "አማርኛ" }, { value: "en", label: "English" }, { value: "om", label: "Afaan Oromoo" }]} />
              </Field>
            </>
          ) : null}
        </div>
        <div className="mt-2">
          <ActionButton
            onClick={create}
            disabled={!unit.code || !unit.nameEn || (unit.tier === "WOREDA" && !(isSubCityOfficer ? officer.orgUnitId : effectiveSc)) || (unit.tier === "SUB_CITY" && (!effectiveBureau || !manager.fullName.trim()))}
          >
            {isBureauHead ? "Found sub-city + issue officer" : "Register unit"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5 — staff register. OWNER DIRECTIVE — SUB-CITY DELEGATION: the sub-city
// rent-control officer (SUBCITY_MONITOR) appoints the woreda desks of HIS
// sub-city — registrars, stamping officers, hearing committee members
// (sign-in code auto-issued). The city super-admin and system admins run
// the whole-city register. The bureau head creates no staff — founding a
// sub-city issues its responsible officer automatically.
// Capability: staff:manage (CITY_ADMIN, SUBCITY_MONITOR, SYSTEM_ADMIN).
// ---------------------------------------------------------------------------
const CITY_ROLE_CODES = [
  "WOREDA_REGISTRAR", "WOREDA_STAMPER", "SUBCITY_MONITOR", "BUREAU_ANALYST",
  "BUREAU_HEAD", "COMMITTEE_MEMBER", "CITY_ADMIN",
];
// The sub-city officer appoints woreda desks only (mirrors /api/staff).
const SUBCITY_ASSIGNABLE = ["WOREDA_REGISTRAR", "WOREDA_STAMPER", "COMMITTEE_MEMBER"];

function StaffRegister() {
  const { boot, refresh, officer } = useBoot();
  const isSubCityOfficer = officer.roleCode === "SUBCITY_MONITOR";
  const [draft, setDraft] = useState({ fullName: "", roleCode: "WOREDA_REGISTRAR", orgUnitId: "", language: "en" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ staffCode: string; fullName: string } | null>(null);
  const staff = boot?.staff ?? [];
  const assignable = isSubCityOfficer ? SUBCITY_ASSIGNABLE : CITY_ROLE_CODES;
  const roles = (boot?.roles ?? []).filter((r) => assignable.includes(r.code));
  // Home offices grouped by tier — a city admin staffs bureau, sub-cities
  // and woredas; a sub-city officer sees exactly his own area (boot scope).
  const tierLabel: Record<string, string> = { BUREAU: "City bureau", SUB_CITY: "Sub-city", WOREDA: "Woreda" };
  const tierOrder: Record<string, number> = { BUREAU: 0, SUB_CITY: 1, WOREDA: 2 };
  const units = (boot?.orgUnits ?? [])
    .slice()
    .sort((a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9) || a.code.localeCompare(b.code))
    .map((u) => ({ ...u, label: `[${tierLabel[u.tier] ?? u.tier}] ${u.code} — ${u.nameEn}` }));

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
        <p className="mb-2 text-xs font-semibold">
          {isSubCityOfficer
            ? `Add a woreda-desk officer to your sub-city`
            : `Add an officer to ${boot?.cityConfig?.nameEn ?? "this city"}`}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Field label="Full name"><TextField value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="e.g. Kebebe Tsegaye" /></Field>
          <Field label="Role">
            <SelectField value={draft.roleCode} onChange={(v) => setDraft({ ...draft, roleCode: v })}
              options={roles.map((r) => ({ value: r.code, label: r.nameEn }))} />
          </Field>
          <Field label={isSubCityOfficer ? "Home office (your sub-city's woredas)" : "Home office (city bureau · sub-city · woreda)"}>
            <SelectField value={draft.orgUnitId} onChange={(v) => setDraft({ ...draft, orgUnitId: v })}
              options={units.map((u) => ({ value: u.id, label: u.label }))}
              placeholder="select office" />
          </Field>
          <Field label="Language">
            <SelectField value={draft.language} onChange={(v) => setDraft({ ...draft, language: v })}
              options={[{ value: "am", label: "አማርኛ" }, { value: "en", label: "English" }, { value: "om", label: "Afaan Oromoo" }]} />
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionButton onClick={add} disabled={busy || !draft.fullName.trim() || !draft.orgUnitId}>Register officer</ActionButton>
          <span className="text-[11px] text-muted-foreground">
            {isSubCityOfficer
              ? "You appoint the woreda desks of your sub-city — registrars, stamping officers and hearing committee members (Dir. Art. 9 separates registrar and stamper). Staff codes are issued automatically (STF-####) and serve as the sign-in code."
              : "Staff codes are issued automatically (STF-####) and serve as the sign-in code. Post officers to any office of this city — bureau, sub-city or woreda — with the role that fits the desk (Dir. Art. 9 separates registrar and stamper). Each sub-city keeps ONE responsible officer; national roles are federal appointments and cannot be created from a city."}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function SettingsPage() {
  const { boot, officer } = useBoot();
  // OWNER DIRECTIVE — SUB-CITY DELEGATION: the sub-city officer manages his
  // area's woredas + staff here; city-level parameters stay with the city.
  const isSubCityOfficer = officer.roleCode === "SUBCITY_MONITOR";
  const isCityLevel = officer.roleCode === "CITY_ADMIN" || officer.roleCode === "SYSTEM_ADMIN" || officer.roleCode === "BUREAU_HEAD";
  const canManageStaff = isSubCityOfficer || isCityLevel && officer.roleCode !== "BUREAU_HEAD";
  const tabs = [
    { key: "org", label: "Organization hierarchy", hint: isSubCityOfficer ? "The woredas of your sub-city (M13)" : "Sub-cities and woredas (M13)" },
    ...(canManageStaff ? [{ key: "staff", label: "Staff register", hint: isSubCityOfficer ? "The woreda desks of your sub-city" : "Officers of this city — city admin desk" }] : []),
    ...(isCityLevel ? [
      { key: "identity", label: "City identity & parameters", hint: "The per-city rule set (Dir. Art. 14)" },
      { key: "federal", label: "Federal register", hint: "National regulations reflected to every city" },
      { key: "ladder", label: "Penalty ladder", hint: "M9 offense catalogue values (Dir. Art. 22)" },
    ] : []),
  ];
  const [tab] = useHashTab(tabs.map((x) => x.key), "org");
  if (!boot) return null;
  return (
    <div className="grid grid-cols-1 gap-4">
      <TabRail active={tab} ariaLabel="City settings sections" tabs={tabs} />
      {tab === "identity" ? (
        <Panel title="City identity & statutory parameters" subtitle="Per-city rule set (Dir. Art. 14). Every change made here by the city bureau is REFLECTED IMMEDIATELY IN ALL SUB-CITIES and their woredas — every console reads the same city rule set. The statutory clock params drive complaints and appeal windows.">
          <CityConfigForm />
        </Panel>
      ) : null}
      {tab === "federal" ? <NationalRegulationsCard /> : null}
      {tab === "staff" && canManageStaff ? (
        <Panel title="Staff register" subtitle={isSubCityOfficer
          ? "Your sub-city's desks: appoint the registrars, stamping officers and committee members of your woredas, issue their sign-in codes, move or deactivate them. Your authority stops at your sub-city's boundary."
          : "The city's officers: the city super-admin creates staff at every level, issues sign-in codes, moves them between offices and deactivates or reactivates accounts. Each sub-city keeps ONE responsible officer — issued when the bureau head founds it."}>
          <StaffRegister />
        </Panel>
      ) : null}
      {tab === "ladder" ? (
        <Panel title="Penalty ladder (M9 · Dir. Art. 22)" subtitle="The Directive’s offense catalogue; values are configurable parameters (open item O1). Ladder values set by the city bureau apply to EVERY sub-city and woreda of the city at once. Rows referenced by penalty cases are deactivated, never deleted.">
          <LadderEditor />
        </Panel>
      ) : null}
      {tab === "org" ? (
        <Panel title="Organization hierarchy (M13 · Dir. Arts. 2, 6)" subtitle={isSubCityOfficer
          ? "Your sub-city and its woredas. New woredas enter PENDING_OFFICIAL_REGISTER until reconciled with the establishment register (O-7)."
          : "The city bureau head manages every sub-city here: found each one with its ONE responsible officer, appoint or replace that officer for existing sub-cities, correct names — every modification is reflected immediately in ALL sub-city consoles. New units enter PENDING_OFFICIAL_REGISTER until reconciled with the establishment register (O-7)."}>
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
