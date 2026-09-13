// ============================================================================
// panels-services.tsx — Tenant service catalog manager (SaaS).
// Each city manages ITS OWN public service catalog here — nothing is
// hardcoded. City admins are pinned to their city by the backend scope wall;
// the system admin manages any city via the top-bar switcher context.
// LINK-FIRST IA: the catalog and the creation form are separate
// link-addressable zones (/services#catalog · /services#add).
// ============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { call } from "./panels-s1";
import { useBoot } from "./shell";
import { Panel, Field, TextField, SelectField, ActionButton, DataTable, StatusBadge, TabRail, useHashTab } from "./kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";

type ServiceRow = {
  id: string; cityCode: string; code: string; nameEn: string; nameAm?: string | null; nameOm?: string | null;
  category: string; description?: string | null; requiredDocumentsJson?: string | null;
  processingTimeDays: number; department?: { code: string; nameEn: string } | null;
  workflowCode?: string | null; slaDays?: number | null; feeAmount?: number | null; feeCurrency?: string | null;
  isActive: boolean; isPublic: boolean;
};

const CATEGORIES = ["REGISTRATION", "COMPLAINTS", "PAYMENTS", "PERMITS", "LICENSING", "OTHER"];

const EMPTY = {
  code: "", nameEn: "", category: "REGISTRATION", description: "",
  requiredDocuments: "", processingTimeDays: "5", workflowCode: "", slaDays: "",
  feeAmount: "", isPublic: true,
};

export function ServicesAdmin() {
  const { boot } = useBoot();
  const cityCode = boot?.cityCode ?? "";
  const [rows, setRows] = useState<ServiceRow[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [edit, setEdit] = useState<ServiceRow | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await call("/api/services?manage=1", "GET", {});
    if (data) setRows(data.services as ServiceRow[]);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const data = await call("/api/services?manage=1", "GET", {});
      if (alive && data) setRows(data.services as ServiceRow[]);
    })();
    return () => { alive = false; };
  }, []);

  const create = async () => {
    setBusy(true);
    const out = await call("/api/services", "POST", {
      city: cityCode, code: form.code, nameEn: form.nameEn, category: form.category,
      description: form.description || null,
      requiredDocuments: form.requiredDocuments || null,
      processingTimeDays: form.processingTimeDays || "5",
      workflowCode: form.workflowCode || null,
      slaDays: form.slaDays || null,
      feeAmount: form.feeAmount || null,
      isPublic: form.isPublic,
    }) as { message?: string } | null;
    setBusy(false);
    if (out) {
      toast.success(out.message ?? "Service created.");
      setForm({ ...EMPTY });
      await load();
    }
  };

  const openEdit = (s: ServiceRow) => {
    setEdit(s);
    let docs = "";
    try { docs = JSON.parse(s.requiredDocumentsJson ?? "[]").join("\n"); } catch { /* ignore */ }
    setEditForm({
      code: s.code, nameEn: s.nameEn, category: s.category,
      description: s.description ?? "", requiredDocuments: docs,
      processingTimeDays: String(s.processingTimeDays),
      workflowCode: s.workflowCode ?? "", slaDays: s.slaDays != null ? String(s.slaDays) : "",
      feeAmount: s.feeAmount != null ? String(s.feeAmount) : "",
      isPublic: s.isPublic,
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    const out = await call("/api/services", "PATCH", {
      id: edit.id, nameEn: editForm.nameEn, category: editForm.category,
      description: editForm.description || null,
      requiredDocuments: editForm.requiredDocuments || null,
      processingTimeDays: editForm.processingTimeDays || "5",
      workflowCode: editForm.workflowCode || null,
      slaDays: editForm.slaDays || null,
      feeAmount: editForm.feeAmount || null,
      isPublic: editForm.isPublic,
      isActive: edit.isActive,
    }) as { message?: string } | null;
    setBusy(false);
    if (out) {
      toast.success(out.message ?? "Service updated.");
      setEdit(null);
      await load();
    }
  };

  const toggleActive = async (s: ServiceRow) => {
    setBusy(true);
    const out = await call("/api/services", "PATCH", { id: s.id, isActive: !s.isActive }) as { message?: string } | null;
    setBusy(false);
    if (out) { toast.success(out.message ?? "Updated."); await load(); }
  };

  const remove = async (s: ServiceRow) => {
    setBusy(true);
    const out = await call(`/api/services?id=${encodeURIComponent(s.id)}`, "DELETE", {}) as { message?: string } | null;
    setBusy(false);
    if (out) { toast.success(out.message ?? "Removed."); await load(); }
  };

  const canCreate = !!form.code.trim() && !!form.nameEn.trim() && !busy;

  const [tab] = useHashTab(["catalog", "add"], "catalog");

  return (
    <div className="grid grid-cols-1 gap-4">
      <TabRail
        active={tab}
        ariaLabel="Service catalog sections"
        tabs={[
          { key: "catalog", label: "Service catalog", count: rows?.length, hint: "This city's public services — edit, enable, disable, remove" },
          { key: "add", label: "Add a service", hint: "Create a new service in this city's catalog" },
        ]}
      />

      {tab === "catalog" ? (
      <Panel
        title={`Service catalog — ${cityCode || "…"}`}
        subtitle="This city's own public services. Documents, processing time, workflow, SLA, fee and visibility are configurable per service; nothing is hardcoded in the application."
      >
        {rows === null ? (
          <p className="py-3 text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <DataTable
            headers={["State", "Service", "Category", "SLA / processing", "Fee", "Public", "Action"]}
            rows={rows.map((s) => [
              <StatusBadge key={`st-${s.id}`} value={s.isActive ? "ACTIVE" : "CLOSED"} />,
              <span key={`n-${s.id}`}>
                <span className="block text-xs font-semibold">{s.nameEn}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.code}{s.department ? ` · ${s.department.code}` : ""}</span>
              </span>,
              <span key={`c-${s.id}`} className="text-[10px]">{s.category}</span>,
              <span key={`s-${s.id}`} className="text-[10px] tabular-nums">{s.slaDays ?? "—"} SLA · {s.processingTimeDays}d</span>,
              <span key={`f-${s.id}`} className="text-[10px] tabular-nums">{s.feeAmount != null ? `${s.feeAmount} ${s.feeCurrency ?? ""}` : "free"}</span>,
              <span key={`p-${s.id}`} className="text-[10px]">{s.isPublic ? "public" : "internal"}</span>,
              <span key={`a-${s.id}`} className="flex flex-wrap gap-1">
                <ActionButton variant="outline" disabled={busy} onClick={() => openEdit(s)}>Edit</ActionButton>
                <ActionButton variant="ghost" disabled={busy} onClick={() => void toggleActive(s)}>{s.isActive ? "Disable" : "Enable"}</ActionButton>
                <ActionButton variant="destructive" disabled={busy} onClick={() => void remove(s)}>Delete</ActionButton>
              </span>,
            ])}
            empty="No services yet — create the first one on the Add tab."
          />
        )}
      </Panel>
      ) : null}

      {tab === "add" ? (
      <Panel title="Add a service" subtitle="Creates a service in this city's catalog. Required documents: one per line.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Field label="Code"><TextField value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 40) }))} placeholder="PERMIT-X" /></Field>
          <Field label="Name (English)"><TextField value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="Rental permit" /></Field>
          <Field label="Category">
            <SelectField value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))}
              options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))} />
          </Field>
          <Field label="Processing days"><TextField type="number" min="1" value={form.processingTimeDays} onChange={(e) => setForm((f) => ({ ...f, processingTimeDays: e.target.value }))} /></Field>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Field label="Workflow key (optional)"><TextField value={form.workflowCode} onChange={(e) => setForm((f) => ({ ...f, workflowCode: e.target.value }))} placeholder="links to the workflow engine" /></Field>
          <Field label="SLA days (optional)"><TextField type="number" min="0" value={form.slaDays} onChange={(e) => setForm((f) => ({ ...f, slaDays: e.target.value }))} /></Field>
          <Field label="Fee (optional)"><TextField type="number" min="0" value={form.feeAmount} onChange={(e) => setForm((f) => ({ ...f, feeAmount: e.target.value }))} placeholder="ETB" /></Field>
          <Field label="Visibility">
            <SelectField value={form.isPublic ? "public" : "internal"} onChange={(v) => setForm((f) => ({ ...f, isPublic: v === "public" }))}
              options={[{ value: "public", label: "Public" }, { value: "internal", label: "Internal" }]} />
          </Field>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Description (optional)"><TextField value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Required documents (one per line)">
            <textarea
              className="min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
              value={form.requiredDocuments} onChange={(e) => setForm((f) => ({ ...f, requiredDocuments: e.target.value }))}
              placeholder={"Lease agreement\nID card"}
            />
          </Field>
        </div>
        <div className="mt-3">
          <ActionButton onClick={create} disabled={!canCreate}>{busy ? "Creating…" : `Add service to ${cityCode || "catalog"}`}</ActionButton>
        </div>
      </Panel>
      ) : null}

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit service {edit?.code}</DialogTitle>
            <DialogDescription>Changes apply to this city&apos;s catalog immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Name (English)"><TextField value={editForm.nameEn} onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))} /></Field>
              <Field label="Category">
                <SelectField value={editForm.category} onChange={(v) => setEditForm((f) => ({ ...f, category: v }))}
                  options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Processing days"><TextField type="number" value={editForm.processingTimeDays} onChange={(e) => setEditForm((f) => ({ ...f, processingTimeDays: e.target.value }))} /></Field>
              <Field label="SLA days"><TextField type="number" value={editForm.slaDays} onChange={(e) => setEditForm((f) => ({ ...f, slaDays: e.target.value }))} /></Field>
              <Field label="Fee"><TextField type="number" value={editForm.feeAmount} onChange={(e) => setEditForm((f) => ({ ...f, feeAmount: e.target.value }))} /></Field>
            </div>
            <Field label="Description"><TextField value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></Field>
            <Field label="Required documents (one per line)">
              <textarea
                className="min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
                value={editForm.requiredDocuments} onChange={(e) => setEditForm((f) => ({ ...f, requiredDocuments: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <ActionButton variant="ghost" onClick={() => setEdit(null)}>Cancel</ActionButton>
            <ActionButton onClick={saveEdit} disabled={busy || !editForm.nameEn.trim()}>{busy ? "Saving…" : "Save"}</ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
