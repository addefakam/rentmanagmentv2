// ============================================================================
// panels-s4s5.tsx — Sprint S4 (M5 adjustment engine + M6 payment ledger)
// and Sprint S5 (M8 complaints & appeals + M12 deadline engine).
// ============================================================================

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { Panel, Field, TextField, SelectField, BoolField, ActionButton, DataTable, StatusBadge, RuleBadge } from "./kit";
import { call } from "./panels-s1";

type PanelProps = { boot: BootPayload; lang: Lang; refresh: () => Promise<void> };
const fmtDate = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "—");

export function RentPanel({ boot, lang, refresh }: PanelProps) {
  const registered = useMemo(() => boot.files.filter((f) => f.status === "REGISTERED"), [boot.files]);
  const [adj, setAdj] = useState({ year: "2026", percentage: "8", basisStudy: "Bureau annual market study" });
  const [val, setVal] = useState({ fileId: "", proposedRent: "" });
  const [pay, setPay] = useState({ fileId: "", amount: "", kind: "RENT", monthsCovered: "1", method: "TELEBIRR", isCash: false });

  const createAdj = async () => {
    const data = await call("/api/adjustments", "POST", { year: Number(adj.year), percentage: Number(adj.percentage), basisStudy: adj.basisStudy });
    if (data) { toast.success(`Adjustment ${data.year} drafted (+${data.percentage}%)`); await refresh(); }
  };
  const adjAct = async (id: string, action: string) => {
    const data = await call("/api/adjustments", "PATCH", { id, action }, action === "draft" ? undefined : "STF-0005");
    if (data) {
      toast.success(action === "publish"
        ? `Published June 1 · pre-effect check window opened (Dir. Art. 11)`
        : `Effective June 30 · 30-working-day amendment window opened (Dir. Art. 10)`);
      await refresh();
    }
  };
  const validateIncrease = async () => {
    const data = await call("/api/adjustments", "POST", { action: "validate-increase", fileId: val.fileId, proposedRent: Number(val.proposedRent) });
    if (data) {
      if (data.ok) toast.success(data.message);
      else toast.error(`${data.rule} — ${data.message}`);
    }
  };
  const recordPay = async () => {
    const data = await call("/api/payments", "POST", { ...pay, amount: Number(pay.amount), monthsCovered: Number(pay.monthsCovered) });
    if (data) {
      toast.success(data.cashFlag ? `${data.receiptNumber} recorded — CASH FLAG: 10% referral case auto-computed (Dir. Art. 22)` : `${data.receiptNumber} recorded (electronic)`);
      await refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M5 · Annual adjustment" subtitle="Proc. Art. 8; Dir. Art. 11: publish June 1, effect June 30; pre-effect amendment check during June; 30-working-day amendment window after effect.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Year"><TextField type="number" value={adj.year} onChange={(e) => setAdj({ ...adj, year: e.target.value })} /></Field>
              <Field label="Percentage"><TextField type="number" value={adj.percentage} onChange={(e) => setAdj({ ...adj, percentage: e.target.value })} /></Field>
            </div>
            <Field label="Basis study"><TextField value={adj.basisStudy} onChange={(e) => setAdj({ ...adj, basisStudy: e.target.value })} /></Field>
            <ActionButton onClick={createAdj}>{t("act.create", lang)}</ActionButton>
            <div className="mt-1 rounded border bg-muted/30 p-2">
              <p className="mb-1 text-[11px] font-medium">Increase validation (Proc. Arts. 8-9)</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectField value={val.fileId} onChange={(v) => setVal({ ...val, fileId: v })}
                  options={registered.map((f) => ({ value: f.id, label: `${f.fileNumber} (${f.monthlyRent} ETB)` }))} placeholder="Contract" />
                <TextField type="number" placeholder="Proposed rent" value={val.proposedRent} onChange={(e) => setVal({ ...val, proposedRent: e.target.value })} />
              </div>
              <div className="mt-2"><ActionButton variant="outline" onClick={validateIncrease} disabled={!val.fileId}>Validate against ceiling</ActionButton></div>
            </div>
          </div>
        </Panel>
        <Panel title="M5 · Adjustment register" subtitle="Calendar events CAL-JUN1-PUBLICATION and CAL-JUN30-EFFECT drive the engine.">
          <DataTable
            headers={["Year", "Percentage", "Status", "Published", "Effective", "Acts"]}
            rows={boot.adjustments.map((a) => [
              String(a.year), `+${a.percentage}%`,
              <StatusBadge key={a.id} value={a.status} />,
              fmtDate(a.publishedAt), fmtDate(a.effectiveAt),
              <span key={`x-${a.id}`} className="flex gap-1">
                {a.status === "DRAFT" && <ActionButton variant="outline" onClick={() => adjAct(a.id, "publish")}>{t("act.publish", lang)}</ActionButton>}
                {a.status === "PUBLISHED" && <ActionButton variant="outline" onClick={() => adjAct(a.id, "effect")}>{t("act.effect", lang)}</ActionButton>}
                {a.status === "EFFECTIVE" && <RuleBadge rule="Arts. 8-11" />}
              </span>,
            ])}
            empty="No adjustments yet — draft the annual rate."
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M6 · Record payment" subtitle="Proc. Art. 13: only bank / legal electronic channels. A cash entry is flagged and auto-computes the 10% referral case (Dir. Art. 22). Prepayment cap 2 months (Art. 12).">
          <div className="grid grid-cols-1 gap-2">
            <SelectField value={pay.fileId} onChange={(v) => {
              const f = registered.find((x) => x.id === v);
              setPay({ ...pay, fileId: v, amount: f ? String(f.monthlyRent) : pay.amount });
            }} options={registered.map((f) => ({ value: f.id, label: `${f.fileNumber} (${f.monthlyRent} ETB/mo)` }))} placeholder="Registered contract" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Amount (ETB)"><TextField type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
              <Field label="Kind">
                <SelectField value={pay.kind} onChange={(v) => setPay({ ...pay, kind: v })}
                  options={[{ value: "RENT", label: "Monthly rent" }, { value: "PREPAYMENT", label: "Advance payment" }]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Months covered"><TextField type="number" value={pay.monthsCovered} onChange={(e) => setPay({ ...pay, monthsCovered: e.target.value })} /></Field>
              <Field label="Channel">
                <SelectField value={pay.method} onChange={(v) => setPay({ ...pay, method: v })}
                  options={["CBE_BIRR", "TELEBIRR", "AMOLE", "BANK_TRANSFER", "M_PESA", "CASH"].map((m) => ({ value: m, label: m.replace("_", " ") }))} />
              </Field>
            </div>
            <BoolField checked={pay.isCash} onChange={(v) => setPay({ ...pay, isCash: v })} label="Paid in cash OUTSIDE the electronic channel (Art. 13 violation)" />
            <ActionButton onClick={recordPay} disabled={!pay.fileId || !pay.amount}>{t("act.save", lang)}</ActionButton>
          </div>
        </Panel>
        <Panel title="M6 · Payment ledger" subtitle="Receipts are numbered; cash rows flag the referral chain feeding M9.">
          <DataTable
            headers={["Receipt", "Contract", "Amount", "Kind", "Channel", "Flag", "Paid"]}
            rows={boot.payments.map((p) => [
              <span key={p.id} className="font-mono text-[10px]">{p.receiptNumber}</span>,
              p.file?.fileNumber ?? "—", `${p.amount.toLocaleString()} ETB`, p.kind,
              p.method.replace("_", " "),
              p.cashFlag ? <StatusBadge key={`f-${p.id}`} value="CASH" /> : <RuleBadge key={`e-${p.id}`} rule="electronic" />,
              fmtDate(p.paidAt),
            ])}
            empty="No payments yet — record rent on a registered contract."
          />
        </Panel>
      </div>
    </div>
  );
}

export function DisputesPanel({ boot, lang, refresh }: PanelProps) {
  const [cf, setCf] = useState({ channel: "WRITTEN", groundCode: "", complainantName: "", complainantPhone: "", description: "", targetFileNumber: "" });
  const [ap, setAp] = useState({ complaintId: "", appellantName: "" });
  const decided = boot.complaints.filter((c) => c.status === "DECIDED");
  const set = (k: string, v: string) => setCf((f) => ({ ...f, [k]: v }));

  const createComplaint = async () => {
    const data = await call("/api/complaints", "POST", { ...cf, receivedAt: new Date().toISOString(), receivedAtOrgUnitId: boot.orgUnits.find((o) => o.tier === "WOREDA")!.id, groundCode: cf.groundCode || boot.grounds[0].code });
    if (data) { toast.success(`${data.refNumber} registered — 30-working-day decision clock opened (Proc. Art. 22)`); await refresh(); }
  };
  const cAct = async (id: string, action: string, payload: Record<string, unknown> = {}) => {
    const data = await call("/api/complaints", "PATCH", { id, action, ...payload });
    if (data) {
      toast.success(action === "decide" ? `${data.refNumber} decided (${data.decision}) — 15-day appeal window opened (Proc. Art. 24)` : `${data.refNumber} → ${data.status}`);
      await refresh();
    }
  };
  const fileAppeal = async () => {
    const data = await call("/api/appeals", "POST", { ...ap, filedAt: new Date().toISOString() });
    if (data) { toast.success(`${data.appealNumber} filed — committee hearing window opened`); await refresh(); }
  };
  const aAct = async (id: string, action: string) => {
    const data = await call("/api/appeals", "PATCH", { id, action, decision: action === "decide" ? "COMMITTEE_UPHOLDS_DECISION" : undefined }, "STF-0006");
    if (data) { toast.success(`${data.appealNumber} → ${data.status}`); await refresh(); }
  };
  const sweep = async () => {
    const data = await call("/api/deadlines", "POST", {}, "STF-0008");
    if (data) { toast.success(`${data.swept} overdue clock(s) escalated; ${data.openRemaining} open`); await refresh(); }
  };

  const nextAction = (s: string) => {
    switch (s) {
      case "INTAKE": return "verify";
      case "COMPLETENESS_VERIFIED": return "investigate";
      case "UNDER_INVESTIGATION": return "decide";
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M8 · Intake complaint" subtitle="Dir. Arts. 17-19: eight-grounds checklist, multichannel (written / verbal / telephone / online), completeness check, complaint register.">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Channel">
                <SelectField value={cf.channel} onChange={(v) => set("channel", v)}
                  options={["WRITTEN", "VERBAL", "TELEPHONE", "ONLINE"].map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label="Ground (one of eight)">
                <SelectField value={cf.groundCode || boot.grounds[0]?.code || ""} onChange={(v) => set("groundCode", v)}
                  options={boot.grounds.map((g) => ({ value: g.code, label: `${g.code} ${g.nameEn}` }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Complainant (may be anonymous)"><TextField value={cf.complainantName} onChange={(e) => set("complainantName", e.target.value)} /></Field>
              <Field label="Phone"><TextField value={cf.complainantPhone} onChange={(e) => set("complainantPhone", e.target.value)} /></Field>
            </div>
            <Field label="Statement of facts (register entry)"><TextField value={cf.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <ActionButton onClick={createComplaint} disabled={cf.description.length < 10}>{t("act.create", lang)}</ActionButton>
          </div>
        </Panel>
        <Panel title="M8 · Complaint register and decisions" subtitle="Proc. Art. 22: decision within 30 working days; Art. 24: appeal within 15 days; Arts. 25-26: committee, then court.">
          <DataTable
            headers={["Ref", "Ground", "Channel", "Status", "Decision", "Due", "Acts"]}
            rows={boot.complaints.map((c) => [
              <span key={c.id} className="font-mono text-[10px]">{c.refNumber}</span>,
              `${c.ground.code} ${c.ground.nameEn}`,
              c.channel,
              <StatusBadge key={`s-${c.id}`} value={c.status} />,
              c.decision ? `${c.decision}${c.decisionSummary ? ` — ${c.decisionSummary}` : ""}` : "—",
              fmtDate(c.decisionDueAt),
              <span key={`a-${c.id}`} className="flex gap-1">
                {nextAction(c.status) === "verify" && <ActionButton variant="outline" onClick={() => cAct(c.id, "verify")}>Check</ActionButton>}
                {nextAction(c.status) === "investigate" && <ActionButton variant="outline" onClick={() => cAct(c.id, "investigate", { note: "Field verification assigned" })}>Investigate</ActionButton>}
                {nextAction(c.status) === "decide" && (
                  <>
                    <ActionButton variant="outline" onClick={() => cAct(c.id, "decide", { decision: "UPHOLD", summary: "Violation confirmed" })}>Uphold</ActionButton>
                    <ActionButton variant="ghost" onClick={() => cAct(c.id, "decide", { decision: "REJECT", summary: "No violation found" })}>Reject</ActionButton>
                  </>
                )}
              </span>,
            ])}
            empty="No complaints yet — intake a complaint on the left."
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Panel title="M8 · File appeal" subtitle="Proc. Art. 24: within 15 days of the decision; the window is validated and expired filings are rejected.">
          <div className="grid grid-cols-1 gap-2">
            <SelectField value={ap.complaintId} onChange={(v) => setAp({ ...ap, complaintId: v })}
              options={decided.map((c) => ({ value: c.id, label: `${c.refNumber} (${c.decision})` }))} placeholder="Decided complaint" />
            <Field label="Appellant name"><TextField value={ap.appellantName} onChange={(e) => setAp({ ...ap, appellantName: e.target.value })} /></Field>
            <ActionButton onClick={fileAppeal} disabled={!ap.complaintId || !ap.appellantName}>{t("act.submit", lang)}</ActionButton>
          </div>
        </Panel>
        <Panel title="M8 · Appeals before the committee" subtitle="Proc. Arts. 25-26: hearing, decision, court escalation path.">
          <DataTable
            headers={["Appeal", "Complaint", "Appellant", "Status", "Filed", "Acts"]}
            rows={boot.appeals.map((a) => [
              <span key={a.id} className="font-mono text-[10px]">{a.appealNumber}</span>,
              a.complaint?.refNumber ?? "—", a.appellantName,
              <StatusBadge key={`s-${a.id}`} value={a.status} />,
              fmtDate(a.filedAt),
              <span key={`x-${a.id}`} className="flex gap-1">
                {a.status === "FILED" && <ActionButton variant="outline" onClick={() => aAct(a.id, "schedule")}>Schedule</ActionButton>}
                {a.status === "SCHEDULED" && <ActionButton variant="outline" onClick={() => aAct(a.id, "hear")}>Hear</ActionButton>}
                {a.status === "HEARD" && <ActionButton variant="outline" onClick={() => aAct(a.id, "decide")}>Decide</ActionButton>}
                {a.status === "DECIDED" && <ActionButton variant="ghost" onClick={() => aAct(a.id, "escalate")}>To court</ActionButton>}
              </span>,
            ])}
            empty="No appeals yet."
          />
        </Panel>
      </div>

      <Panel title="M12 · Deadline engine" subtitle="Every statutory clock in one register (Proc. Arts. 4, 6, 7, 22, 24; Dir. Arts. 10, 19). Sweep escalates overdue clocks.">
        <div className="mb-2"><ActionButton variant="outline" onClick={sweep}>Sweep and escalate overdue clocks</ActionButton></div>
        <DataTable
          headers={["Clock", "Subject", "Due", "Basis", "Status"]}
          rows={boot.deadlines.map((dl) => [
            <span key={dl.id} className="font-mono text-[10px]">{dl.code}</span>,
            `${dl.subjectType} ${dl.subjectRef}`,
            `${fmtDate(dl.dueAt)}${dl.isWorkingDays ? " (wd)" : ""}`,
            dl.name,
            <span key={`st-${dl.id}`} className="flex items-center gap-1"><StatusBadge value={dl.status} />{dl.escalated && <RuleBadge rule="escalated" />}</span>,
          ])}
          empty="No clocks running — register a complaint or file to start them."
        />
      </Panel>
    </div>
  );
}
