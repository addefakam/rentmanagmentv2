// /api/penalty-ladder — M9 configurable ladder (Dir. Art. 22). The Directive
// defines the national offense catalogue; this surface lets authorised city
// officers keep the VALUES current (fines, caps, band ranges) without code.
//   POST  : add a new offense row (unique code)
//   PATCH : update values / labels / activation
//   DELETE: remove a row that no penalty case references
// Capability: ladder:manage.
import { ok, fail, body } from "@/lib/api";
import { withGuard } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await withGuard(
      req, "ladder:manage",
      { action: "PENALTY_PARAM_CREATE", entity: "PenaltyParameter", ref: (d: { code: string }) => d.code },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const code = String(input.code ?? "").trim().toUpperCase();
        if (!/^[A-Z0-9-]{3,48}$/.test(code)) throw new Error("Offense code must be 3-48 chars A-Z, 0-9, dashes.");
        return db.penaltyParameter.create({
          data: {
            code,
            category: ["OFFENSE_FINE", "SURCHARGE_BAND", "REFERRAL_RULE", "GLOBAL_CAP"].includes(String(input.category))
              ? String(input.category) : "OFFENSE_FINE",
            offenseEn: String(input.offenseEn ?? code),
            offenseAm: String(input.offenseAm ?? code),
            offenseOm: String(input.offenseOm ?? code),
            valueType: ["MULTIPLE_OF_MONTHLY_RENT", "PERCENT", "PERCENT_PER_CASH_PAYMENT"].includes(String(input.valueType))
              ? String(input.valueType) : "MULTIPLE_OF_MONTHLY_RENT",
            valueMin: input.valueMin != null && input.valueMin !== "" ? Number(input.valueMin) : null,
            valueMax: input.valueMax != null && input.valueMax !== "" ? Number(input.valueMax) : null,
            rangeLabelEn: input.rangeLabelEn != null ? String(input.rangeLabelEn) : null,
            rangeLabelAm: input.rangeLabelAm != null ? String(input.rangeLabelAm) : null,
            basisRef: String(input.basisRef ?? "Dir. Art. 22"),
            confirmationStatus: "PENDING_OFFICIAL_TEXT",
          },
        });
      },
    );
  } catch (err) { return fail(err); }
}

export async function PATCH(req: Request) {
  try {
    return await withGuard(
      req, "ladder:manage",
      { action: "PENALTY_PARAM_UPDATE", entity: "PenaltyParameter", ref: (d: { code: string }) => d.code },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const id = String(input.id ?? "");
        const row = await db.penaltyParameter.findUnique({ where: { id } });
        if (!row) throw new Error("Unknown penalty parameter.");
        return db.penaltyParameter.update({
          where: { id },
          data: {
            offenseEn: input.offenseEn != null ? String(input.offenseEn) : row.offenseEn,
            offenseAm: input.offenseAm != null ? String(input.offenseAm) : row.offenseAm,
            offenseOm: input.offenseOm != null ? String(input.offenseOm) : row.offenseOm,
            valueType: input.valueType != null ? String(input.valueType) : row.valueType,
            valueMin: input.valueMin != null ? (input.valueMin === "" ? null : Number(input.valueMin)) : row.valueMin,
            valueMax: input.valueMax != null ? (input.valueMax === "" ? null : Number(input.valueMax)) : row.valueMax,
            rangeLabelEn: input.rangeLabelEn != null ? String(input.rangeLabelEn) : row.rangeLabelEn,
            rangeLabelAm: input.rangeLabelAm != null ? String(input.rangeLabelAm) : row.rangeLabelAm,
            basisRef: input.basisRef != null ? String(input.basisRef) : row.basisRef,
            isActive: input.isActive != null ? Boolean(input.isActive) : row.isActive,
          },
        });
      },
    );
  } catch (err) { return fail(err); }
}

export async function DELETE(req: Request) {
  try {
    return await withGuard(
      req, "ladder:manage",
      { action: "PENALTY_PARAM_DELETE", entity: "PenaltyParameter", ref: (d: { code: string }) => d.code },
      async () => {
        const input = await body<Record<string, unknown>>(req);
        const id = String(input.id ?? "");
        const row = await db.penaltyParameter.findUnique({
          where: { id }, include: { _count: { select: { penaltyCases: true } } },
        });
        if (!row) throw new Error("Unknown penalty parameter.");
        if (row._count.penaltyCases > 0) {
          await db.penaltyParameter.update({ where: { id }, data: { isActive: false } });
          return { deactivated: true, code: row.code, note: "Row referenced by penalty cases — deactivated instead of deleted." };
        }
        await db.penaltyParameter.delete({ where: { id } });
        return { deleted: true, code: row.code };
      },
    );
  } catch (err) { return fail(err); }
}
