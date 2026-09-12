// ============================================================================
// shell.tsx — Console shell for the multi-city, multi-page platform.
// - BootProvider: fetches /api/platform?city=… for the city in view, exposes
//   { boot, refresh, lang, officer, setCity, setLang } to every module page.
// - ConsoleShell: GO-1 graphite sidebar + white topbar (city switcher for
//   national officers, trilingual language menu, officer chip with sign-out).
// - ModuleFrame: one wrapper per route page — enforces the RBAC page map and
//   hands the boot context to the existing module panels.
// ============================================================================

"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Building2, FileCheck2, Banknote, MessageSquareWarning,
  ShieldAlert, BarChart3, Settings, FolderGit2, LogOut, Languages, MapPin,
  Menu, ClipboardCheck, Truck, Rocket, FlaskConical, Globe2, Landmark, ScrollText,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "./i18n";
import type { BootPayload, Lang } from "./types";
import { setCallContext } from "./panels-s1";
import { NAV_GROUPS, NAV_ITEMS, canAccess } from "@/lib/rbac-pages";
import { parseModules } from "@/lib/tenant-modules";

export type ClientOfficer = {
  staffCode: string; fullName: string; roleCode: string; roleTier: string;
  orgUnitCode: string; cityCode: string | null; national: boolean;
};

// SaaS module visibility map — a console page belongs to a tenant module; the
// page disappears from the navigation when the tenant's module flag is off
// (and the module's APIs reject calls server-side — defense in depth).
const PAGE_MODULE: Record<string, string> = {
  "/parties": "SERVICE_REQUESTS",
  "/properties": "SERVICE_REQUESTS",
  "/registration": "SERVICE_REQUESTS",
  "/rent": "PAYMENTS",
  "/complaints": "COMPLAINTS",
  "/reports": "REPORTS",
};

type BootCtx = {
  boot: BootPayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
  lang: Lang;
  setLang: (l: Lang) => void;
  officer: ClientOfficer;
  setCity: (code: string) => void;
  tenantModules: Record<string, boolean> | null;
};

const Ctx = createContext<BootCtx | null>(null);

export function useBoot(): BootCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBoot must be used inside ConsoleShell");
  return ctx;
}

const GROUP_ICONS: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard, "/parties": Users, "/properties": Building2,
  "/registration": FileCheck2, "/rent": Banknote, "/complaints": MessageSquareWarning,
  "/enforcement": ShieldAlert, "/reports": BarChart3, "/settings": Settings,
  "/platform/management": Landmark, "/platform/audit": ScrollText, "/platform/cities": Globe2, "/project": FolderGit2, "/project/testing": FlaskConical,
  "/project/uat": ClipboardCheck, "/project/pilot": Truck, "/project/golive": Rocket,
};

export function ConsoleShell({ officer, children }: { officer: ClientOfficer; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLangState] = useState<Lang>("en");
  const [boot, setBoot] = useState<BootPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [city, setCityState] = useState<string>(officer.cityCode ?? "AA");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantModules, setTenantModules] = useState<Record<string, boolean> | null>(null);
  const [tenantTitle, setTenantTitle] = useState<string | null>(null);

  // White-label theme + module flags for the tenant in view. Re-applies when
  // a national officer switches city (each city can carry its own branding).
  useEffect(() => {
    fetch(`/api/tenant/branding?city=${encodeURIComponent(city)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data?.theme) {
          setTenantModules(j.data.theme.modules ?? {});
          setTenantTitle(j.data.theme.portalTitle ?? null);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, [city]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const refresh = useCallback(async (cityCode?: string) => {
    // Hard load (skeleton, unmounts panels) ONLY when nothing is booted yet
    // or the officer is SWITCHING cities. A same-city refresh (after an
    // onboard/edit/save) is soft: panels stay mounted so their local state —
    // e.g. the city-administrator credentials card just returned by an
    // onboarding — survives the data update.
    if (!boot || cityCode !== undefined) setLoading(true);
    try {
      const target = cityCode ?? city;
      const res = await fetch(`/api/platform?city=${encodeURIComponent(target)}`, { cache: "no-store" });
      if (res.status === 403) {
        // The officer's city was deactivated by the system administrator —
        // the session can no longer resolve a live city, so re-authenticate.
        toast.error("Your city access was deactivated. Please sign in again.");
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setBoot(json.data as BootPayload);
        setCallContext({ staffCode: officer.staffCode, cityCode: (json.data as BootPayload).cityCode });
      } else {
        toast.error(String(json.error ?? "Failed to load platform state"));
      }
    } finally {
      setLoading(false);
    }
  }, [city, officer.staffCode, boot]);

  useEffect(() => { void refresh(); }, []); // initial boot only

  const setCity = useCallback((code: string) => {
    setCityState(code);
    void refresh(code);
    router.replace(`?city=${encodeURIComponent(code)}`, { scroll: false });
  }, [refresh, router]);

  const ctx = useMemo<BootCtx>(
    () => ({ boot, loading, refresh: () => refresh(), lang, setLang, officer, setCity, tenantModules }),
    [boot, loading, refresh, lang, setLang, officer, setCity, tenantModules],
  );

  const visible = NAV_ITEMS.filter((n) => canAccess(n.href, officer.roleCode)).filter((n) => {
    const mod = PAGE_MODULE[n.href];
    if (!mod || !tenantModules) return true; // unknown mapping or flags not loaded yet — keep visible
    return parseModules(JSON.stringify(tenantModules))[mod] !== false;
  });
  const currentCity = boot?.cities.find((c) => c.cityCode === (boot?.cityCode ?? city));

  const nav = (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4" aria-label="Console">
      <Link href="/" className="mb-1 flex items-center gap-2 px-2" onClick={() => setMobileOpen(false)}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: "var(--tenant-accent, #D4875A)" }}>R</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">{tenantTitle ?? "Rent Control"}</span>
          <span className="block truncate text-[10px] text-slate-400">{currentCity ? currentCity.nameEn : "…"} · Proc. 1320/2016</span>
        </span>
      </Link>
      {NAV_GROUPS.map((g) => {
        const items = visible.filter((n) => n.group === g.key);
        if (items.length === 0) return null;
        return (
          <div key={g.key}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t(`nav.group.${g.key}`, lang)}</p>
            <div className="grid gap-0.5">
              {items.map((n) => {
                const Icon = GROUP_ICONS[n.href] ?? FolderGit2;
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${active ? "font-semibold text-[var(--tenant-accent-bright, #E8A87E)]" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                    style={active ? { backgroundColor: "var(--tenant-accent-soft, rgba(212,135,90,0.15))" } : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(n.labelKey, lang) === n.labelKey ? n.labelEn : t(n.labelKey, lang)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-auto rounded-lg bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
        <p className="font-semibold text-slate-200">{officer.fullName}</p>
        <p>{officer.roleCode.replace(/_/g, " ")} · {officer.orgUnitCode}</p>
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className="flex min-h-screen flex-col bg-muted/40">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b bg-[#1A2330] text-white">
          <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 md:hidden" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-0 bg-[#1A2330] p-0">
                <SheetTitle className="sr-only">Console navigation</SheetTitle>
                {nav}
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold sm:text-base">{t("app.title", lang)}</h1>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">{t("app.subtitle", lang)}</p>
            </div>

            {/* City switcher — national officers only */}
            {boot && (officer.national ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" style={{ color: "var(--tenant-accent, #D4875A)" }} aria-hidden />
                <Select value={boot.cityCode} onValueChange={setCity}>
                  <SelectTrigger className="h-8 w-[150px] border-white/20 bg-white/10 text-white text-sm" aria-label={t("shell.city", lang)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {boot.cities.map((c) => (
                      <SelectItem key={c.cityCode} value={c.cityCode}>
                        {c.nameEn} · {c.cityCode}{!c.isActive ? " (deactivated)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Badge variant="outline" className="border-white/20 text-[11px] text-slate-200">
                {currentCity?.nameEn ?? boot?.cityCode}
              </Badge>
            ))}

            {/* Language */}
            <div className="flex items-center gap-1.5">
              <Languages className="hidden h-3.5 w-3.5 sm:block" style={{ color: "var(--tenant-accent, #D4875A)" }} aria-hidden />
              <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                <SelectTrigger className="h-8 w-[130px] border-white/20 bg-white/10 text-white text-sm" aria-label="Language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ</SelectItem>
                  <SelectItem value="om">Afaan Oromoo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Officer */}
            <div className="hidden items-center gap-2 border-l border-white/15 pl-3 lg:flex">
              <div className="text-right leading-tight">
                <p className="text-xs font-semibold">{officer.fullName}</p>
                <p className="text-[10px] text-slate-400">{officer.staffCode}</p>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-8 gap-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                {t("shell.signout", lang)}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Desktop sidebar */}
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 border-r border-white/5 bg-[#1A2330] md:block">
            {nav}
          </aside>

          {/* Page content */}
          <main className="min-w-0 flex-1 px-3 py-4 sm:px-5">
            {children}
          </main>
        </div>

        <footer className="border-t bg-white py-3">
          <div className="px-4 text-[11px] text-muted-foreground sm:px-5">
            {boot ? `${currentCity?.nameEn ?? boot.cityCode} · Boot ${new Date(boot.generatedAt).toLocaleString()} · ${boot.counts.orgUnits} units · ${boot.counts.woredas} woredas · ` : ""}
            Proc. 1320/2016 · Dir. 7/2016 · SRS v1.1 (CR-01)
          </div>
        </footer>
      </div>
    </Ctx.Provider>
  );
}

/** Page wrapper: boot loading states, RBAC enforcement, panel rendering. */
export function ModuleFrame({ route, render }: {
  route: string;
  render: (ctx: { boot: BootPayload; lang: Lang; refresh: () => Promise<void> }) => React.ReactNode;
}) {
  const { boot, loading, refresh, lang, officer, tenantModules } = useBoot();
  if (!canAccess(route, officer.roleCode)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--tenant-accent, #D4875A)" }} aria-hidden />
        <h2 className="text-base font-bold">Not available for your role</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {officer.roleCode.replace(/_/g, " ")} ({officer.staffCode}) cannot open {route}. Ask a bureau head or system admin if you need access.
        </p>
      </div>
    );
  }
  // SaaS module gate (client mirror): direct navigation to a page whose
  // module the tenant disabled is refused here too — the module's APIs
  // enforce the same rule server-side.
  const requiredModule = PAGE_MODULE[route];
  if (requiredModule && tenantModules && tenantModules[requiredModule] === false) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--tenant-accent, #D4875A)" }} aria-hidden />
        <h2 className="text-base font-bold">Module not enabled</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The module "{requiredModule.replace(/_/g, " ").toLowerCase()}" is not enabled for this city by the platform administrator.
        </p>
      </div>
    );
  }
  if (loading || !boot) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="h-20 animate-pulse rounded-xl bg-white" />
        <div className="h-64 animate-pulse rounded-xl bg-white" />
        <p className="text-center text-xs text-muted-foreground">{t("state.loading", lang)}</p>
      </div>
    );
  }
  return <>{render({ boot, lang, refresh })}</>;
}

/** Page title block used at the top of every module page. */
export function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
