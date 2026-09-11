// ============================================================================
// panels-s2s3.tsx — Sprint S2 (M2 property registry + M3 contract studio)
// and Sprint S3 (M4 registration & certification workflow).
// ============================================================================

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { NINE_POINT_CHECKLIST } from "@/lib/domain/law";
import { Panel, Field, TextField, SelectField, BoolField, ActionButton, DataTable, StatusBadge, RuleBadge, RuleNote } from "./kit";
import { call } from "./panels-s1";

type PanelProps = { boot: BootPayload; lang: Lang; refresh: () => Promise<void> };

const fmtDate = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "—");
const exempt = (p: { exemptionEndsAt?: string | null }) =>
  p.exemptionEndsAt && new Date(p.exemptionEndsAt).getTime() > Date.now();

export function AssetsPanel({ boot, lang, refresh }: PanelProps) {
  const woredas = useMemo(() => boot.orgUnits.filter((o) => o.tier === "WOREDA"), [boot.orgUnits]);
  const landlords = useMemo(() => boot.parties.filter((p) => p.type === "LANDLORD" && p.verificationStatus === "VERIFIED"), [boot.parties]);
  const [pf, setPf] = useState({
    woredaId: "", landlordId: "", kebele: "", houseNo: "", addressNote: "",
    ownershipEvidence: "HOLDING_CERT", evidenceRef: "", statusTypeId: "", rooms: "1", areaSqm: "", statusSetAt: "2026-01-01",
  });
  const set = (k: string, v: string) => setPf((f) => ({ ...f, [k]: v }));

  const createProperty = async () => {
    const data = await call("/api/properties", "POST", pf);
    if (data) {
      toast.success(`${data.propertyCode} registered · exemption ${fmtDate(data.exemptionEndsAt)}`);
      await refresh();
    }
  };

  // M3: contract studio — amend the active version
  const [amend, setAmend] = useState({ newVersion: "v1.1", sectionCode: "", contentEn: "", contentAm: "", contentOm: "" });
  const amendContract = async () => {
    if (!boot.activeContract) return;
    const data = await call("/api/model-contracts", "POST", ({
      baseContractId: boot.activeContract.id, newVersion: amend.newVersion,
      changes: [{ sectionCode: amend.sectionCode, contentEn: amend.contentEn, contentAm: amend.contentAm, contentOm: amend.contentOm }],
    }), "STF-0005");
    if (data) {
      toast.success(`Model contract ${data.version} issued; previous version superseded`);
      await refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Panel title="M2 · Register property" subtitle="Proc. Arts. 2, 10; Dir. Art. 6: at the house woreda. Status sets the exemption clock (new 4y / vacant 2y).">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Woreda">
                <SelectField value={pf.woredaId} onChange={(v) => set("woredaId", v)}
                  options={woredas.slice(0, 60).map((w) => ({ value: w.id, label: w.code }))} placeholder="Pick woreda" />
              </Field>
              <Field label="Landlord (verified)">
                <SelectField value={pf.landlordId} onChange={(v) => set("landlordId", v)}
                  options={landlords.map((p) => ({ value: p.id, label: `${p.partyCode} ${p.fullName}` }))} placeholder="Pick landlord" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ownership evidence">
                <SelectField value={pf.ownershipEvidence} onChange={(v) => set("ownershipEvidence", v)}
                  options={[
                    { value: "HOLDING_CERT", label: "Holding certificate" },
                    { value: "UNDOCUMENTED_CONFIRMATION", label: "Confirmation (undocumented)" },
                    { value: "COURT_SALE", label: "Court-sale document" },
                    { value: "INHERITANCE_TRANSFER", label: "Inheritance transfer" },
                  ]} />
              </Field>
              <Field label="Evidence ref"><TextField value={pf.evidenceRef} onChange={(e) => set("evidenceRef", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Status (exemption clock)">
                <SelectField value={pf.statusTypeId || boot.statusTypes[0]?.id || ""} onChange={(v) => set("statusTypeId", v)}
                  options={boot.statusTypes.map((s) => ({ value: s.id, label: `${s.nameEn}${s.exemptionMonths ? ` (${s.exemptionMonths / 12}y)` : ""}` }))} />
              </Field>
              <Field label="Anchor date (completion / vacancy)">
                <TextField type="date" value={pf.statusSetAt} onChange={(e) => set("statusSetAt", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Kebele"><TextField value={pf.kebele} onChange={(e) => set("kebele", e.target.value)} /></Field>
              <Field label="House no."><TextField value={pf.houseNo} onChange={(e) => set("houseNo", e.target.value)} /></Field>
              <Field label="Rooms"><TextField type="number" min="1" value={pf.rooms} onChange={(e) => set("rooms", e.target.value)} /></Field>
            </div>
            <ActionButton onClick={createProperty} disabled={!pf.woredaId || !pf.landlordId || !pf.evidenceRef}>{t("act.create", lang)}</ActionButton>
          </div>
        </Panel>

        <Panel title="M2 · Property register" subtitle="Exemption clocks computed from Proc. Art. 10; occupied houses have no clock.">
          <DataTable
            headers={["Code", "Woreda", "Landlord", "Status", "Exemption ends", "Basis"]}
            rows={boot.properties.map((p) => [
              <span key={p.id} className="font-mono text-[10px]">{p.propertyCode}</span>,
              p.woreda.code, p.landlord.fullName,
              <span key={`s-${p.id}`} className="flex items-center gap-1">
                {p.statusType.code}
                {exempt(p) && <StatusBadge value="PENDING" />}
              </span>,
              fmtDate(p.exemptionEndsAt),
              <span key={`b-${p.id}`} className="line-clamp-1 max-w-[220px] text-[10px]">{p.exemptionBasis}</span>,
            ])}
            empty="No properties yet — register a verified landlord's house first."
          />
        </Panel>
      </div>

      <Panel title="M3 · Model contract studio" subtitle="Proc. Art. 5; Dir. Art. 4: the Bureau amends and distributes the template; versions are immutable and superseded, never edited.">
        {boot.activeContract ? (
          <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded border bg-muted/30 p-3 text-xs">
                <div className="font-semibold">Active: {boot.activeContract.version} · {boot.activeContract.status} · canonical {boot.activeContract.canonicalLang.toUpperCase()}</div>
                <div className="text-muted-foreground">{boot.activeContract.sections.length} sections · issued by {boot.activeContract.issuedBy}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="New version tag"><TextField value={amend.newVersion} onChange={(e) => setAmend({ ...amend, newVersion: e.target.value })} /></Field>
                <Field label="Section to amend">
                  <SelectField value={amend.sectionCode} onChange={(v) => setAmend({ ...amend, sectionCode: v })}
                    options={boot.activeContract.sections.map((s) => ({ value: s.code, label: `${s.code} ${s.titleEn}` }))} placeholder="Pick section" />
                </Field>
              </div>
              <Field label="New English content"><TextField value={amend.contentEn} onChange={(e) => setAmend({ ...amend, contentEn: e.target.value })} /></Field>
              <Field label="New Amharic content (አዲስ የአማርኛ ይዘት)"><TextField value={amend.contentAm} onChange={(e) => setAmend({ ...amend, contentAm: e.target.value })} /></Field>
              <Field label="Fe'ee Afaan Oromoo haaraa"><TextField value={amend.contentOm} onChange={(e) => setAmend({ ...amend, contentOm: e.target.value })} /></Field>
              <ActionButton onClick={amendContract} disabled={!amend.sectionCode || !amend.newVersion}>Issue amended version</ActionButton>
              <RuleNote lang={lang} />
            </div>
            <DataTable
              headers={["#", "Code", "Section", "Certification", "Legal basis"]}
              rows={boot.activeContract.sections.map((s) => [
                String(s.orderNo), <span key={s.id} className="font-mono text-[10px]">{s.code}</span>,
                <span key={`t-${s.id}`} className="line-clamp-1 max-w-[300px]">{s.titleEn}</span>,
                <StatusBadge key={`c-${s.id}`} value={s.certificationStatus === "CERTIFIED_AM" ? "REGISTERED" : "PENDING"} />,
                <span key={`b-${s.id}`} className="text-[10px]">{s.legalBasis}</span>,
              ])}
            />
          </div>
        ) : <p className="text-sm text-muted-foreground">No active model contract.</p>}
      </Panel>
    </div>
  );
}

export function RegistrationPanel({ boot, lang, refresh }: PanelProps) {
  const woredas = useMemo(() => boot.orgUnits.filter((o) => o.tier === "WOREDA"), [boot.orgUnits]);
  const verified = useMemo(() => boot.parties.filter((p) => p.verificationStatus === "VERIFIED"), [boot.parties]);
  const [ff, setFf] = useState({
    woredaId: "", propertyId: "", landlordId: "", tenantId: "", modelContractId: "",
    monthlyRent: "8000", leaseStart: "2026-09-01", leaseEnd: "2028-09-01", prepaymentMonths: "1",
    paymentMethod: "TELEBIRR", paymentMethodConfirmed: true, interpreterUsed: false, interpreterName: "", isLegacy: false,
    w1: "", w2: "", w3: "",
  });
  const set = (k: string, v: string | boolean) => setFf((f) => ({ ...f, [k]: v }));
  const woredaProps = boot.properties.filter((p) => p.woredaId === ff.woredaId);
  const witnesses = [ff.w1, ff.w2, ff.w3].filter(Boolean).map((n, i) => ({ fullName: n, idTypeId: boot.idTypes[0].id, idNumber: `W-ID-${i + 1}` }));

  const createFile = async () => {
    const data = await call("/api/registration-files", "POST", {
      ...ff, witnesses,
      monthlyRent: Number(ff.monthlyRent), prepaymentMonths: Number(ff.prepaymentMonths),
    });
    if (data) {
      toast.success(`File ${data.fileNumber} presented`);
      await refresh();
    }
  };

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    const data = await call(`/api/registration-files/${id}`, "PATCH", { action, ...extra });
    if (data) {
      toast.success(`File now ${data.status}${data.certificateNumber ? ` · ${data.certificateNumber}` : ""}`);
      await refresh();
    }
  };

  const [selId, setSelId] = useState("");
  const sel = boot.files.find((f) => f.id === selId) ?? boot.files[0];

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Panel title="M4 · Present registration file" subtitle="Proc. Arts. 4, 6, 12, 13: ≥2-year term, ≤2 months advance, electronic payment, three witnesses. Legacy contracts carry the Art. 7 30+3-day annotation.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Woreda">
                <SelectField value={ff.woredaId} onChange={(v) => set("woredaId", v)}
                  options={woredas.slice(0, 60).map((w) => ({ value: w.id, label: w.code }))} placeholder="Pick woreda" />
              </Field>
              <Field label="Property (in woreda)">
                <SelectField value={ff.propertyId} onChange={(v) => { set("propertyId", v); const p = boot.properties.find((x) => x.id === v); if (p) set("landlordId", p.landlordId); }}
                  options={woredaProps.map((p) => ({ value: p.id, label: `${p.propertyCode} (${p.statusType.code})` }))} placeholder="Pick property" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tenant (verified)">
                <SelectField value={ff.tenantId} onChange={(v) => set("tenantId", v)}
                  options={verified.filter((p) => p.type === "TENANT").map((p) => ({ value: p.id, label: `${p.partyCode} ${p.fullName}` }))} placeholder="Pick tenant" />
              </Field>
              <Field label="Model contract version">
                <SelectField value={ff.modelContractId || boot.activeContract?.id || ""} onChange={(v) => set("modelContractId", v)}
                  options={boot.activeContract ? [{ value: boot.activeContract.id, label: `${boot.activeContract.version} (ACTIVE)` }] : []} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Monthly rent (ETB)"><TextField type="number" value={ff.monthlyRent} onChange={(e) => set("monthlyRent", e.target.value)} /></Field>
              <Field label="Lease start"><TextField type="date" value={ff.leaseStart} onChange={(e) => set("leaseStart", e.target.value)} /></Field>
              <Field label="Lease end"><TextField type="date" value={ff.leaseEnd} onChange={(e) => set("leaseEnd", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Advance payment (months)">
                <SelectField value={ff.prepaymentMonths} onChange={(v) => set("prepaymentMonths", v)}
                  options={["0", "1", "2"].map((m) => ({ value: m, label: `${m} month(s) (Art. 12 cap)` }))} />
              </Field>
              <Field label="Electronic channel (Art. 13)">
                <SelectField value={ff.paymentMethod} onChange={(v) => set("paymentMethod", v)}
                  options={["CBE_BIRR", "TELEBIRR", "AMOLE", "BANK_TRANSFER", "M_PESA"].map((m) => ({ value: m, label: m.replace("_", " ") }))} />
              </Field>
            </div>
            <BoolField checked={ff.paymentMethodConfirmed} onChange={(v) => set("paymentMethodConfirmed", v)} label="Payment method confirmed at woreda (Dir. Art. 16(4))" />
            <BoolField checked={ff.interpreterUsed} onChange={(v) => set("interpreterUsed", v)} label="Interpreter flow used (Dir. Art. 8(1))" />
            {ff.interpreterUsed && <Field label="Interpreter name"><TextField value={ff.interpreterName} onChange={(e) => set("interpreterName", e.target.value)} /></Field>}
            <BoolField checked={ff.isLegacy} onChange={(v) => set("isLegacy", v)} label="Legacy pre-proclamation contract (Art. 7: 30+3 days)" />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Witness 1"><TextField value={ff.w1} onChange={(e) => set("w1", e.target.value)} /></Field>
              <Field label="Witness 2"><TextField value={ff.w2} onChange={(e) => set("w2", e.target.value)} /></Field>
              <Field label="Witness 3"><TextField value={ff.w3} onChange={(e) => set("w3", e.target.value)} /></Field>
            </div>
            <ActionButton onClick={createFile} disabled={!ff.woredaId || !ff.propertyId || !ff.tenantId || witnesses.length !== 3}>
              {t("act.submit", lang)}
            </ActionButton>
          </div>
        </Panel>

        <Panel title="M4 · Registrar workflow" subtitle="Nine-point checklist (Dir. Arts. 6-9) → certification → stamping desk → registration in the numbered registry book.">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Select file">
              <SelectField value={sel?.id ?? ""} onChange={setSelId}
                options={boot.files.slice(0, 50).map((f) => ({ value: f.id, label: `${f.fileNumber} · ${f.status}` }))} placeholder="Pick file" />
            </Field>
            {sel && (
              <div className="rounded border bg-muted/20 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold">{sel.fileNumber}</span>
                  <StatusBadge value={sel.status} />
                  {sel.isLegacy && <RuleBadge rule="Art. 7 legacy" />}
                  {sel.certificateNumber && <span className="text-[10px] text-emerald-700">{sel.certificateNumber}</span>}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {sel.property?.propertyCode} · rent {sel.monthlyRent} ETB/mo · {fmtDate(sel.leaseStart)} → {fmtDate(sel.leaseEnd)} · {sel.witnesses.length} witnesses
                  {sel.interpreterUsed && sel.interpreterName ? ` · interpreter: ${sel.interpreterName}` : ""}
                </div>
                {sel.annotations.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-[10px] text-amber-800">
                    {sel.annotations.map((a) => <li key={a.id}><b>{a.code}</b> {a.text}</li>)}
                  </ul>
                )}
                <div className="mt-2 grid gap-1">
                  {NINE_POINT_CHECKLIST.map((c) => {
                    const row = sel.checklist.find((x) => x.orderNo === c.orderNo);
                    return (
                      <label key={c.code} className="flex items-center gap-2 text-[11px]">
                        <input type="checkbox" checked={row?.passed === true} className="h-3.5 w-3.5"
                          onChange={async (e) => {
                            const items = NINE_POINT_CHECKLIST.map((tpl) => ({
                              orderNo: tpl.orderNo,
                              passed: tpl.orderNo === c.orderNo ? e.target.checked : sel.checklist.find((x) => x.orderNo === tpl.orderNo)?.passed === true,
                            }));
                            await act(sel.id, "check", { items });
                          }} />
                        <span className="font-mono">{c.code}</span>
                        <span className="text-muted-foreground">{c.requirement}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <ActionButton variant="outline" disabled={sel.status !== "CHECKLIST_PASSED"} onClick={() => act(sel.id, "certify")}>Certify (Art. 9)</ActionButton>
                  <ActionButton variant="outline" disabled={sel.status !== "CERTIFIED"} onClick={() => act(sel.id, "stamp")}>Stamp (Arts. 9-10)</ActionButton>
                  <ActionButton disabled={sel.status !== "STAMPED"} onClick={() => act(sel.id, "register")}>Register in book</ActionButton>
                </div>
                {sel.bookEntries.length > 0 && (
                  <p className="mt-1 text-[10px] text-emerald-700">
                    Book entry #{sel.bookEntries[0].entryNumber} page {sel.bookEntries[0].pageNumber} · {sel.bookEntries[0].enteredByName} · replication queued (Dir. Art. 13)
                  </p>
                )}
              </div>
            )}
            <DataTable
              headers={["File", "Woreda", "Status", "Certificate", "Registered"]}
              rows={boot.files.map((f) => [
                <span key={f.id} className="font-mono text-[10px]">{f.fileNumber}</span>,
                f.woreda.code,
                <StatusBadge key={`s-${f.id}`} value={f.status} />,
                f.certificateNumber ?? "—",
                fmtDate(f.registeredAt),
              ])}
              empty="No files yet — present a registration file on the left."
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
