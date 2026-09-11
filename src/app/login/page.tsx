"use client";

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
