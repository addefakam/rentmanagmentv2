#!/usr/bin/env node
// ============================================================================
// backfill-tenants.mjs — Phase 9 migration: every EXISTING city becomes a
// full SaaS tenant with zero data loss. Idempotent: fills ONLY empty fields,
// so re-running (and re-running on production during provisioning) is safe.
//   - slug: derived from the English name (addis-ababa) — unique
//   - status: ACTIVE/DEACTIVATED derived from isActive
//   - white-label: per-city color presets (AA=blue, AD=green, DR=slate)
//   - modules: all 12 platform modules enabled
//   - starter service catalog for cities that have none (editable data)
// Run: node scripts/backfill-tenants.mjs [path-to-sqlite-or-env]
// ============================================================================
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const COLORS = {
  AA: { primary: "#1D4ED8", secondary: "#0F766E", accent: "#2563EB" }, // Addis Ababa — blue
  AD: { primary: "#059669", secondary: "#065F46", accent: "#10B981" }, // Adama — green
  DR: { primary: "#475569", secondary: "#334155", accent: "#64748B" }, // Dire Dawa — slate
};
const FALLBACK = { primary: "#1D4ED8", secondary: "#0F766E", accent: "#2563EB" };

const ALL_MODULES = {
  CITIZEN_SERVICES: true, SERVICE_REQUESTS: true, COMPLAINTS: true, APPOINTMENTS: true,
  PERMITS: true, LICENSING: true, PAYMENTS: true, NOTIFICATIONS: true,
  DOCUMENTS: true, REPORTS: true, ANALYTICS: true, ANNOUNCEMENTS: true,
};

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

const STARTER_SERVICES = [
  { code: "REG-CERT", nameEn: "Rental contract registration & certification", category: "REGISTRATION", fee: 100, days: 5, docs: ["Lease agreement", "ID of landlord and tenant", "Ownership evidence"] },
  { code: "COMPLAINT-FILE", nameEn: "File a rent complaint", category: "COMPLAINTS", fee: 0, days: 30, docs: ["ID card", "Lease or payment evidence"] },
  { code: "PAY-RECEIPT", nameEn: "Rent payment recording", category: "PAYMENTS", fee: 0, days: 1, docs: ["Receipt reference"] },
  { code: "PERMIT-RENTAL", nameEn: "Rental business permit application", category: "PERMITS", fee: 250, days: 10, docs: ["Business license", "Ownership evidence", "ID card"] },
];

async function main() {
  const cities = await db.cityConfig.findMany({ orderBy: { cityCode: "asc" } });
  console.log(`[backfill] ${cities.length} tenant(s) found`);
  let changed = 0;
  for (const c of cities) {
    const data = {};
    if (!c.slug) {
      let slug = slugify(c.nameEn);
      if (!slug || slug.length < 2) slug = c.cityCode.toLowerCase();
      const taken = await db.cityConfig.findUnique({ where: { slug } });
      if (taken) slug = slugify(`${c.nameEn}-${c.cityCode}`) || `${slug}-${c.cityCode.toLowerCase()}`;
      data.slug = slug;
    }
    if (!c.status) data.status = c.isActive ? "ACTIVE" : "DEACTIVATED";
    // Lifecycle sync repair: columns arrived with defaults, so a deactivated
    // legacy city can carry a stale ACTIVE status label.
    if (!c.isActive && c.status === "ACTIVE") data.status = "DEACTIVATED";
    if (c.isActive && c.status !== "ACTIVE" && c.status === "DEACTIVATED") data.status = "ACTIVE";
    if (!c.country) data.country = "Ethiopia";
    if (!c.timezone) data.timezone = "Africa/Addis_Ababa";
    // Apply the per-city color preset when the tenant still carries the
    // untouched SCHEMA DEFAULTS (added as defaults when the columns were
    // created — null-checks alone would never fire for existing rows).
    const DEFAULT_TRIPLE = (c) =>
      (c.primaryColor ?? "").toUpperCase() === "#1D4ED8" &&
      (c.secondaryColor ?? "").toUpperCase() === "#0F766E" &&
      (c.accentColor ?? "").toUpperCase() === "#D4875A";
    if (DEFAULT_TRIPLE(c) && (COLORS[c.cityCode] || !c.primaryColor)) {
      const preset = COLORS[c.cityCode] ?? FALLBACK;
      data.primaryColor = preset.primary;
      data.secondaryColor = preset.secondary;
      data.accentColor = preset.accent;
    }
    if (!c.modulesJson) data.modulesJson = JSON.stringify(ALL_MODULES);
    if (Object.keys(data).length > 0) {
      await db.cityConfig.update({ where: { cityCode: c.cityCode }, data });
      changed++;
      console.log(`[backfill] ${c.cityCode}: ${Object.keys(data).join(", ")}`);
    }
    // Starter service catalog for tenants without any (tenant-editable data).
    const svc = await db.serviceDefinition.count({ where: { cityCode: c.cityCode } });
    if (svc === 0) {
      const bureau = c.bureauId ?? (await db.orgUnit.findFirst({ where: { tier: "BUREAU", code: { startsWith: c.cityCode } } }))?.id ?? null;
      for (const s of STARTER_SERVICES) {
        await db.serviceDefinition.create({
          data: {
            cityCode: c.cityCode, code: s.code, nameEn: s.nameEn, category: s.category,
            requiredDocumentsJson: JSON.stringify(s.docs), processingTimeDays: s.days,
            slaDays: s.days, feeAmount: s.fee, feeCurrency: "ETB",
            departmentOrgUnitId: bureau, isActive: true, isPublic: true,
          },
        });
      }
      console.log(`[backfill] ${c.cityCode}: ${STARTER_SERVICES.length} starter services seeded`);
    }
  }
  console.log(`[backfill] done — ${changed} tenant(s) updated, ${cities.length} total`);
}

main().catch((e) => { console.error("[backfill] FAILED:", e); process.exit(1); })
  .finally(() => db.$disconnect());
