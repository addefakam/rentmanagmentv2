// ============================================================================
// panels-s1.tsx — Sprint S1 increments: M13 administration (org hierarchy,
// roles, staff, per-city configuration) and M1 party onboarding.
// PartiesPanel is LINK-FIRST: the onboarding form and the party register are
// separate link-addressable zones (/parties#onboard · /parties#register).
// ============================================================================

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { Panel, Field, TextField, SelectField, BoolField, ActionButton, DataTable, StatusBadge, RuleBadge, TabRail, useHashTab } from "./kit";

type PanelProps = { boot: BootPayload; lang: Lang; refresh: () => Promise<void> };

const orgName = (o: { nameEn: string; nameAm: string; nameOm: string }, lang: Lang) =>
  lang === "am" ? o.nameAm : lang === "om" ? o.nameOm || o.nameEn : o.nameEn;

// English-first dual-line name cell: primary name per selected UI language,
// with the Amharic (or English, when Amharic is selected) shown small underneath.
function OrgNameDual({ o, lang }: { o: { nameEn: string; nameAm: string; nameOm: string }; lang: Lang }) {
  const primary = orgName(o, lang);
  const secondary = lang === "am" ? o.nameEn : o.nameAm;
  return (
    <div className="leading-tight">
      <div>{primary}</div>
      {secondary && secondary !== primary ? (
        <div className="text-[10px] text-muted-foreground" dir="rtl" style={{ textAlign: "left" }}>
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

// Phase 5 RBAC: every mutating call carries the acting officer's staff code.
// The signed-in officer (set by the console shell after /api/auth login)
// becomes the default actor; panels that demonstrate separation of duties may
// still pass an explicit actor code. The city in view rides the x-city-code
// header so city-scoped endpoints (adjustments, publications) land correctly.
export const DEFAULT_ACTOR = "STF-0001";

type CallContext = { staffCode: string | null; cityCode: string | null };
let callCtx: CallContext = { staffCode: null, cityCode: null };
export function setCallContext(ctx: Partial<CallContext>) {
  callCtx = { ...callCtx, ...ctx };
}

export async function call(url: string, method: string, payload: unknown, actor?: string) {
  const m = method.toUpperCase();
  const res = await fetch(url, {
    method: m,
    headers: {
      "Content-Type": "application/json",
      "x-staff-code": actor ?? callCtx.staffCode ?? DEFAULT_ACTOR,
      ...(callCtx.cityCode ? { "x-city-code": callCtx.cityCode } : {}),
    },
    // GET/HEAD requests cannot carry a body — fetch throws TypeError if one
    // is attached, so payload is only serialized for mutating methods.
    ...(m === "GET" || m === "HEAD" ? {} : { body: JSON.stringify(payload) }),
  }).catch(() => null);
  if (!res) { toast.error("Network error — the request did not reach the server."); return null; }
  const json = await res.json();
  if (!json.ok) {
    toast.error(json.rule ? `${json.rule} — ${json.error}` : String(json.error ?? "Request failed"));
    return null;
  }
  return json.data;
}

export function AdminPanel({ boot, lang, refresh }: PanelProps) {
  const [subCityId, setSubCityId] = useState("");
  const subCities = useMemo(() => boot.orgUnits.filter((o) => o.tier === "SUB_CITY"), [boot.orgUnits]);
  const woredas = useMemo(
    () => boot.orgUnits.filter((o) => o.tier === "WOREDA" && o.parentId === (subCityId || subCities[0]?.id)),
    [boot.orgUnits, subCityId, subCities],
  );
  const selectedSubCity = boot.orgUnits.find((o) => o.id === (subCityId || subCities[0]?.id));
  const city = boot.cityConfigs[0];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="M13 · Organization hierarchy" subtitle="Directive Arts. 2, 6: Ministry → Bureau → Sub-city → Woreda. Register at the woreda where the house is located (Dir. Art. 6).">
        <div className="grid grid-cols-1 gap-3">
          <Field label="Sub-city">
            <SelectField
              value={subCityId || subCities[0]?.id || ""}
              onChange={setSubCityId}
              options={subCities.map((s) => ({ value: s.id, label: `${s.code} — ${orgName(s, lang)}` }))}
            />
          </Field>
          {selectedSubCity && (
            <p className="text-xs text-muted-foreground">
              {selectedSubCity.code}: {selectedSubCity.nameEn} · parent {boot.orgUnits.find((o) => o.id === selectedSubCity.parentId)?.code}
            </p>
          )}
          <DataTable
            headers={["Woreda", "Code", "Register status", "Basis"]}
            rows={woredas.map((w) => [
              <OrgNameDual key={`n-${w.id}`} o={w} lang={lang} />,
              <span key={w.id} className="font-mono text-[10px]">{w.code}</span>,
              w.confirmationStatus === "CONFIRMED"
                ? <StatusBadge key={`c-${w.id}`} value="CONFIRMED" />
                : <span key={`p-${w.id}`} className="text-[10px] text-amber-700">PENDING_OFFICIAL_REGISTER (O-7)</span>,
              <span key={`n-${w.id}`} className="line-clamp-1 max-w-[220px] text-[10px]">{w.sourceNote}</span>,
            ])}
            empty={t("state.empty", lang)}
          />
          <p className="text-[11px] text-muted-foreground">
            This is the register-status view. To rename a woreda or sub-city (English / አማርኛ / Afaan Oromoo), open{" "}
            <Link href="/settings#org" className="font-medium text-foreground underline underline-offset-2 hover:text-[#D4875A]">City Settings → Organization hierarchy</Link>.
          </p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4">
        <Panel title="M13 · Role catalogue" subtitle="SRS actor definitions, tier-scoped, trilingual (CR-01).">
          <DataTable
            headers={["Role", "Scope", "Legal note"]}
            rows={boot.roles.map((r) => [
              <OrgNameDual key={`r-${r.id}`} o={r} lang={lang} />,
              <Badge key={r.id} variant="outline" className="text-[10px]">{r.tierScope}</Badge>,
              <span key={`n-${r.id}`} className="line-clamp-1 max-w-[260px]">{r.legalNote}</span>,
            ])}
          />
        </Panel>
        <Panel title="M13 · Staff and per-city configuration" subtitle="Dir. Art. 14: system administration; per-city rule sets carry the statutory parameters.">
          <DataTable
            headers={["Staff", "Role", "Org unit", "UI language"]}
            rows={boot.staff.map((s) => [
              s.fullName,
              <OrgNameDual key={`sr-${s.id}`} o={s.role} lang={lang} />,
              <span key={s.id} className="font-mono text-[10px]">{s.orgUnit.code}</span>,
              s.language.toUpperCase(),
            ])}
          />
          {city && (
            <div className="mt-3 rounded border bg-muted/30 p-3 text-xs">
              <div className="font-semibold">{city.nameEn} ({city.cityCode}) · {city.currency} · work week {city.workWeek}</div>
              <p className="mt-1 text-muted-foreground">Min lease {city.minLeaseYears} years (Proc. Art. 6) · max prepayment {city.maxPrepayMonths} months (Proc. Art. 12)</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function PartiesPanel({ boot, lang, refresh }: PanelProps) {
  const [form, setForm] = useState({
    type: "LANDLORD", fullName: "", idTypeId: "", idNumber: "",
    idOriginalSeen: true, idCopyAttached: true, phone: "", address: "",
    isDeaf: false, usesSignLanguage: false,
    proxyName: "", proxyIdNumber: "", proxyWitness1Name: "", proxyWitness2Name: "",
    registeredAtOrgUnitId: "",
  });
  const woredas = useMemo(() => boot.orgUnits.filter((o) => o.tier === "WOREDA"), [boot.orgUnits]);
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const data = await call("/api/parties", "POST", {
      ...form, registeredAtOrgUnitId: form.registeredAtOrgUnitId || woredas[0]?.id,
      idTypeId: form.idTypeId || boot.idTypes[0]?.id,
    });
    if (data) {
      toast.success(`${data.partyCode} registered`);
      await refresh();
    }
  };

  const verify = async (id: string, decision: "VERIFIED" | "REJECTED") => {
    const data = await call(`/api/parties/${id}`, "PATCH", { decision });
    if (data) {
      toast.success(`Party ${decision.toLowerCase()}`);
      await refresh();
    }
  };

  const [tab] = useHashTab(["onboard", "register"], "onboard");
  const pending = boot.parties.filter((p) => p.verificationStatus === "PENDING").length;

  return (
    <div className="grid grid-cols-1 gap-4">
      <TabRail
        active={tab}
        ariaLabel="Parties sections"
        tabs={[
          { key: "onboard", label: "Onboard party", hint: "Register a landlord, tenant or agent (M1)" },
          { key: "register", label: "Party register", count: boot.parties.length, hint: `${pending} pending verification` },
        ]}
      />

      {tab === "onboard" ? (
      <Panel title="M1 · Onboard party" subtitle="Proc. Arts. 4, 7; Dir. Art. 7: identification original + copy; proxy needs two witnesses. Deaf-party data feeds the interpreter flow (Dir. Art. 8).">
        <div className="grid grid-cols-1 gap-3">
          <Field label="Party type">
            <SelectField value={form.type} onChange={(v) => set("type", v)}
              options={[{ value: "LANDLORD", label: "Landlord" }, { value: "TENANT", label: "Tenant" }, { value: "AGENT", label: "Agent / Proxy" }]} />
          </Field>
          <Field label="Full name"><TextField value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Full legal name" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Identification">
              <SelectField value={form.idTypeId || boot.idTypes[0]?.id || ""} onChange={(v) => set("idTypeId", v)}
                options={boot.idTypes.map((i) => ({ value: i.id, label: i.nameEn }))} />
            </Field>
            <Field label="ID number"><TextField value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></Field>
          </div>
          <BoolField checked={form.idOriginalSeen} onChange={(v) => set("idOriginalSeen", v)} label="Original identification seen" />
          <BoolField checked={form.idCopyAttached} onChange={(v) => set("idCopyAttached", v)} label="Copy attached to file" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone"><TextField value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Registered at woreda">
              <SelectField value={form.registeredAtOrgUnitId} onChange={(v) => set("registeredAtOrgUnitId", v)}
                options={woredas.slice(0, 40).map((w) => ({ value: w.id, label: w.code }))} />
            </Field>
          </div>
          <BoolField checked={form.isDeaf} onChange={(v) => set("isDeaf", v)} label="Deaf party (uses sign language)" />
          {form.type === "AGENT" && (
            <div className="grid grid-cols-1 gap-2 rounded border bg-muted/30 p-2">
              <p className="text-[11px] font-medium">Proxy documentation (Dir. Art. 7)</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Proxy name"><TextField value={form.proxyName} onChange={(e) => set("proxyName", e.target.value)} /></Field>
                <Field label="Proxy ID"><TextField value={form.proxyIdNumber} onChange={(e) => set("proxyIdNumber", e.target.value)} /></Field>
                <Field label="Witness 1"><TextField value={form.proxyWitness1Name} onChange={(e) => set("proxyWitness1Name", e.target.value)} /></Field>
                <Field label="Witness 2"><TextField value={form.proxyWitness2Name} onChange={(e) => set("proxyWitness2Name", e.target.value)} /></Field>
              </div>
            </div>
          )}
          <ActionButton onClick={submit} disabled={!form.fullName || !form.idNumber}>{t("act.create", lang)}</ActionButton>
        </div>
      </Panel>
      ) : null}

      {tab === "register" ? (
      <Panel title="M1 · Party register" subtitle="Registrar verification act before any filing (Proc. Art. 4).">
        <DataTable
          headers={["Code", "Name", "Type", "ID", "Docs", "Deaf", "Status", "Act"]}
          rows={boot.parties.map((p) => [
            <span key={p.id} className="font-mono text-[10px]">{p.partyCode}</span>,
            p.fullName,
            <Badge key={`t-${p.id}`} variant="outline" className="text-[10px]">{p.type}</Badge>,
            `${p.idType.code} · ${p.idNumber}`,
            p.idOriginalSeen && p.idCopyAttached ? "original + copy" : "incomplete",
            p.isDeaf ? "yes" : "—",
            <StatusBadge key={`s-${p.id}`} value={p.verificationStatus} />,
            p.verificationStatus === "PENDING" ? (
              <span key={`a-${p.id}`} className="flex gap-1">
                <ActionButton variant="outline" onClick={() => verify(p.id, "VERIFIED")}>{t("act.verify", lang)}</ActionButton>
                <ActionButton variant="ghost" onClick={() => verify(p.id, "REJECTED")}>{t("act.reject", lang)}</ActionButton>
              </span>
            ) : <RuleBadge key={`r-${p.id}`} rule="Dir. Art. 7" />,
          ])}
          empty={t("state.empty", lang)}
        />
      </Panel>
      ) : null}
    </div>
  );
}
