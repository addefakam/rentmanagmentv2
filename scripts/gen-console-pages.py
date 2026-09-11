#!/usr/bin/env python3
"""Generate the (console) route pages + layout and the login page."""
import os, pathlib

BASE = pathlib.Path("/home/z/my-project/src/app")

LAYOUT = '''// ============================================================================
// (console)/layout.tsx — server-side auth gate for every console page.
// No signed officer cookie -> straight to the login page.
// ============================================================================

import { redirect } from "next/navigation";
import { currentOfficer } from "@/lib/auth/officer";
import { ConsoleShell } from "@/components/platform/shell";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const officer = await currentOfficer();
  if (!officer) redirect("/login");
  return (
    <ConsoleShell
      officer={{
        staffCode: officer.staffCode, fullName: officer.fullName, roleCode: officer.roleCode,
        roleTier: officer.roleTier, orgUnitCode: officer.orgUnitCode,
        cityCode: officer.cityCode, national: officer.national,
      }}
    >
      {children}
    </ConsoleShell>
  );
}
'''

MODULES = {
    "page.tsx": ("", "DashboardPage", "panels-dashboard"),
    "parties/page.tsx": ("Parties (M1)", "PartiesPanel", "panels-s1"),
    "properties/page.tsx": ("Properties & Model Contract (M2, M3)", "AssetsPanel", "panels-s2s3"),
    "registration/page.tsx": ("Registration & Certification (M4)", "RegistrationPanel", "panels-s2s3"),
    "rent/page.tsx": ("Rent Adjustment & Payments (M5, M6)", "RentPanel", "panels-s4s5"),
    "complaints/page.tsx": ("Complaints & Deadline Engine (M8, M12)", "DisputesPanel", "panels-s4s5"),
    "enforcement/page.tsx": ("Control & Penalties (M7, M9)", "EnforcementPanel", "panels-s6s7"),
    "reports/page.tsx": ("Data & Reporting (M10, M11)", "DataPanel", "panels-s6s7"),
    "settings/page.tsx": ("City Settings", "SettingsPage", "panels-settings"),
    "project/page.tsx": ("Evidence & Gates", "EvidencePanel", "panels-evidence"),
    "project/testing/page.tsx": ("P5 · Testing & Compliance", "QualityPanel", "panels-p5"),
    "project/uat/page.tsx": ("P6 · UAT & Legal Validation", "UatPanel", "panels-p6"),
    "project/pilot/page.tsx": ("P7 · Migration, Training & Pilot", "PilotPanel", "panels-p7"),
    "project/golive/page.tsx": ("P8 · Go-Live & Operations", "GoLivePanel", "panels-p8"),
}

ROUTE_KEYS = {
    "page.tsx": "/", "parties/page.tsx": "/parties", "properties/page.tsx": "/properties",
    "registration/page.tsx": "/registration", "rent/page.tsx": "/rent",
    "complaints/page.tsx": "/complaints", "enforcement/page.tsx": "/enforcement",
    "reports/page.tsx": "/reports", "settings/page.tsx": "/settings",
    "project/page.tsx": "/project", "project/testing/page.tsx": "/project/testing",
    "project/uat/page.tsx": "/project/uat", "project/pilot/page.tsx": "/project/pilot",
    "project/golive/page.tsx": "/project/golive",
}

PROJECT_PAGES = {"project/page.tsx", "project/testing/page.tsx", "project/uat/page.tsx", "project/pilot/page.tsx", "project/golive/page.tsx"}
# Panels needing only { lang } or { lang, refresh } (no boot)
LANG_ONLY = {"project/page.tsx": "lang", "project/testing/page.tsx": "lang, refresh",
             "project/uat/page.tsx": "lang, refresh", "project/pilot/page.tsx": "lang, refresh",
             "project/golive/page.tsx": "lang, refresh"}

SUBTITLES = {
    "page.tsx": None,
    "parties/page.tsx": "Proc. Arts. 4, 7; Dir. Art. 7 — identification original and copy; proxy with two witnesses.",
    "properties/page.tsx": "Proc. Arts. 2, 5, 10 — property registry with exemption clocks; the city model contract studio.",
    "registration/page.tsx": "Proc. Arts. 4, 6, 9, 12, 13; Dir. Arts. 6-10 — nine-point checklist, certify, stamp, register in the book.",
    "rent/page.tsx": "Proc. Arts. 8-13; Dir. Arts. 11, 16 — June calendar engine and the electronic payment ledger.",
    "complaints/page.tsx": "Proc. Arts. 22-26; Dir. Arts. 17-19 — eight-grounds intake, decisions, appeals, deadline clocks.",
    "enforcement/page.tsx": "Proc. Arts. 20, 29-32; Dir. Arts. 20, 22 — control teams, vacancy monitoring, penalty ladder.",
    "reports/page.tsx": "Dir. Art. 13; Proc. Art. 18 — replication, backups, aggregation snapshots, public feed.",
    "settings/page.tsx": "Per-city rule sets without code changes (Dir. Art. 14).",
    "project/page.tsx": "Phase 3 promotion evidence and gate exit checklists.",
    "project/testing/page.tsx": "V-model test battery, legal compliance matrix, security and performance evidence.",
    "project/uat/page.tsx": "Role-based acceptance battery and the legal validation session.",
    "project/pilot/page.tsx": "Legacy book migration, reconciliation, training and pilot day logs.",
    "project/golive/page.tsx": "Go-live waves, cutover, hypercare and the closure record.",
}

def page_src(rel: str, title: str, comp: str, module_: str) -> str:
    route = ROUTE_KEYS[rel]
    props = LANG_ONLY.get(rel)
    if props is not None:
        body = f"<{comp} " + " ".join(f"{x}={{{x}}}" for x in props.split(", ")) + " />"
    else:
        body = f"<{comp} boot={{boot}} lang={{lang}} refresh={{refresh}} />"
    args = props if props is not None else "boot, lang, refresh"
    sub = SUBTITLES[rel]
    sub_line = f'\n        subtitle="{sub}"' if sub else ""
    return f'''"use client";

import {{ ModuleFrame, PageHead }} from "@/components/platform/shell";
import {{ {comp} }} from "@/components/platform/{module_}";

export default function Page() {{
  return (
    <ModuleFrame
      route="{route}"
      render={{({{ {args} }}) => (
        <>
          <PageHead title="{title}"{sub_line} />
          {body}
        </>
      )}}
    />
  );
}}
'''

for rel, (title, comp, module_) in MODULES.items():
    p = BASE / "(console)" / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(page_src(rel, title, comp, module_), encoding="utf-8")
    print("wrote", p)

(BASE / "(console)" / "layout.tsx").write_text(LAYOUT, encoding="utf-8")
print("wrote layout")

LOGIN = '''"use client";

// ============================================================================
// /login — officer sign-in: pick the city, pick your name from the register,
// enter your staff code. Issues the signed rc_officer cookie and enters the
// console at the officer's home city.
// ============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type CityOpt = { cityCode: string; nameEn: string; nameAm: string; nameOm: string; bureauCode: string };
type StaffOpt = { staffCode: string; fullName: string; roleCode: string; roleName: string; orgUnitCode: string; cityCode: string };

export default function LoginPage() {
  const router = useRouter();
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [city, setCity] = useState("");
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [picked, setPicked] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/staff").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setCities(j.data.cities);
        setCity(j.data.cities[0]?.cityCode ?? "");
      }
    });
  }, []);

  useEffect(() => {
    if (!city) return;
    setPicked(""); setCode(""); setError("");
    fetch(`/api/auth/staff?city=${encodeURIComponent(city)}`).then((r) => r.json()).then((j) => {
      if (j.ok) setStaff(j.data.staff);
    });
  }, [city]);

  const signIn = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode: code.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.ok) { window.location.href = "/"; return; }
      setError(String(json.error ?? "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A2330] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4875A] text-lg font-black text-white">R</span>
          <div>
            <h1 className="text-base font-bold leading-tight">Residential Rent Control & Administration</h1>
            <p className="text-xs text-muted-foreground">Officer sign-in · Proc. 1320/2016</p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">City administration</span>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Pick city" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.cityCode} value={c.cityCode}>{c.nameEn} · {c.bureauCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Officer</span>
            <Select value={picked} onValueChange={(v) => { setPicked(v); const s = staff.find((x) => x.staffCode === v); if (s) setCode(s.staffCode); }}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder={staff.length ? "Pick your name" : "Loading officers…"} /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.staffCode} value={s.staffCode}>
                    {s.fullName} — {s.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Staff code</span>
            <input
              className="h-10 rounded-md border px-3 font-mono text-sm outline-none focus-visible:border-[#D4875A] focus-visible:ring-2 focus-visible:ring-[#D4875A]/30"
              value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && code && !busy) void signIn(); }}
              placeholder="STF-…"
              aria-label="Staff code"
            />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <Button className="h-10 bg-[#D4875A] text-white hover:bg-[#c0744a]" disabled={!code || busy} onClick={signIn}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Demo codes — Addis Ababa: STF-0001 (woreda registrar), STF-0002 (stamping desk), STF-0005 (bureau head),
            STF-0007 (ministry), STF-0008 (system admin). Adama: STF-1001 (registrar), STF-1005 (bureau head).
          </p>
        </div>
      </div>
    </div>
  );
}
'''
(BASE / "login" / "page.tsx").write_text(LOGIN, encoding="utf-8")
print("wrote login")
print("OK")
