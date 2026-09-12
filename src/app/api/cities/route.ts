// ============================================================================
// /api/cities — the SaaS control plane for the whole platform.
// The system admin treats every deployment as ONE city plus this fleet
// module; onboarding a city hands it the FULL system with its own city
// super-admin, who is locked to that city (no cross-city data, ever).
// A "city" is one BUREAU org-unit subtree plus a CityConfig row (Dir. Arts.
// 2, 6, 13); onboarding creates the org skeleton, the config, a cloned model
// contract and the mandatory city administrator in ONE step — no code changes.
//   GET   : all cities (active AND deactivated) with per-city operational
//           stats + the data the super-admin needs to read at regional level
//           (fleet-wide totals are derived client-side from the same rows).
//   POST  : onboard a new city (org tree + config + contract + city admin).
//   PATCH : two modes —
//           { cityCode, isActive }        -> activate / deactivate (soft
//                                            suspension, data untouched);
//           { cityCode, ...configFields } -> edit the city identity and
//                                            statutory parameters.
// Capability: GET reads need city:admin (MINISTRY_ANALYST read-only);
// POST / PATCH mutations need city:write (SYSTEM_ADMIN only).
// ============================================================================

import { ok, fail, body } from "@/lib/api";
import { withGuard, requireCapability, cityContext, SecurityError } from "@/lib/security/authz";
import { db } from "@/lib/db";
import {
  parseModules, allModulesEnabledJson, isTenantModuleCode,
} from "@/lib/tenant";

export const dynamic = "force-dynamic";

const AS_INT = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLOR_PRESETS: Record<string, { primary: string; secondary: string; accent: string }> = {
  AA: { primary: "#1D4ED8", secondary: "#0F766E", accent: "#2563EB" }, // Addis Ababa — blue
  DR: { primary: "#475569", secondary: "#334155", accent: "#64748B" }, // Dire Dawa — slate
  HAW: { primary: "#7C3AED", secondary: "#5B21B6", accent: "#8B5CF6" },
};

function normalizeModules(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return normalizeModules(parsed);
    } catch { return null; }
    return null;
  }
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (isTenantModuleCode(k)) out[k] = Boolean(val);
  }
  return JSON.stringify(out);
}

function normalizeDomains(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const list = Array.isArray(v)
    ? v.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : String(v).split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const okList = list.filter((d) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d));
  if (okList.length !== list.length) throw new Error("Custom domains must be valid hostnames like services.city.gov.et");
  return okList.length ? JSON.stringify([...new Set(okList)].slice(0, 10)) : null;
}

async function assertDomainsFree(domainsJson: string | null, exceptCity: string) {
  if (!domainsJson) return;
  const want = JSON.parse(domainsJson) as string[];
  const others = await db.cityConfig.findMany({ where: { cityCode: { not: exceptCity }, customDomainsJson: { not: null } } });
  for (const o of others) {
    let have: string[] = [];
    try { have = JSON.parse(o.customDomainsJson ?? "[]"); } catch { /* ignore */ }
    for (const d of want) {
      if (have.includes(d)) throw new Error(`Custom domain ${d} is already registered to ${o.cityCode}.`);
    }
  }
}

const OPEN_COMPLAINT_STATUSES = ["INTAKE", "COMPLETENESS_VERIFIED", "UNDER_INVESTIGATION"];

// GET — the fleet table for /cities. Per-city rows carry usage + operations
// stats so the system admin sees data at REGIONAL level (all-city totals) and
// can drill into CITY level through the switcher or each city's pages.
export async function GET(req: Request) {
  try {
    await requireCapability(req, "city:admin");
    const [units, configs, users, properties, files, complaints, payments, serviceDefs] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
      db.systemUser.findMany({ where: { isActive: true }, select: { orgUnitId: true } }),
      db.property.findMany({ select: { woredaId: true } }),
      db.registrationFile.findMany({ select: { woredaId: true } }),
      db.complaint.findMany({ select: { receivedAtOrgUnitId: true, status: true } }),
      db.payment.findMany({ select: { amount: true, file: { select: { woredaId: true } } } }),
      db.serviceDefinition.groupBy({ by: ["cityCode"], _count: { _all: true } }),
    ]);
    const serviceCounts = new Map(serviceDefs.map((s) => [s.cityCode, s._count._all]));
    const byParent = new Map<string | null, string[]>();
    for (const u of units) {
      const list = byParent.get(u.parentId) ?? [];
      list.push(u.id);
      byParent.set(u.parentId, list);
    }
    const subtree = (rootId: string): string[] => {
      const out: string[] = [];
      const stack = [rootId];
      while (stack.length) {
        const cur = stack.pop()!;
        out.push(cur);
        for (const child of byParent.get(cur) ?? []) stack.push(child);
      }
      return out;
    };
    const cities = configs.map((c) => {
      const ids = c.bureauId ? subtree(c.bureauId) : [];
      const tierOf = new Map(units.map((u) => [u.id, u.tier]));
      const woredaIds = ids.filter((id) => tierOf.get(id) === "WOREDA");
      const bureau = units.find((u) => u.id === c.bureauId);
      const cityComplaints = complaints.filter((k) => ids.includes(k.receivedAtOrgUnitId));
      const cityPayments = payments.filter((p) => woredaIds.includes(p.file.woredaId));
      return {
        cityCode: c.cityCode,
        nameEn: c.nameEn, nameAm: c.nameAm, nameOm: c.nameOm,
        bureauCode: bureau?.code ?? "—",
        canonicalLang: c.canonicalLang,
        currency: c.currency,
        complaintDecisionDays: c.complaintDecisionDays,
        appealDays: c.appealDays,
        isActive: c.isActive,
        // SaaS tenant fields (identity, lifecycle, branding, modules)
        slug: c.slug, status: c.status, country: c.country, region: c.region,
        timezone: c.timezone,
        contactEmail: c.contactEmail, contactPhone: c.contactPhone, contactAddress: c.contactAddress,
        logoUrl: c.logoUrl, faviconUrl: c.faviconUrl,
        primaryColor: c.primaryColor, secondaryColor: c.secondaryColor, accentColor: c.accentColor,
        portalTitle: c.portalTitle, welcomeMessage: c.welcomeMessage,
        modules: parseModules(c.modulesJson),
        customDomains: (() => { try { return JSON.parse(c.customDomainsJson ?? "[]") as string[]; } catch { return []; } })(),
        serviceCount: serviceCounts.get(c.cityCode) ?? 0,
        subCities: ids.filter((id) => tierOf.get(id) === "SUB_CITY").length,
        woredas: woredaIds.length,
        staff: users.filter((u) => ids.includes(u.orgUnitId)).length,
        properties: properties.filter((p) => woredaIds.includes(p.woredaId)).length,
        files: files.filter((f) => woredaIds.includes(f.woredaId)).length,
        complaintsOpen: cityComplaints.filter((k) => OPEN_COMPLAINT_STATUSES.includes(k.status)).length,
        complaintsTotal: cityComplaints.length,
        paymentsCount: cityPayments.length,
        paymentsAmount: Math.round(cityPayments.reduce((s, p) => s + p.amount, 0)),
      };
    });
    return ok({ cities });
  } catch (err) {
    return fail(err);
  }
}

// POST — onboard a new city in one step. The CITY super-admin account is
// created with the city, ALWAYS (owner requirement): one account with full
// authority over THIS city only (staff register, office structure, all city
// operations); it can never see another city's data. Staff codes auto-issue
// after the highest existing number so they never collide.
export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "city:write",
      { action: "CITY_ONBOARD", entity: "CityConfig", ref: (d: { cityCode: string }) => d.cityCode },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const cityCode = String(input.cityCode ?? "").trim().toUpperCase();
        const nameEn = String(input.nameEn ?? "").trim();
        if (!/^[A-Z]{2,4}$/.test(cityCode)) {
          throw new Error("City code must be 2–4 uppercase letters (e.g. HAW, BDU).");
        }
        if (!nameEn) throw new Error("City name (English) is required.");
        const nameAm = String(input.nameAm ?? "").trim() || nameEn;
        const nameOm = String(input.nameOm ?? "").trim() || nameEn;
        const canonicalLang = ["am", "en", "om"].includes(String(input.canonicalLang))
          ? String(input.canonicalLang) : "am";
        const workWeek = String(input.workWeek ?? "MON-FRI") === "MON-SAT" ? "MON-SAT" : "MON-FRI";

        const dupCity = await db.cityConfig.findUnique({ where: { cityCode } });
        if (dupCity) throw new Error(`City ${cityCode} already exists.`);
        const bureauCode = (String(input.bureauCode ?? "").trim().toUpperCase() || `${cityCode}-BUREAU`);
        const dupUnit = await db.orgUnit.findUnique({ where: { code: bureauCode } });
        if (dupUnit) throw new Error(`Org unit code ${bureauCode} is already registered.`);

        // ---- SaaS tenant identity ---------------------------------------
        // Slug (URL identity: <slug>.platform.com). Auto-derived from the
        // English name and made unique; explicit input wins.
        let slug = slugify(String(input.slug ?? "") || nameEn);
        if (slug) {
          const taken = await db.cityConfig.findUnique({ where: { slug } });
          if (taken) {
            const citySlugTaken = await db.cityConfig.findUnique({ where: { slug: slugify(cityCode) } });
            slug = citySlugTaken ? `${slug}-${cityCode.toLowerCase()}` : slugify(cityCode);
            if (await db.cityConfig.findUnique({ where: { slug } })) slug = null;
          }
        }
        const colorIn = (k: string, fallback: string) => {
          const v = String(input[k] ?? "").trim();
          return HEX.test(v) ? v.toUpperCase() : fallback;
        };
        const preset = COLOR_PRESETS[cityCode] ?? { primary: "#1D4ED8", secondary: "#0F766E", accent: "#2563EB" };
        const primaryColor = colorIn("primaryColor", preset.primary);
        const secondaryColor = colorIn("secondaryColor", preset.secondary);
        const accentColor = colorIn("accentColor", preset.accent);
        const modulesJson = normalizeModules(input.modules) ?? allModulesEnabledJson();
        const customDomainsJson = normalizeDomains(input.customDomains);
        if (customDomainsJson) await assertDomainsFree(customDomainsJson, cityCode);

        // The city super-admin role must exist before the account is created.
        // Seeded with the platform catalogue, upserted here so older database
        // (e.g. the production Postgres) also accept onboarding unchanged.
        await db.role.upsert({
          where: { code: "CITY_ADMIN" },
          update: {},
          create: {
            code: "CITY_ADMIN",
            nameEn: "City Super-Administrator",
            nameAm: "የከተማ ዋና አስተዳዳሪ",
            nameOm: "Bulchaa Waggaa Magaalaa",
            tierScope: "BUREAU",
            legalNote:
              "City Management: full authority over ONE city — staff register, office structure, all city operations; strictly no cross-city access.",
          },
        });

        // Starter org skeleton: bureau -> Central sub-city -> W01 woreda, so
        // the city is operational the moment it is onboarded (more units can
        // be added later from City Settings → org editor).
        const bureau = await db.orgUnit.create({
          data: {
            code: bureauCode, tier: "BUREAU",
            nameEn: `${nameEn} Rent Control Bureau`, nameAm: `${nameAm} የቤት ኪራይ ቁጥጥር ቢሮ`, nameOm: `${nameOm} Kiraalaa Too'annaa Bu'aa`,
            confirmationStatus: "CONFIRMED",
            sourceNote: "Onboarded from City Management by the system administrator.",
          },
        });
        const subCity = await db.orgUnit.create({
          data: {
            code: `${cityCode}-CENTRAL`, tier: "SUB_CITY", parentId: bureau.id,
            nameEn: `${nameEn} Central`, nameAm: `${nameAm} ማዕከላዊ`, nameOm: `${nameOm} Giddugaleessa`,
            confirmationStatus: "CONFIRMED",
            sourceNote: "Starter sub-city created at onboarding.",
          },
        });
        const woreda = await db.orgUnit.create({
          data: {
            code: `${cityCode}-CENTRAL-W01`, tier: "WOREDA", parentId: subCity.id,
            nameEn: `${nameEn} Central W01`, nameAm: `${nameAm} ማዕከላዊ ወረዳ 01`, nameOm: `${nameOm} Giddugaleessa W01`,
            confirmationStatus: "CONFIRMED",
            sourceNote: "Starter woreda created at onboarding.",
          },
        });

        const config = await db.cityConfig.create({
          data: {
            cityCode, bureauId: bureau.id, nameEn, nameAm, nameOm,
            currency: String(input.currency ?? "ETB").slice(0, 8).toUpperCase() || "ETB",
            workWeek, canonicalLang,
            minLeaseYears: AS_INT(input.minLeaseYears, 2),
            maxPrepayMonths: AS_INT(input.maxPrepayMonths, 2),
            complaintDecisionDays: AS_INT(input.complaintDecisionDays, 30),
            appealDays: AS_INT(input.appealDays, 15),
            isActive: true,
            // SaaS tenant identity / lifecycle / white-label / modules
            slug, status: "ACTIVE",
            country: String(input.country ?? "Ethiopia").slice(0, 80),
            region: String(input.region ?? "").trim().slice(0, 120) || null,
            timezone: String(input.timezone ?? "Africa/Addis_Ababa").slice(0, 64),
            contactEmail: String(input.contactEmail ?? "").trim().slice(0, 160) || null,
            contactPhone: String(input.contactPhone ?? "").trim().slice(0, 40) || null,
            contactAddress: String(input.contactAddress ?? "").trim().slice(0, 240) || null,
            logoUrl: String(input.logoUrl ?? "").trim().slice(0, 400) || null,
            faviconUrl: String(input.faviconUrl ?? "").trim().slice(0, 400) || null,
            primaryColor, secondaryColor, accentColor,
            portalTitle: String(input.portalTitle ?? "").trim().slice(0, 160) || null,
            welcomeMessage: String(input.welcomeMessage ?? "").trim().slice(0, 400) || null,
            modulesJson, configurationJson: null, customDomainsJson,
          },
        });

        // Starter service catalog (tenant-editable DATA — the application
        // hardcodes no services). The city renames/removes these freely.
        const starterServices = [
          { code: "REG-CERT", nameEn: "Rental contract registration & certification", category: "REGISTRATION", fee: 100, days: 5, docs: ["Lease agreement", "ID of landlord and tenant", "Ownership evidence"] },
          { code: "COMPLAINT-FILE", nameEn: "File a rent complaint", category: "COMPLAINTS", fee: 0, days: 30, docs: ["ID card", "Lease or payment evidence"] },
          { code: "PAY-RECEIPT", nameEn: "Rent payment recording", category: "PAYMENTS", fee: 0, days: 1, docs: ["Receipt reference"] },
          { code: "PERMIT-RENTAL", nameEn: "Rental business permit application", category: "PERMITS", fee: 250, days: 10, docs: ["Business license", "Ownership evidence", "ID card"] },
        ];
        for (const s of starterServices) {
          await db.serviceDefinition.create({
            data: {
              cityCode, code: s.code, nameEn: s.nameEn, category: s.category,
              requiredDocumentsJson: JSON.stringify(s.docs),
              processingTimeDays: s.days, slaDays: s.days,
              feeAmount: s.fee, feeCurrency: "ETB",
              departmentOrgUnitId: bureau.id,
              isActive: true, isPublic: true,
            },
          });
        }

        // Clone the federal model contract (AA active version) so registration
        // certification works out of the box; the city can amend it later.
        const base = await db.modelContract.findFirst({
          where: { status: "ACTIVE", cityCode: "AA" },
          include: { sections: { orderBy: { orderNo: "asc" } } },
        });
        let contractVersion: string | null = null;
        if (base) {
          const created = await db.modelContract.create({
            data: {
              cityCode, version: `${cityCode}-1.0`, status: "ACTIVE",
              issuedBy: `${nameEn} Rent Control Bureau`,
              legalBasis: base.legalBasis, canonicalLang,
              effectiveFrom: base.effectiveFrom,
              sections: {
                create: base.sections.map((s) => ({
                  orderNo: s.orderNo, code: s.code,
                  titleEn: s.titleEn, titleAm: s.titleAm, titleOm: s.titleOm,
                  contentEn: s.contentEn, contentAm: s.contentAm, contentOm: s.contentOm,
                  certificationStatus: "PENDING_LEGAL_REVIEW", legalBasis: s.legalBasis,
                })),
              },
            },
          });
          contractVersion = created.version;
        }

        const all = await db.systemUser.findMany({ select: { staffCode: true } });
        let next = 1;
        for (const u of all) {
          const m = /^STF-(\d+)$/.exec(u.staffCode);
          if (m) next = Math.max(next, Number(m[1]) + 1);
        }
        const mk = () => `STF-${next++}`;
        const adminName = String(input.cityAdminName ?? "").trim() || `${nameEn} City Administrator`;
        const admin = await db.systemUser.create({
          data: { staffCode: mk(), fullName: adminName, roleCode: "CITY_ADMIN", orgUnitId: bureau.id, language: canonicalLang },
        });

        // Optional additional starter team (bureau head / registrar / stamper).
        const team: string[] = [
          `${admin.staffCode} · CITY ADMIN — full authority over ${cityCode}`,
        ];
        if (input.seedTeam) {
          const roleCity = [
            { roleCode: "BUREAU_HEAD", name: String(input.bureauHeadName ?? "").trim(), orgUnitId: bureau.id },
            { roleCode: "WOREDA_REGISTRAR", name: String(input.registrarName ?? "").trim(), orgUnitId: woreda.id },
            { roleCode: "WOREDA_STAMPER", name: String(input.stamperName ?? "").trim(), orgUnitId: woreda.id },
          ];
          for (const r of roleCity) {
            if (!r.name) continue;
            const user = await db.systemUser.create({
              data: { staffCode: mk(), fullName: r.name, roleCode: r.roleCode, orgUnitId: r.orgUnitId, language: canonicalLang },
            });
            team.push(`${user.staffCode} · ${r.roleCode.replace(/_/g, " ")}`);
          }
        }

        return {
          cityCode: config.cityCode, bureauCode, contractVersion, team, slug,
          cityAdmin: { staffCode: admin.staffCode, fullName: admin.fullName },
          orgUnits: [bureau.code, subCity.code, woreda.code],
          message: `City ${nameEn} (${cityCode}) is live — city administrator ${admin.fullName} (${admin.staffCode}) can sign in and manage it immediately.${slug ? ` Tenant URL: /login?slug=${slug}` : ""}`,
        };
      },
    );
  } catch (err) {
    return fail(err);
  }
}

// PATCH — two modes (see header). Deactivation is soft: data is untouched,
// the city leaves the login directory and switcher, and its city-scoped
// officers are refused at sign-in until reactivated. Editing updates the
// city identity (trilingual names) and statutory parameters in place.
export async function PATCH(req: Request) {
  try {
    // Read the body ONCE (request bodies are single-read) and decide the
    // capability from it. Tenant-configuration mode uses city:manage so the
    // TENANT's own admin can white-label their city; lifecycle and
    // cross-tenant config stay platform-only (city:write).
    const input = await body<Record<string, unknown>>(req).catch(() => ({} as Record<string, unknown>));
    const TENANT_CONFIG_KEYS = [
      "logoUrl", "faviconUrl", "primaryColor", "secondaryColor", "accentColor",
      "portalTitle", "welcomeMessage", "contactEmail", "contactPhone", "contactAddress",
      "region", "timezone", "country", "modules", "customDomains", "configuration",
    ];
    const isTenantConfig = TENANT_CONFIG_KEYS.some((k) => k in input);
    return await withGuard(
      req, isTenantConfig && !("isActive" in input || "status" in input) ? "city:manage" : "city:write",
      { action: "CITY_UPDATE", entity: "CityConfig", ref: (d: { cityCode: string }) => d.cityCode },
      async (actor) => {

        // Mode 3 authority: the platform administrator (SYSTEM_ADMIN) or the
        // TENANT's own city-bound admin. Other national roles (Ministry) are
        // fleet READ surfaces and must never rewrite tenant configuration.
        const cityCode = String(input.cityCode ?? "");
        if (isTenantConfig && !("isActive" in input || "status" in input) && actor.national && actor.roleCode !== "SYSTEM_ADMIN") {
          throw new SecurityError(
            "Only the platform administrator or the tenant's own administrator may change tenant configuration.",
            "PLATFORM_ADMIN_REQUIRED",
          );
        }

        // Tenant-bound admins are ALWAYS forced to their own city; the scope
        // wall denies anything else (403) before a single field is read.
        let effectiveCity = cityCode;
        if (!actor.national) {
          const own = await cityContext(actor, { city: cityCode || null });
          effectiveCity = own.cityCode;
        }
        const config = await db.cityConfig.findUnique({ where: { cityCode: effectiveCity } });
        if (!config) throw new Error(`Unknown city: ${effectiveCity}`);

        // ---- Mode 1: activate / deactivate / suspend ---------------------
        if ("isActive" in input || "status" in input) {
          let nextStatus: string;
          let nextActive: boolean;
          if ("status" in input) {
            nextStatus = String(input.status).toUpperCase();
            if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(nextStatus)) {
              throw new Error("Status must be ACTIVE, SUSPENDED or DEACTIVATED.");
            }
            nextActive = nextStatus === "ACTIVE";
          } else {
            nextActive = Boolean(input.isActive);
            nextStatus = nextActive ? "ACTIVE" : "DEACTIVATED";
          }
          if (config.isActive === nextActive && config.status === nextStatus) {
            throw new Error(`Tenant ${effectiveCity} is already ${nextStatus.toLowerCase()}.`);
          }
          if (!nextActive) {
            const activeCount = await db.cityConfig.count({ where: { isActive: true } });
            if (activeCount <= 1 && config.isActive) {
              throw new Error("At least one active tenant must remain. Activate another tenant first.");
            }
          }
          const updated = await db.cityConfig.update({
            where: { cityCode: effectiveCity },
            data: { isActive: nextActive, status: nextStatus },
          });
          return {
            cityCode: updated.cityCode, isActive: updated.isActive, status: updated.status,
            message: nextActive
              ? `Tenant ${updated.nameEn} reactivated — officers can sign in again.`
              : `Tenant ${updated.nameEn} is now ${nextStatus.toLowerCase()} — its officers can no longer sign in; all data is preserved.`,
          };
        }

        // ---- Mode 2: edit identity + statutory parameters ------------------
        const data: Record<string, unknown> = {};
        if (input.nameEn !== undefined) {
          const v = String(input.nameEn).trim();
          if (!v) throw new Error("City name (English) cannot be empty.");
          data.nameEn = v;
        }
        if (input.nameAm !== undefined) data.nameAm = String(input.nameAm).trim() || config.nameEn;
        if (input.nameOm !== undefined) data.nameOm = String(input.nameOm).trim() || config.nameEn;
        if (input.canonicalLang !== undefined) {
          const v = String(input.canonicalLang);
          if (!["am", "en", "om"].includes(v)) throw new Error("Language must be am, en or om.");
          data.canonicalLang = v;
        }
        if (input.complaintDecisionDays !== undefined) {
          const v = AS_INT(input.complaintDecisionDays, config.complaintDecisionDays);
          data.complaintDecisionDays = v;
        }
        if (input.appealDays !== undefined) {
          const v = AS_INT(input.appealDays, config.appealDays);
          data.appealDays = v;
        }
        if (input.currency !== undefined) {
          data.currency = String(input.currency).slice(0, 8).toUpperCase() || config.currency;
        }
        if (input.workWeek !== undefined) {
          data.workWeek = String(input.workWeek) === "MON-SAT" ? "MON-SAT" : "MON-FRI";
        }

        // ---- Mode 3: SaaS tenant configuration (white-label, modules, -----
        //      contact, connectivity). Platform admin: any tenant. Tenant
        //      admin: own tenant only (enforced above by the scope wall).
        if (input.slug !== undefined) {
          const v = slugify(String(input.slug));
          if (v) {
            const taken = await db.cityConfig.findUnique({ where: { slug: v } });
            if (taken && taken.cityCode !== effectiveCity) throw new Error(`Slug "${v}" is already used by another tenant.`);
            data.slug = v;
          } else if (actor.roleCode === "SYSTEM_ADMIN") {
            data.slug = null; // platform admin may clear the URL identity
          }
        }
        const colorSet = (k: string, col: string) => {
          const v = String(input[k] ?? "").trim();
          if (v) {
            if (!HEX.test(v)) throw new Error(`${k} must be a hex color like #1D4ED8.`);
            data[k] = v.toUpperCase();
          }
        };
        colorSet("primaryColor", config.primaryColor);
        colorSet("secondaryColor", config.secondaryColor);
        colorSet("accentColor", config.accentColor);
        if (input.logoUrl !== undefined) data.logoUrl = String(input.logoUrl).trim().slice(0, 400) || null;
        if (input.faviconUrl !== undefined) data.faviconUrl = String(input.faviconUrl).trim().slice(0, 400) || null;
        if (input.portalTitle !== undefined) data.portalTitle = String(input.portalTitle).trim().slice(0, 160) || null;
        if (input.welcomeMessage !== undefined) data.welcomeMessage = String(input.welcomeMessage).trim().slice(0, 400) || null;
        if (input.contactEmail !== undefined) data.contactEmail = String(input.contactEmail).trim().slice(0, 160) || null;
        if (input.contactPhone !== undefined) data.contactPhone = String(input.contactPhone).trim().slice(0, 40) || null;
        if (input.contactAddress !== undefined) data.contactAddress = String(input.contactAddress).trim().slice(0, 240) || null;
        if (input.region !== undefined) data.region = String(input.region).trim().slice(0, 120) || null;
        if (input.country !== undefined) data.country = String(input.country).trim().slice(0, 80) || "Ethiopia";
        if (input.timezone !== undefined) data.timezone = String(input.timezone).trim().slice(0, 64) || config.timezone;
        if (input.modules !== undefined) {
          const incoming = normalizeModules(input.modules);
          if (incoming) {
            // MERGE semantics: send only the flags to flip; unknown keys stay.
            const merged = { ...parseModules(config.modulesJson), ...(JSON.parse(incoming) as Record<string, boolean>) };
            data.modulesJson = JSON.stringify(merged);
          }
        }
        if (input.customDomains !== undefined) {
          const domains = normalizeDomains(input.customDomains) ?? null;
          await assertDomainsFree(domains, effectiveCity);
          data.customDomainsJson = domains;
        }
        if (input.configuration !== undefined) {
          data.configurationJson = input.configuration === null ? null : String(JSON.stringify(input.configuration)).slice(0, 8000);
        }

        if (Object.keys(data).length === 0) {
          throw new Error("Nothing to update — send the fields to edit (identity, statutory days, branding, modules, contact).");
        }
        const updated = await db.cityConfig.update({ where: { cityCode: effectiveCity }, data });
        return {
          cityCode: updated.cityCode, nameEn: updated.nameEn,
          canonicalLang: updated.canonicalLang, slug: updated.slug, status: updated.status,
          primaryColor: updated.primaryColor, accentColor: updated.accentColor,
          modules: parseModules(updated.modulesJson),
          message: `Tenant ${updated.nameEn} (${effectiveCity}) updated — branding, modules and configuration apply immediately; operational data is untouched.`,
        };
      },
    );
  } catch (err) {
    return fail(err);
  }
}
