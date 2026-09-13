"use client";

// ============================================================================
// panels-audit.tsx — PLATFORM AUDIT TRAIL for the System Super User
// (owner directive: "remove insight and add some else if needed"). When
// Insights (city Data & Reports) left the super user's console, this fleet-wide
// oversight surface took its administrative place: every state-changing action
// across EVERY tenant city, in one tamper-evident chain (NFR-07), with
// filters by actor, city and free text, plus an on-demand full hash-chain
// integrity walk (verifyAuditChain).
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { call } from "./panels-s1";
import { useBoot } from "./shell";
import { Panel, Stat, Field, TextField, SelectField, ActionButton, DataTable, StatusBadge } from "./kit";

type AuditEvent = {
  seq: number; at: string; actorCode: string; actorRole: string;
  orgUnitCode: string | null; action: string; entity: string;
  entityRef: string | null; summary: string | null;
};
type Chain = { events: number; checked: number; intact: boolean; brokenAtSeq: number | null; reason: string | null };
type Payload = {
  scope: string; total: number; fetchedWindow: number; shown: number;
  events: AuditEvent[]; chain: Chain | null;
};

export function AuditTrailPage() {
  const { officer, boot } = useBoot();
  const [data, setData] = useState<Payload | null>(null);
  const [chainState, setChainState] = useState<Chain | null>(null); // last verdict survives filter reloads (payloads without a walk carry chain=null)
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("ALL");
  const [limit, setLimit] = useState("120");
  const [verifying, setVerifying] = useState(false);

  const buildQuery = useCallback((verify?: boolean) => {
    const p = new URLSearchParams();
    if (actor.trim()) p.set("actor", actor.trim());
    if (q.trim()) p.set("q", q.trim());
    if (city !== "ALL") p.set("city", city);
    p.set("limit", limit);
    if (verify) p.set("verify", "1");
    return p.toString();
  }, [actor, q, city, limit]);

  const load = useCallback(async (verify?: boolean) => {
    const d = await call(`/api/audit?${buildQuery(verify)}`, "GET", null, officer.staffCode);
    if (d) {
      setData(d as Payload);
      if ((d as Payload).chain) setChainState((d as Payload).chain);
    }
  }, [officer.staffCode, buildQuery]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const d = await call(`/api/audit?limit=${limit}`, "GET", null, officer.staffCode);
      if (alive && d) setData(d as Payload);
    })();
    return () => { alive = false; };
  }, [officer.staffCode]);

  const verifyChain = async () => {
    setVerifying(true);
    try { await load(true); } finally { setVerifying(false); }
  };

  if (!data) return <p className="px-1 py-6 text-sm text-muted-foreground">Loading the platform audit trail…</p>;

  const latest = data.events[0]?.at;
  const chain = chainState;

  return (
    <div className="grid grid-cols-1 gap-4">
      <Panel
        title="Chain overview"
        subtitle="The immutable audit chain (NFR-07) records every state-changing action in every city — SHA-256 linked, so any alteration of a historical event is detectable."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total events" value={data.total} hint="fleet-wide, all cities" />
          <Stat label="Showing" value={data.shown} hint={`window: ${data.fetchedWindow} most recent`} />
          <Stat label="Latest event" value={latest ? new Date(latest).toISOString().slice(0, 16).replace("T", " ") : "—"} hint="UTC" />
          <Stat
            label="Chain integrity"
            value={chain ? (chain.intact ? "INTACT" : "BROKEN") : "not verified"}
            hint={chain ? `${chain.checked} of ${chain.events} checked` : "run Verify to walk the full chain"}
          />
        </div>
        {chain ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {chain.intact ? (
              <span className="inline-flex items-center gap-2">
                <StatusBadge value="REGISTERED" />
                <span>All {chain.checked} events re-hashed in sequence order — every link matches its predecessor. The trail has not been altered.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <StatusBadge value="REJECTED" />
                <span>{chain.reason}</span>
              </span>
            )}
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Audit events"
        subtitle="Filter the fleet-wide trail. City scoping uses the officer's organizational unit prefix; SYSTEM / PUBLIC events carry no city and appear only under All cities."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Actor (staff code contains)"><TextField value={actor} onChange={(e) => setActor(e.target.value)} placeholder="STF-0008" /></Field>
          <Field label="Search (action, entity, ref, summary)"><TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. REGULATION or FILE_CERTIFY" /></Field>
          <Field label="City">
            <SelectField value={city} onChange={setCity} placeholder="All cities"
              options={[{ value: "ALL", label: "All cities" },
                ...(boot?.cities ?? []).map((c) => ({ value: c.cityCode, label: `${c.nameEn} (${c.cityCode})` }))]} />
          </Field>
          <Field label="Rows">
            <SelectField value={limit} onChange={setLimit} placeholder="120"
              options={[{ value: "50", label: "50" }, { value: "120", label: "120" }, { value: "200", label: "200" }, { value: "300", label: "300" }]} />
          </Field>
          <div className="flex items-end gap-2">
            <ActionButton onClick={() => void load()}>Apply filters</ActionButton>
            <ActionButton variant="outline" onClick={verifyChain} disabled={verifying}>{verifying ? "Verifying…" : "Verify chain"}</ActionButton>
          </div>
        </div>

        <div className="mt-4">
          <DataTable
            headers={["Seq", "Time (UTC)", "Actor", "Action", "Entity · Ref", "Unit", "Summary"]}
            empty="No audit events match the current filters."
            rows={data.events.map((e) => [
              <span key={`s-${e.seq}`} className="font-mono">{e.seq}</span>,
              new Date(e.at).toISOString().slice(0, 16).replace("T", " "),
              <span key={`a-${e.seq}`}>
                <span className="font-mono">{e.actorCode}</span>
                <span className="block text-[10px] text-muted-foreground">{e.actorRole.replace(/_/g, " ")}</span>
              </span>,
              <span key={`ac-${e.seq}`} className="font-mono">{e.action}</span>,
              <span key={`e-${e.seq}`}>
                {e.entity}{e.entityRef ? <span className="block font-mono text-[10px] text-muted-foreground">{e.entityRef}</span> : null}
              </span>,
              e.orgUnitCode ?? <span key={`u-${e.seq}`} className="text-muted-foreground">—</span>,
              e.summary ?? "",
            ])}
          />
        </div>
      </Panel>
    </div>
  );
}
