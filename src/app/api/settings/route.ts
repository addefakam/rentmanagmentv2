// /api/settings — per-city configuration (Dir. Art. 14 per-city rule sets).
// PATCH: city identity (trilingual names, currency, work week) and statutory
// parameters (min lease years, prepayment cap, canonical language, complaint
// decision days, appeal days). Capability: city:manage.
// CITY SCOPE: city-bound officers (bureau head, city admin) can only update
// their OWN city — the scope wall rejects any other cityCode with 403.
import { ok, fail, body } from "@/lib/api";
import { withGuard, cityContext } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const AS_INT = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export async function PATCH(req: Request) {
  try {
    return await withGuard(
      req, "city:manage",
      { action: "CITY_CONFIG_UPDATE", entity: "CityConfig", ref: (d: { cityCode: string }) => d.cityCode },
      async (actor) => {
        const input = await body<Record<string, unknown>>(req);
        const requested = String(input.cityCode ?? "");
        const ctx = await cityContext(actor, { city: requested });
        const config = await db.cityConfig.findUnique({ where: { cityCode: ctx.cityCode } });
        if (!config) throw new Error(`Unknown city: ${ctx.cityCode}`);
        const updated = await db.cityConfig.update({
          where: { cityCode: ctx.cityCode },
          data: {
            nameEn: input.nameEn != null ? String(input.nameEn).slice(0, 160) : config.nameEn,
            nameAm: input.nameAm != null ? String(input.nameAm).slice(0, 160) : config.nameAm,
            nameOm: input.nameOm != null ? String(input.nameOm).slice(0, 160) : config.nameOm,
            currency: input.currency != null ? String(input.currency).slice(0, 8).toUpperCase() : config.currency,
            workWeek: input.workWeek != null ? String(input.workWeek).slice(0, 32) : config.workWeek,
            canonicalLang: ["am", "en", "om"].includes(String(input.canonicalLang)) ? String(input.canonicalLang) : config.canonicalLang,
            minLeaseYears: AS_INT(input.minLeaseYears ?? config.minLeaseYears, config.minLeaseYears),
            maxPrepayMonths: AS_INT(input.maxPrepayMonths ?? config.maxPrepayMonths, config.maxPrepayMonths),
            complaintDecisionDays: AS_INT(input.complaintDecisionDays ?? config.complaintDecisionDays, config.complaintDecisionDays),
            appealDays: AS_INT(input.appealDays ?? config.appealDays, config.appealDays),
          },
        });
        return updated;
      },
    );
  } catch (err) { return fail(err); }
}
