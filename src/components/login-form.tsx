"use client";

// ============================================================================
// LoginForm — officer sign-in with WHITE-LABEL tenant branding (SaaS).
// The visible identity (portal title, logo tile, accent colors, welcome
// message) comes from /api/tenant/branding for the tenant resolved by
// subdomain / ?slug= / ?city= — City A renders blue, City B renders green,
// same codebase. If no tenant branding applies, the platform defaults show.
// ============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DEFAULT_THEME, type TenantThemeData } from "@/components/platform/tenant-theme";

type CityOpt = { cityCode: string; nameEn: string; nameAm: string; nameOm: string; bureauCode: string };
type StaffOpt = { staffCode: string; fullName: string; roleCode: string; roleName: string; orgUnitCode: string; cityCode: string };

export function LoginForm({ initialSlug, initialCity }: { initialSlug?: string; initialCity?: string }) {
  const router = useRouter();
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [city, setCity] = useState(initialCity || "");
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [picked, setPicked] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<TenantThemeData>(DEFAULT_THEME);

  // White-label theme: ?slug= / ?city= first, else the subdomain resolved by
  // middleware (server wrapper passed it down), else the platform default.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("city") ? `?city=${encodeURIComponent(params.get("city")!)}`
      : params.get("slug") ? `?slug=${encodeURIComponent(params.get("slug")!)}`
      : initialSlug ? `?slug=${encodeURIComponent(initialSlug)}`
      : "";
    fetch(`/api/tenant/branding${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.data?.theme) setTheme(j.data.theme as TenantThemeData); })
      .catch(() => { /* platform default theme */ });
  }, [initialSlug]);

  useEffect(() => {
    fetch("/api/auth/staff").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setCities(j.data.cities);
        setCity((c) => c || j.data.cities[0]?.cityCode || "");
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
        // `city` carries the portal whose roster the officer used — the server
        // refuses the System Admin from any city other than Addis Ababa.
        body: JSON.stringify({ staffCode: code.trim(), city }),
      });
      const json = await res.json();
      if (res.ok && json.ok) { window.location.href = "/"; return; }
      setError(String(json.error ?? "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  };

  const accent = theme.colors.accent;
  const accentSoft = theme.colors.accentSoft;
  const portalTitle = theme.portalTitle ?? "Residential Rent Control & Administration";
  const logoInitial = (theme.nameEn || portalTitle).trim().charAt(0).toUpperCase() || "R";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ backgroundColor: "#1A2330" }}>
      <LoginTenantThemeKey theme={theme} />
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt={`${theme.nameEn || "Tenant"} logo`} className="h-11 w-11 rounded-xl object-contain" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black text-white" style={{ backgroundColor: accent }}>
              {logoInitial}
            </span>
          )}
          <div>
            <h1 className="text-base font-bold leading-tight">{portalTitle}</h1>
            <p className="text-xs text-muted-foreground">
              {theme.nameEn ? `${theme.nameEn} · ` : ""}Officer sign-in · Proc. 1320/2016
            </p>
          </div>
        </div>

        {theme.status === "SUSPENDED" ? (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This tenant is currently suspended by the platform administrator.
          </p>
        ) : null}
        {theme.welcomeMessage ? (
          <p className="mb-4 rounded-md px-3 py-2 text-xs" style={{ backgroundColor: accentSoft, color: "#334155" }}>
            {theme.welcomeMessage}
          </p>
        ) : null}

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">City administration</span>
            <Select value={city} onValueChange={(v) => { setCity(v); const c = cities.find((x) => x.cityCode === v); if (c) window.history.replaceState(null, "", `?city=${c.cityCode}`); }}>
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
              className="h-10 rounded-md border px-3 font-mono text-sm outline-none"
              style={{ ["--tw-ring-color" as string]: accentSoft }}
              value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && code && !busy) void signIn(); }}
              placeholder="STF-…"
              aria-label="Staff code"
            />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <Button className="h-10 text-white hover:opacity-90" style={{ backgroundColor: accent }} disabled={!code || busy} onClick={signIn}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>

          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Demo codes — Addis Ababa: STF-0001 (woreda registrar), STF-0002 (stamping desk), STF-0005 (bureau head),
            STF-0007 (ministry), STF-0008 (system admin).
          </p>
        </div>
      </div>
    </div>
  );
}

/** Keeps the fetched theme applied on the login surface (title + favicon). */
function LoginTenantThemeKey({ theme }: { theme: TenantThemeData }) {
  useEffect(() => {
    let style = document.getElementById("tenant-theme-vars");
    if (!style) {
      style = document.createElement("style");
      style.id = "tenant-theme-vars";
      document.head.appendChild(style);
    }
    style.textContent = `:root{--tenant-primary:${theme.colors.primary};--tenant-secondary:${theme.colors.secondary};--tenant-accent:${theme.colors.accent};--tenant-accent-soft:${theme.colors.accentSoft};--tenant-accent-bright:${theme.colors.accentBright};}`;
    if (theme.portalTitle) document.title = theme.portalTitle;
  }, [theme]);
  return null;
}
