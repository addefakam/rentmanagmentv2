// ============================================================================
// panels-cities.tsx — City Management (the SaaS control plane, national roles).
// The platform is delivered as ONE system per city; this module is where the
// system admin exercises fleet super-powers:
//   1. REGIONAL level — combined totals across every city (staff, registry,
//      operations) plus a per-city fleet table, so the super-admin sees all
//      city data at a glance without entering any city;
//   2. CITY level — drill into any city through the top-bar switcher (its
//      pages show that city's data only);
//   3. lifecycle — onboard a new city from ONE form (org skeleton, statutory
//      config, model contract and the mandatory city super-admin), EDIT a
//      city's identity/parameters, and deactivate/reactivate (soft
//      suspension — data preserved, sign-in refused, switcher hidden).
// Ministry analysts get a read-only view; only SYSTEM_ADMIN sees controls.
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { call } from "./panels-s1";
import { useBoot } from "./shell";
import { Panel, Stat, Field, TextField, SelectField, ActionButton, DataTable, StatusBadge } from "./kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";

type CityRow = {
  cityCode: string; nameEn: string; nameAm: string; nameOm: string;
  bureauCode: string; canonicalLang: string; currency: string;
  complaintDecisionDays: number; appealDays: number; isActive: boolean;
  subCities: number; woredas: number; staff: number; properties: number; files: number;
  complaintsOpen: number; complaintsTotal: number;
  paymentsCount: number; paymentsAmount: number;
};

type OnboardResult = {
  cityCode: string; bureauCode: string; contractVersion: string | null;
  team: string[]; orgUnits: string[]; message: string;
  cityAdmin: { staffCode: string; fullName: string };
};

const EMPTY_FORM = {
  cityCode: "", nameEn: "", nameAm: "", nameOm: "",
  canonicalLang: "am", complaintDecisionDays: "30", appealDays: "15",
  cityAdminName: "", seedTeam: true, bureauHeadName: "", registrarName: "", stamperName: "",
};

const num = (n: number) => n.toLocaleString("en-US");

export function CitiesAdmin() {
  const { officer, refresh } = useBoot();
  const canWrite = officer.roleCode === "SYSTEM_ADMIN";
  const [rows, setRows] = useState<CityRow[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [edit, setEdit] = useState<CityRow | null>(null);
  const [editForm, setEditForm] = useState({
    nameEn: "", nameAm: "", nameOm: "", canonicalLang: "am",
    complaintDecisionDays: "30", appealDays: "15",
  });

  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    const data = await call("/api/cities", "GET", {});
    if (data) setRows(data.cities as CityRow[]);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const data = await call("/api/cities", "GET", {});
      if (alive && data) setRows(data.cities as CityRow[]);
    })();
    return () => { alive = false; };
  }, []);

  // Regional rollup — all cities combined ("regional level" view).
  const t = (rows ?? []).reduce(
    (acc, r) => ({
      active: acc.active + (r.isActive ? 1 : 0),
      staff: acc.staff + r.staff,
      properties: acc.properties + r.properties,
      files: acc.files + r.files,
      complaintsOpen: acc.complaintsOpen + r.complaintsOpen,
      complaintsTotal: acc.complaintsTotal + r.complaintsTotal,
      paymentsCount: acc.paymentsCount + r.paymentsCount,
      paymentsAmount: acc.paymentsAmount + r.paymentsAmount,
    }),
    { active: 0, staff: 0, properties: 0, files: 0, complaintsOpen: 0, complaintsTotal: 0, paymentsCount: 0, paymentsAmount: 0 },
  );

  const onboard = async () => {
    setBusy(true);
    const out = await call("/api/cities", "POST", form) as OnboardResult | null;
    setBusy(false);
    if (out) {
      toast.success(out.message);
      setResult(out);
      setForm({ ...EMPTY_FORM });
      await load();
      await refresh(); // switcher list changes for national officers
    }
  };

  const toggle = async (row: CityRow, next: boolean) => {
    setBusy(true);
    const out = await call("/api/cities", "PATCH", { cityCode: row.cityCode, isActive: next }) as { message: string } | null;
    setBusy(false);
    setConfirmCode(null);
    if (out) {
      toast.success(out.message);
      await load();
      await refresh();
    }
  };

  const openEdit = (row: CityRow) => {
    setEdit(row);
    setEditForm({
      nameEn: row.nameEn, nameAm: row.nameAm, nameOm: row.nameOm,
      canonicalLang: row.canonicalLang,
      complaintDecisionDays: String(row.complaintDecisionDays),
      appealDays: String(row.appealDays),
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    const out = await call("/api/cities", "PATCH", {
      cityCode: edit.cityCode,
      nameEn: editForm.nameEn, nameAm: editForm.nameAm, nameOm: editForm.nameOm,
      canonicalLang: editForm.canonicalLang,
      complaintDecisionDays: editForm.complaintDecisionDays,
      appealDays: editForm.appealDays,
    }) as { message: string } | null;
    setBusy(false);
    if (out) {
      toast.success(out.message);
      setEdit(null);
      await load();
      await refresh();
    }
  };

  const codeOk = /^[A-Z]{2,4}$/.test(form.cityCode);
  const teamOk = !form.seedTeam || (!!form.bureauHeadName.trim() && !!form.registrarName.trim());
  const canSubmit = codeOk && !!form.nameEn.trim() && !!form.cityAdminName.trim() && teamOk && !busy;

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Regional overview ------------------------------------------------- */}
      <Panel
        title="Regional overview — all cities combined"
        subtitle="Super-admin view of every city's data at regional level. To work inside one city's data, pick it in the top-bar city switcher — each city's pages then show that city only."
      >
        {rows === null ? (
          <p className="py-3 text-sm text-muted-foreground">Loading regional totals…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Cities active" value={`${t.active} / ${rows.length}`} hint="active / onboarded" />
            <Stat label="Staff (all cities)" value={num(t.staff)} hint="active officers" />
            <Stat label="Properties" value={num(t.properties)} hint="registered units" />
            <Stat label="Registration files" value={num(t.files)} hint="all cities" />
            <Stat label="Open complaints" value={num(t.complaintsOpen)} hint={`of ${num(t.complaintsTotal)} total`} />
            <Stat label="Payments recorded" value={num(t.paymentsCount)} hint="receipts issued" />
            <Stat label="Collected (ETB)" value={num(t.paymentsAmount)} hint="all cities, gross" />
          </div>
        )}
      </Panel>

      {/* Fleet table ------------------------------------------------------ */}
      <Panel
        title={`Cities on the platform (${rows?.length ?? "…"})`}
        subtitle="City-level numbers per row. Deactivation is a soft suspension — data is preserved and the city can be reactivated at any time."
      >
        {rows === null ? (
          <p className="py-3 text-sm text-muted-foreground">Loading city fleet…</p>
        ) : (
          <DataTable
            headers={["Status", "City", "Bureau", "Structure", "Staff", "Registry", "Operations", "Statutory (days)", canWrite ? "Action" : "Access"]}
            rows={rows.map((r) => [
              <StatusBadge key={`s-${r.cityCode}`} value={r.isActive ? "ACTIVE" : "CLOSED"} />,
              <span key={`c-${r.cityCode}`}>
                <span className="block text-xs font-semibold">{r.nameEn}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{r.cityCode} · {r.canonicalLang.toUpperCase()} · {r.currency}</span>
              </span>,
              <span key={`b-${r.cityCode}`} className="font-mono text-[10px]">{r.bureauCode}</span>,
              <span key={`st-${r.cityCode}`} className="text-[10px] tabular-nums">{r.subCities} sub-cities · {r.woredas} woredas</span>,
              <span key={`u-${r.cityCode}`} className="text-[10px] tabular-nums">{num(r.staff)}</span>,
              <span key={`p-${r.cityCode}`} className="text-[10px] tabular-nums">{num(r.properties)} prop · {num(r.files)} files</span>,
              <span key={`o-${r.cityCode}`} className="text-[10px] tabular-nums">
                {num(r.complaintsOpen)}/{num(r.complaintsTotal)} compl · {num(r.paymentsCount)} pay
              </span>,
              <span key={`d-${r.cityCode}`} className="text-[10px] tabular-nums">complaint {r.complaintDecisionDays} · appeal {r.appealDays}</span>,
              canWrite ? (
                confirmCode === r.cityCode ? (
                  <span key={`a-${r.cityCode}`} className="flex flex-wrap gap-1">
                    <ActionButton variant="destructive" disabled={busy} onClick={() => void toggle(r, !r.isActive)}>
                      Confirm {r.isActive ? "deactivate" : "reactivate"}
                    </ActionButton>
                    <ActionButton variant="ghost" onClick={() => setConfirmCode(null)}>Cancel</ActionButton>
                  </span>
                ) : (
                  <span key={`a-${r.cityCode}`} className="flex flex-wrap gap-1">
                    <ActionButton variant="outline" disabled={busy} onClick={() => openEdit(r)}>Edit</ActionButton>
                    <ActionButton
                      variant={r.isActive ? "outline" : "default"}
                      onClick={() => setConfirmCode(r.cityCode)}
                    >
                      {r.isActive ? "Deactivate" : "Reactivate"}
                    </ActionButton>
                  </span>
                )
              ) : (
                <span key={`a-${r.cityCode}`} className="text-[10px] text-muted-foreground">view only</span>
              ),
            ])}
            empty="No cities configured yet."
          />
        )}
      </Panel>

      {/* Edit dialog ------------------------------------------------------- */}
      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit city {edit?.cityCode}</DialogTitle>
            <DialogDescription>
              Change the city&apos;s identity and statutory parameters. Operational data (properties, files, complaints, payments) is never touched by an edit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Name (English)"><TextField value={editForm.nameEn} onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))} /></Field>
              <Field label="ስም (አማርኛ)"><TextField value={editForm.nameAm} onChange={(e) => setEditForm((f) => ({ ...f, nameAm: e.target.value }))} /></Field>
              <Field label="Maqaa (Afaan Oromoo)"><TextField value={editForm.nameOm} onChange={(e) => setEditForm((f) => ({ ...f, nameOm: e.target.value }))} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Primary legal language">
                <SelectField value={editForm.canonicalLang} onChange={(v) => setEditForm((f) => ({ ...f, canonicalLang: v }))}
                  options={[{ value: "am", label: "Amharic" }, { value: "om", label: "Afaan Oromoo" }, { value: "en", label: "English" }]} />
              </Field>
              <Field label="Complaint decision days">
                <TextField type="number" min="1" value={editForm.complaintDecisionDays} onChange={(e) => setEditForm((f) => ({ ...f, complaintDecisionDays: e.target.value }))} />
              </Field>
              <Field label="Appeal window days">
                <TextField type="number" min="1" value={editForm.appealDays} onChange={(e) => setEditForm((f) => ({ ...f, appealDays: e.target.value }))} />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Bureau code {edit?.bureauCode} is permanent — it anchors this city&apos;s data isolation boundary.
            </p>
          </div>
          <DialogFooter>
            <ActionButton variant="ghost" onClick={() => setEdit(null)}>Cancel</ActionButton>
            <ActionButton onClick={saveEdit} disabled={busy || !editForm.nameEn.trim()}>
              {busy ? "Saving…" : "Save changes"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboard form ----------------------------------------------------- */}
      <Panel
        title="Onboard a new city"
        subtitle="When a new city requests the system, configure it here once — org skeleton, statutory parameters, model contract and the city super-admin are created in one step. The city appears in the sign-in directory immediately."
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Field label="City code (2–4 letters)">
              <TextField value={form.cityCode} onChange={(e) => set("cityCode", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="HAW" />
            </Field>
            <Field label="City name (English)"><TextField value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="Hawassa" /></Field>
            <Field label="የከተማ ስም (አማርኛ)"><TextField value={form.nameAm} onChange={(e) => set("nameAm", e.target.value)} placeholder="optional — defaults to English" /></Field>
            <Field label="Magaalaa (Afaan Oromoo)"><TextField value={form.nameOm} onChange={(e) => set("nameOm", e.target.value)} placeholder="optional — defaults to English" /></Field>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Field label="Primary legal language">
              <SelectField value={form.canonicalLang} onChange={(v) => set("canonicalLang", v)}
                options={[{ value: "am", label: "Amharic" }, { value: "om", label: "Afaan Oromoo" }, { value: "en", label: "English" }]} />
            </Field>
            <Field label="Complaint decision days"><TextField type="number" min="1" value={form.complaintDecisionDays} onChange={(e) => set("complaintDecisionDays", e.target.value)} /></Field>
            <Field label="Appeal window days"><TextField type="number" min="1" value={form.appealDays} onChange={(e) => set("appealDays", e.target.value)} /></Field>
            <Field label="Bureau code (auto if empty)">
              <TextField value={form.cityCode ? `${form.cityCode}-BUREAU` : ""} placeholder="HAW-BUREAU" disabled />
            </Field>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-semibold">City administrator (required)</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              A city super-admin is created with the city — full authority over this city only: adds users, manages the office structure and runs all city operations. Fleet management stays with the system admin, and this account can never see another city&apos;s data.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="City admin full name">
                <TextField value={form.cityAdminName} onChange={(e) => set("cityAdminName", e.target.value)} placeholder="e.g. Tigist Alemu" />
              </Field>
              <Field label="Sign-in"><TextField value="staff code auto-issued" disabled /></Field>
              <Field label="Authority"><TextField value="this city only" disabled /></Field>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox" className="h-4 w-4 accent-[#D4875A]"
                checked={form.seedTeam} onChange={(e) => set("seedTeam", e.target.checked)}
              />
              Also create starter desks (optional — sign-in = staff code; codes are issued automatically)
            </label>
            {form.seedTeam ? (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="Bureau head name"><TextField value={form.bureauHeadName} onChange={(e) => set("bureauHeadName", e.target.value)} placeholder="e.g. Yonas Girma" /></Field>
                <Field label="Woreda registrar name"><TextField value={form.registrarName} onChange={(e) => set("registrarName", e.target.value)} placeholder="e.g. Bontu Tesfaye" /></Field>
                <Field label="Woreda stamper name"><TextField value={form.stamperName} onChange={(e) => set("stamperName", e.target.value)} placeholder="optional" /></Field>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={onboard} disabled={!canSubmit}>
              {busy ? "Onboarding…" : `Onboard ${form.cityCode || "new city"}`}
            </ActionButton>
            <span className="text-[11px] text-muted-foreground">
              Creates {form.cityCode ? `${form.cityCode}-BUREAU → ${form.cityCode}-CENTRAL → ${form.cityCode}-CENTRAL-W01` : "the org skeleton"}, the city administrator, clones the federal model contract, and opens the city for sign-in.
            </span>
          </div>

          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
              <p className="font-semibold text-emerald-900">{result.message}</p>
              <p className="mt-1 text-emerald-800">Org units: {result.orgUnits.join(" → ")}</p>
              {result.contractVersion ? <p className="text-emerald-800">Model contract {result.contractVersion} cloned (pending legal review).</p> : null}
              {result.cityAdmin ? (
                <p className="mt-1 font-semibold text-emerald-900">
                  City administrator — {result.cityAdmin.fullName}: sign-in code {result.cityAdmin.staffCode} (full authority over {result.cityCode} only).
                </p>
              ) : null}
              {result.team.length > 1 ? (
                <p className="mt-1 text-emerald-800">
                  Starter desks: {result.team.slice(1).join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
