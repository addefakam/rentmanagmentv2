"use client";

// ============================================================================
// SuperAdminForm — the code-only sign-in for the separate /admin super-user
// portal (owner directive). Deliberately minimal and discreet: one staff-code
// field, no city picker, no officer roster, no demo codes, no link back to
// the public login. Identity renders the Addis Ababa tenant theme fetched
// from the public branding API; enforcement lives entirely server-side in
// /api/auth/super (SYSTEM_ADMIN-only, AA-bound).
// ============================================================================

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_THEME, type TenantThemeData } from "@/components/platform/tenant-theme";

export function SuperAdminForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<TenantThemeData>(DEFAULT_THEME);

  // The portal carries the Addis Ababa administration's white-label identity.
  useEffect(() => {
    fetch("/api/tenant/branding?city=AA", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.ok && j.data?.theme) setTheme(j.data.theme as TenantThemeData); })
      .catch(() => { /* platform default theme */ });
  }, []);

  const signIn = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/super", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode: code.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.ok) { window.location.href = "/platform/cities"; return; }
      setError(String(json.error ?? "Access denied."));
    } finally {
      setBusy(false);
    }
  };

  const accent = theme.colors.accent;
  const accentSoft = theme.colors.accentSoft;
  const logoInitial = (theme.nameEn || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ backgroundColor: "#141B26" }}>
      <LoginTenantThemeKey theme={theme} />
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: accentSoft }}>
            <ShieldCheck className="h-7 w-7" style={{ color: accent }} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight">System Administration</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {theme.nameEn ? `${theme.nameEn} · ` : ""}Restricted portal · Addis Ababa
            </p>
          </div>
        </div>

        <p className="mb-5 rounded-md px-3 py-2 text-[11px] leading-relaxed" style={{ backgroundColor: accentSoft, color: "#334155" }}>
          This address is reserved for the platform super user. All other officers sign in from the public portal.
        </p>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Super user code</span>
            <input
              className="h-10 rounded-md border px-3 font-mono text-sm outline-none"
              style={{ ["--tw-ring-color" as string]: accentSoft }}
              value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && code && !busy) void signIn(); }}
              placeholder="STF-…"
              autoComplete="off"
              autoFocus
              aria-label="Super user code"
            />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p> : null}

          <Button className="h-10 text-white hover:opacity-90" style={{ backgroundColor: accent }} disabled={!code || busy} onClick={signIn}>
            {busy ? "Verifying…" : "Enter administration"}
          </Button>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
          Residential Rent Control &amp; Administration · Proc. 1320/2016
        </p>
      </div>
    </div>
  );
}

/** Keeps the fetched AA theme applied on the admin surface (title + favicon). */
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
