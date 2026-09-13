// ============================================================================
// purge-cities.mjs — permanent removal of a city (tenant) from the platform.
//
// Owner directive (2026-09-13): Adama City Administration ("AD") is removed
// from the system ENTIRELY — config, org tree, officers, service catalog,
// model contract and every operational record hanging under its bureau
// subtree. This is stronger than the soft lifecycle (deactivate/suspend):
// after the purge the city does not exist — not in the login directory, not
// in the fleet table, not in the console switcher, nowhere.
//
// The purge is:
//   - FK-SAFE ....... children deleted before parents (see DELETE ORDER);
//   - ATOMIC ........ everything runs in one interactive transaction;
//   - IDEMPOTENT .... safe to run on every build (no-op once done);
//   - ONE-SHOT ...... a PlatformSetting marker (key REMOVED_CITIES) records
//                     the removal, so re-onboarding a city with the same
//                     code later is NEVER auto-purged by a future build;
//   - SCOPED ........ only the listed city codes are touched; Addis Ababa
//                     (the federal capital / platform home) is hard-refused.
//
// AuditEvent rows are intentionally KEPT: the audit chain is append-only,
// hash-chained evidence with no foreign keys (and no Adama events exist).
// DeadlineTrack rows carry no foreign keys either (subject-ref strings);
// Adama produced none, so there is nothing to clean.
//
// Wired into scripts/provision-neon.mjs (runs during every Vercel build
// against the production Neon DB) and runnable locally against SQLite:
//
//   node scripts/purge-cities.mjs          # uses DATABASE_URL (default local)
// ============================================================================

import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The city codes removed from the platform by owner directive. Add new codes
// here ONLY with an explicit owner instruction — this list is the trigger.
export const REMOVED_CITIES = ["AD"];

// Never removable: the federal capital hosts the platform administration.
const PROTECTED_CITIES = new Set(["AA"]);

const MARKER_KEY = "REMOVED_CITIES";

/**
 * Remove every city in REMOVED_CITIES from the database behind `db`.
 * @param {import("@prisma/client").PrismaClient} db  active Prisma client
 * @param {(m: string) => void} log                   logger (e.g. provision log)
 * @returns {Promise<{purged: string[], skipped: string[]}>}
 */
export async function purgeRemovedCities(db, log = (m) => console.log(`[purge] ${m}`)) {
  const purged = [];
  const skipped = [];

  const marker = await db.platformSetting.findUnique({ where: { key: MARKER_KEY } });
  const done = new Set(
    String(marker?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );

  for (const code of REMOVED_CITIES) {
    if (PROTECTED_CITIES.has(code)) {
      log(`refusing to purge protected city ${code} — skipped.`);
      skipped.push(code);
      continue;
    }
    if (done.has(code)) {
      log(`${code}: already removed (marker present) — nothing to do.`);
      skipped.push(code);
      continue;
    }

    const cfg = await db.cityConfig.findUnique({ where: { cityCode: code } });
    if (!cfg) {
      // Nothing in the DB (fresh dev DB before seeding, or already gone).
      // Still write the marker so a future re-onboarded city with this code
      // is not auto-purged by later builds.
      await writeMarker(db, done, code, log);
      log(`${code}: not present in the database — marker recorded.`);
      skipped.push(code);
      continue;
    }

    // Safety: never leave the platform without an active tenant.
    const activeOthers = await db.cityConfig.count({
      where: { isActive: true, NOT: { cityCode: code } },
    });
    if (activeOthers === 0) {
      log(`refusing to purge ${code}: it is the ONLY active tenant. Onboard another city first.`);
      skipped.push(code);
      continue;
    }

    log(`purging ${code} (${cfg.nameEn}) — collecting scope...`);
    const counts = await purgeCity(db, code, log);
    purged.push(code);
    log(`${code} purged: ${Object.entries(counts).map(([m, n]) => `${m}=${n}`).join(", ")}`);
  }

  return { purged, skipped };
}

async function writeMarker(db, done, code, log) {
  const next = [...done, code].join(",");
  await db.platformSetting.upsert({
    where: { key: MARKER_KEY },
    create: { key: MARKER_KEY, value: next, updatedBy: "SYSTEM" },
    update: { value: next, updatedBy: "SYSTEM" },
  });
  done.add(code);
}

/** Collect every org-unit id inside the city's bureau subtree (incl. bureau). */
async function cityUnitIds(db, cfg) {
  const all = await db.orgUnit.findMany({ select: { id: true, code: true, parentId: true } });
  const byId = new Map(all.map((u) => [u.id, u]));
  const prefix = `${cfg.cityCode}-`;
  const ids = new Set();
  // Seed anchor: the bureau unit (CityConfig.bureauId) plus any unit whose
  // code carries the city prefix (belt and braces against re-parenting).
  for (const u of all) {
    if (u.id === cfg.bureauId || u.code?.startsWith(prefix)) ids.add(u.id);
  }
  // BFS to fixpoint over children.
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of all) {
      if (u.parentId && ids.has(u.parentId) && !ids.has(u.id)) {
        ids.add(u.id);
        grew = true;
      }
    }
  }
  // Depth map (root = bureau level 0) so org units can be deleted leaf-first.
  const depth = new Map();
  const depthOf = (u) => {
    if (depth.has(u.id)) return depth.get(u.id);
    const d = u.parentId && byId.has(u.parentId) && ids.has(u.parentId) ? depthOf(byId.get(u.parentId)) + 1 : 0;
    depth.set(u.id, d);
    return d;
  };
  const ordered = [...ids].sort((a, b) => depthOf(byId.get(b)) - depthOf(byId.get(a))); // deepest first
  return { ids: [...ids], ordered };
}

/** The full FK-safe delete order for one city. Runs inside a transaction. */
async function purgeCity(db, code, log) {
  return db.$transaction(async (tx) => {
    const cfg = await tx.cityConfig.findUnique({ where: { cityCode: code } });
    const { ids: unitIds, ordered: unitIdsLeafFirst } = await cityUnitIds(tx, cfg);
    const n = async (label, promise) => {
      const r = await promise;
      const count = r?.count ?? 0;
      if (count > 0) log(`  ${label}: ${count}`);
      return count;
    };

    // ---- scope collections -------------------------------------------------
    const files = await tx.registrationFile.findMany({ where: { woredaId: { in: unitIds } }, select: { id: true } });
    const fileIds = files.map((f) => f.id);
    const props = await tx.property.findMany({ where: { woredaId: { in: unitIds } }, select: { id: true } });
    const propIds = props.map((p) => p.id);
    const parties = await tx.party.findMany({ where: { registeredAtOrgUnitId: { in: unitIds } }, select: { id: true } });
    const partyIds = parties.map((p) => p.id);
    const complaints = await tx.complaint.findMany({
      where: { OR: [{ receivedAtOrgUnitId: { in: unitIds } }, { propertyId: { in: propIds } }] },
      select: { id: true },
    });
    const complaintIds = complaints.map((c) => c.id);
    const penalties = await tx.penaltyCase.findMany({ where: { propertyId: { in: propIds } }, select: { id: true } });
    const penaltyIds = penalties.map((p) => p.id);
    const teams = await tx.controlTeam.findMany({ where: { subCityId: { in: unitIds } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    const contracts = await tx.modelContract.findMany({ where: { cityCode: code }, select: { id: true } });
    const contractIds = contracts.map((c) => c.id);
    const sessions = await tx.trainingSession.findMany({ where: { orgUnitId: { in: unitIds } }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);
    const pilots = await tx.pilotConfig.findMany({ where: { subCityId: { in: unitIds } }, select: { id: true } });
    const pilotIds = pilots.map((p) => p.id);
    const legacy = await tx.legacyBookEntry.findMany({ where: { woredaId: { in: unitIds } }, select: { id: true } });
    const legacyIds = legacy.map((l) => l.id);

    const inUnits = { in: unitIds };
    const counts = {};

    // ---- 1. enforcement / control (property-scoped) ------------------------
    counts.referrals = await n("referrals", tx.referral.deleteMany({ where: { penaltyCaseId: { in: penaltyIds } } }));
    counts.controlVisits = await n("controlVisits", tx.controlVisit.deleteMany({
      where: { OR: [{ propertyId: { in: propIds } }, { teamId: { in: teamIds } }] },
    }));
    counts.penaltyCases = await n("penaltyCases", tx.penaltyCase.deleteMany({ where: { id: { in: penaltyIds } } }));

    // ---- 2. registration files and their children --------------------------
    counts.fileAnnotations = await n("fileAnnotations", tx.fileAnnotation.deleteMany({
      where: { OR: [{ fileId: { in: fileIds } }, { annotatedByOrgUnitId: inUnits }] },
    }));
    counts.contractWitnesses = await n("contractWitnesses", tx.contractWitness.deleteMany({ where: { fileId: { in: fileIds } } }));
    counts.checklistItems = await n("checklistItems", tx.registrationChecklistItem.deleteMany({ where: { fileId: { in: fileIds } } }));
    counts.payments = await n("payments", tx.payment.deleteMany({ where: { fileId: { in: fileIds } } }));
    counts.registryBookEntries = await n("registryBookEntries", tx.registryBookEntry.deleteMany({
      where: { OR: [{ fileId: { in: fileIds } }, { woredaId: inUnits }] },
    }));
    counts.reconciliationReports = await n("reconciliationReports", tx.reconciliationReport.deleteMany({ where: { woredaId: inUnits } }));
    counts.migrationRecords = await n("migrationRecords", tx.migrationRecord.deleteMany({
      where: {
        OR: [
          { fileId: { in: fileIds } }, { legacyEntryId: { in: legacyIds } }, { woredaId: inUnits },
          { propertyId: { in: propIds } }, { landlordId: { in: partyIds } }, { tenantId: { in: partyIds } },
        ],
      },
    }));
    counts.legacyBookEntries = await n("legacyBookEntries", tx.legacyBookEntry.deleteMany({ where: { woredaId: inUnits } }));
    counts.registrationFiles = await n("registrationFiles", tx.registrationFile.deleteMany({ where: { woredaId: inUnits } }));

    // ---- 3. properties and parties -----------------------------------------
    counts.properties = await n("properties", tx.property.deleteMany({ where: { woredaId: inUnits } }));
    counts.appeals = await n("appeals", tx.appeal.deleteMany({ where: { complaintId: { in: complaintIds } } }));
    counts.complaints = await n("complaints", tx.complaint.deleteMany({
      where: { OR: [{ receivedAtOrgUnitId: inUnits }, { propertyId: { in: propIds } }] },
    }));
    counts.partyDocuments = await n("partyDocuments", tx.partyDocument.deleteMany({ where: { partyId: { in: partyIds } } }));
    counts.parties = await n("parties", tx.party.deleteMany({ where: { registeredAtOrgUnitId: inUnits } }));

    // ---- 4. city-scoped programs (training, pilot, control) -----------------
    counts.traineeRecords = await n("traineeRecords", tx.traineeRecord.deleteMany({ where: { sessionId: { in: sessionIds } } }));
    counts.trainingSessions = await n("trainingSessions", tx.trainingSession.deleteMany({ where: { orgUnitId: inUnits } }));
    counts.pilotDayLogs = await n("pilotDayLogs", tx.pilotDayLog.deleteMany({ where: { configId: { in: pilotIds } } }));
    counts.pilotConfigs = await n("pilotConfigs", tx.pilotConfig.deleteMany({ where: { subCityId: inUnits } }));
    counts.controlTeams = await n("controlTeams", tx.controlTeam.deleteMany({ where: { subCityId: inUnits } }));

    // ---- 5. analytics / publications / replication --------------------------
    counts.aggregationSnapshots = await n("aggregationSnapshots", tx.aggregationSnapshot.deleteMany({ where: { orgUnitId: inUnits } }));
    counts.publicationItems = await n("publicationItems", tx.publicationItem.deleteMany({ where: { publishedByOrgUnitId: inUnits } }));
    counts.replicationLogs = await n("replicationLogs", tx.replicationLog.deleteMany({
      where: { OR: [{ fromOrgUnitId: inUnits }, { toOrgUnitId: inUnits }] },
    }));

    // ---- 6. tenant catalogues (service catalog, contracts, adjustments) -----
    counts.serviceDefinitions = await n("serviceDefinitions", tx.serviceDefinition.deleteMany({
      where: { OR: [{ cityCode: code }, { departmentOrgUnitId: inUnits }] },
    }));
    counts.modelContractSections = await n("modelContractSections", tx.modelContractSection.deleteMany({ where: { contractId: { in: contractIds } } }));
    counts.modelContracts = await n("modelContracts", tx.modelContract.deleteMany({ where: { cityCode: code } }));
    counts.rentAdjustments = await n("rentAdjustments", tx.rentAdjustment.deleteMany({ where: { cityCode: code } }));

    // ---- 7. officers, then the tenant itself, then the org tree -------------
    counts.systemUsers = await n("systemUsers", tx.systemUser.deleteMany({ where: { orgUnitId: inUnits } }));
    counts.cityConfig = await n("cityConfig", tx.cityConfig.deleteMany({ where: { cityCode: code } }));
    // Org units leaf-first (deepest hierarchy level deletes before its parent).
    for (const id of unitIdsLeafFirst) {
      await tx.orgUnit.delete({ where: { id } });
    }
    counts.orgUnits = unitIdsLeafFirst.length;

    // AuditEvent: intentionally kept (append-only hash chain, no FKs).
    // DeadlineTrack: no FKs; subject-ref strings only — nothing to detach.

    // ---- one-shot marker -----------------------------------------------------
    const marker = await tx.platformSetting.findUnique({ where: { key: MARKER_KEY } });
    const done = new Set(String(marker?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    if (!done.has(code)) {
      const next = [...done, code].join(",");
      await tx.platformSetting.upsert({
        where: { key: MARKER_KEY },
        create: { key: MARKER_KEY, value: next, updatedBy: "SYSTEM" },
        update: { value: next, updatedBy: "SYSTEM" },
      });
    }
    return counts;
  });
}

// ---------------------------------------------------------------------------
// CLI entry point — local runs against the active Prisma client (SQLite dev
// DB by default). The Vercel build path uses provision-neon.mjs instead.
// ---------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  process.env.DATABASE_URL ??= "file:./db/custom.db";
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] });
  const log = (m) => console.log(`[purge] ${m}`);
  purgeRemovedCities(db, log)
    .then(async (r) => {
      log(`done — purged: [${r.purged.join(", ") || "none"}], skipped: [${r.skipped.join(", ") || "none"}]`);
      // Post-conditions: no city, unit, officer or tenant catalog row may remain.
      for (const code of REMOVED_CITIES) {
        const city = await db.cityConfig.findUnique({ where: { cityCode: code } }).catch(() => null);
        if (city) throw new Error(`post-condition failed: CityConfig ${code} still exists`);
        const units = await db.orgUnit.count({ where: { code: { startsWith: `${code}-` } } });
        if (units > 0) throw new Error(`post-condition failed: ${units} org units of ${code} remain`);
        const staff = await db.systemUser.count({ where: { staffCode: { startsWith: `STF-${code === "AD" ? "1" : "?"}` } } }).catch(() => 0);
        log(`verify ${code}: cityConfig gone, orgUnits gone, ${code === "AD" ? `AD staff remaining=${staff}` : "n/a"}`);
      }
      await db.$disconnect();
    })
    .catch((e) => { console.error(`[purge] FAILED: ${e.message}`); process.exit(1); });
}
