// ============================================================================
// tenant-theme.tsx — White-label theme loader (SaaS).
// Fetches /api/tenant/branding for the ACTIVE tenant and applies it to the
// document: CSS custom properties on :root (no hardcoded city colors in the
// UI), document.title (portalTitle), favicon and (when provided) the logo.
// Two usage modes:
//   <TenantThemeProvider cityCode={officer.cityCode} />   — console shell
//   <TenantThemeProvider resolveFrom="url" />             — login page
// City A gets a blue theme, City B a green one — same codebase, same app.
// ============================================================================

"use client";

import { useEffect, useState } from "react";

export type TenantThemeData = {
  cityCode: string;
  slug: string | null;
  status: string;
  nameEn: string;
  portalTitle: string | null;
  welcomeMessage: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: { primary: string; secondary: string; accent: string; accentSoft: string; accentBright: string };
  modules: Record<string, boolean>;
};

export const DEFAULT_THEME: TenantThemeData = {
  cityCode: "",
  slug: null,
  status: "ACTIVE",
  nameEn: "",
  portalTitle: null,
  welcomeMessage: null,
  logoUrl: null,
  faviconUrl: null,
  colors: {
    primary: "#1D4ED8", secondary: "#0F766E", accent: "#D4875A",
    accentSoft: "rgba(212, 135, 90, 0.15)", accentBright: "#E8A87E",
  },
  modules: {},
};

function cssVars(theme: TenantThemeData): string {
  const c = theme.colors;
  return `:root{--tenant-primary:${c.primary};--tenant-secondary:${c.secondary};--tenant-accent:${c.accent};--tenant-accent-soft:${c.accentSoft};--tenant-accent-bright:${c.accentBright};--tenant-logo:${theme.logoUrl ? `url(${theme.logoUrl})` : "none"};}`;
}

function applyTheme(theme: TenantThemeData) {
  let style = document.getElementById("tenant-theme-vars");
  if (!style) {
    style = document.createElement("style");
    style.id = "tenant-theme-vars";
    document.head.appendChild(style);
  }
  style.textContent = cssVars(theme);
  if (theme.portalTitle) document.title = theme.portalTitle;
  if (theme.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = theme.faviconUrl;
  }
}

/** Console mode: theme follows the officer's pinned / currently viewed city. */
export function TenantThemeProvider({ cityCode, children }: { cityCode?: string | null; children?: React.ReactNode }) {
  const [theme, setTheme] = useState<TenantThemeData>(DEFAULT_THEME);
  useEffect(() => {
    const q = cityCode ? `?city=${encodeURIComponent(cityCode)}` : "";
    fetch(`/api/tenant/branding${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.theme) {
          setTheme({ ...(j.data.theme as TenantThemeData), modules: (j.data.theme.modules ?? {}) as Record<string, boolean> });
        }
      })
      .catch(() => { /* default theme stays */ });
  }, [cityCode]);
  useEffect(() => { applyTheme(theme); }, [theme]);
  return <>{children}</>;
}

/** Login mode: resolve from ?city= / ?slug= in the URL, else the hostname
 *  (subdomain via middleware header is resolved server-side by the API when
 *  no explicit query is present). */
export function LoginTenantTheme() {
  const [theme, setTheme] = useState<TenantThemeData>(DEFAULT_THEME);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const city = params.get("city");
    const slug = params.get("slug");
    const q = city ? `?city=${encodeURIComponent(city)}` : slug ? `?slug=${encodeURIComponent(slug)}` : "";
    fetch(`/api/tenant/branding${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.theme) setTheme(j.data.theme as TenantThemeData);
      })
      .catch(() => { /* default theme stays */ });
  }, []);
  useEffect(() => { applyTheme(theme); }, [theme]);
  return null;
}
