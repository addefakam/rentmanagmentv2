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
import { withGuard, requireCapability } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const AS_INT = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const OPEN_COMPLAINT_STATUSES = ["INTAKE", "COMPLETENESS_VERIFIED", "UNDER_INVESTIGATION"];

// GET — the fleet table for /cities. Per-city rows carry usage + operations
// stats so the system admin sees data at REGIONAL level (all-city totals) and
// can drill into CITY level through the switcher or each city's pages.
export async function GET(req: Request) {
  try {
    await requireCapability(req, "city:admin");
    const [units, configs, users, properties, files, complaints, payments] = await Promise.all([
      db.orgUnit.findMany({ orderBy: { code: "asc" } }),
      db.cityConfig.findMany({ orderBy: { cityCode: "asc" } }),
      db.systemUser.findMany({ where: { isActive: true }, select: { orgUnitId: true } }),
      db.property.findMany({ select: { woredaId: true } }),
      db.registrationFile.findMany({ select: { woredaId: true } }),
      db.complaint.findMany({ select: { receivedAtOrgUnitId: true, status: true } }),
      db.payment.findMany({ select: { amount: true, file: { select: { woredaId: true } } } }),
    ]);
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
          },
        });

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
          cityCode: config.cityCode, bureauCode, contractVersion, team,
          cityAdmin: { staffCode: admin.staffCode, fullName: admin.fullName },
          orgUnits: [bureau.code, subCity.code, woreda.code],
          message: `City ${nameEn} (${cityCode}) is live — city administrator ${admin.fullName} (${admin.staffCode}) can sign in and manage it immediately.`,
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
    return await withGuard(
      req, "city:write",
      { action: "CITY_UPDATE", entity: "CityConfig", ref: (d: { cityCode: string }) => d.cityCode },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const cityCode = String(input.cityCode ?? "");
        const config = await db.cityConfig.findUnique({ where: { cityCode } });
        if (!config) throw new Error(`Unknown city: ${cityCode}`);

        // ---- Mode 1: activate / deactivate --------------------------------
        if ("isActive" in input) {
          const isActive = Boolean(input.isActive);
          if (config.isActive === isActive) {
            throw new Error(`City ${cityCode} is already ${isActive ? "active" : "deactivated"}.`);
          }
          if (!isActive) {
            const activeCount = await db.cityConfig.count({ where: { isActive: true } });
            if (activeCount <= 1) {
              throw new Error("At least one active city must remain. Activate another city first.");
            }
          }
          const updated = await db.cityConfig.update({ where: { cityCode }, data: { isActive } });
          return {
            cityCode: updated.cityCode, isActive: updated.isActive,
            message: isActive
              ? `City ${updated.nameEn} reactivated — officers can sign in again.`
              : `City ${updated.nameEn} deactivated — its officers can no longer sign in; all data is preserved.`,
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
        if (Object.keys(data).length === 0) {
          throw new Error("Nothing to update — send the fields to edit (names, language, statutory days).");
        }
        const updated = await db.cityConfig.update({ where: { cityCode }, data });
        return {
          cityCode: updated.cityCode, nameEn: updated.nameEn,
          canonicalLang: updated.canonicalLang,
          complaintDecisionDays: updated.complaintDecisionDays, appealDays: updated.appealDays,
          message: `City ${updated.nameEn} (${cityCode}) updated — changes apply to its configuration immediately; operational data is untouched.`,
        };
      },
    );
  } catch (err) {
    return fail(err);
  }
}
