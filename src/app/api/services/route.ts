// ============================================================================
// /api/services — Tenant-scoped service catalog (SaaS).
// Each city (tenant) owns its service catalog; nothing is hardcoded. A
// service defines: name (trilingual), code, category, description, required
// documents, processing time, owning department/office, workflow key, SLA,
// fee and notification rules, active/inactive and public/private flags.
//
//   GET    public catalog  → ?city= | ?slug= | host (middleware x-tenant-slug);
//                            only isActive && isPublic rows, gated by the
//                            tenant's CITIZEN_SERVICES module flag.
//   GET    ?manage=1       → city/platform admins with x-staff-code get the
//                            FULL list of their own city (city admin: pinned
//                            to their city; system admin: any ?city=).
//   POST   create          → capability service:manage (CITY_ADMIN own city
//                            only / SYSTEM_ADMIN any city via ?city=).
//   PATCH  update          → same capability + city-scope wall.
//   DELETE remove          → same capability + city-scope wall.
// ============================================================================
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { cityContext, requireCapability, SecurityError } from "@/lib/security/authz";
import { requireModuleForRequest, requireModule } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const CATEGORIES = ["REGISTRATION", "COMPLAINTS", "PAYMENTS", "PERMITS", "LICENSING", "OTHER"];

function str(v: unknown, max = 400): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function asInt(v: unknown, fallback: number | null): number | null {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function asFloat(v: unknown, fallback: number | null): number | null {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function documentsJson(v: unknown): string | null {
  if (v === undefined) return undefined as unknown as string | null;
  if (v === null || v === "") return null;
  const list = Array.isArray(v)
    ? v.map((d) => String(d).trim()).filter(Boolean)
    : String(v).split("\n").map((d) => d.trim()).filter(Boolean);
  return list.length ? JSON.stringify(list.slice(0, 30)) : null;
}

// GET — public catalog or admin (manage) listing.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const manage = url.searchParams.get("manage") === "1";
    const slug = url.searchParams.get("slug");
    const city = url.searchParams.get("city");

    if (!manage) {
      // Public catalog — respects the tenant's CITIZEN_SERVICES module flag.
      await requireModuleForRequest(req, "CITIZEN_SERVICES");
      let cityCode: string | null = null;
      if (city) cityCode = city.toUpperCase();
      else if (slug) {
        const t = await db.cityConfig.findUnique({ where: { slug } });
        cityCode = t?.cityCode ?? null;
      } else {
        const slugHeader = req.headers.get("x-tenant-slug");
        if (slugHeader) {
          const t = await db.cityConfig.findUnique({ where: { slug: slugHeader.toLowerCase() } });
          cityCode = t?.cityCode ?? null;
        }
      }
      if (!cityCode) {
        const t = await db.cityConfig.findFirst({ where: { isActive: true }, orderBy: { cityCode: "asc" } });
        cityCode = t?.cityCode ?? null;
      }
      const rows = await db.serviceDefinition.findMany({
        where: { cityCode: cityCode ?? "__none__", isActive: true, isPublic: true },
        include: { department: { select: { code: true, nameEn: true } } },
        orderBy: [{ category: "asc" }, { nameEn: "asc" }],
      });
      return ok({ cityCode, services: rows });
    }

    // Manage listing — the city admin sees ONLY their city; the system admin
    // may name any city (?city=) — cross-city references stay blocked by the
    // scope wall for city-bound actors.
    const actor = await requireCapability(req, "service:manage");
    const ctx = await cityContext(actor, { city: actor.national ? city : actor.cityCode });
    const rows = await db.serviceDefinition.findMany({
      where: { cityCode: ctx.cityCode },
      include: { department: { select: { code: true, nameEn: true } } },
      orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    });
    return ok({ cityCode: ctx.cityCode, services: rows });
  } catch (err) {
    return fail(err);
  }
}

// POST — create a service in the acting tenant's catalog.
export async function POST(req: Request) {
  try {
    const actor = await requireCapability(req, "service:manage");
    const input = await body<Record<string, unknown>>(req);
    const ctx = await cityContext(actor, { city: actor.national ? String(input.city ?? "") || null : actor.cityCode });
    await requireModule(ctx.cityCode, "CITIZEN_SERVICES");

    const code = str(input.code, 60)?.toUpperCase().replace(/[^A-Z0-9-]/g, "-");
    const nameEn = str(input.nameEn, 160);
    if (!code) throw new Error("Service code is required (letters, digits, dashes).");
    if (!nameEn) throw new Error("Service name (English) is required.");
    const category = CATEGORIES.includes(String(input.category)) ? String(input.category) : "OTHER";

    let departmentOrgUnitId: string | null = str(input.departmentOrgUnitId, 60);
    if (departmentOrgUnitId && !ctx.unitIds.includes(departmentOrgUnitId)) {
      throw new SecurityError(
        `Cross-city access denied: the selected department is outside ${ctx.cityCode}.`,
        "AUTH_CITY_SCOPE",
      );
    }

    const dup = await db.serviceDefinition.findUnique({ where: { cityCode_code: { cityCode: ctx.cityCode, code } } });
    if (dup) throw new Error(`Service ${code} already exists in ${ctx.cityCode}.`);

    const created = await db.serviceDefinition.create({
      data: {
        cityCode: ctx.cityCode, code, nameEn,
        nameAm: str(input.nameAm, 160), nameOm: str(input.nameOm, 160),
        category,
        description: str(input.description, 2000),
        requiredDocumentsJson: documentsJson(input.requiredDocuments),
        processingTimeDays: asInt(input.processingTimeDays, 5) ?? 5,
        departmentOrgUnitId,
        workflowCode: str(input.workflowCode, 60),
        slaDays: asInt(input.slaDays, null),
        feeAmount: asFloat(input.feeAmount, null),
        feeCurrency: str(input.feeCurrency, 8)?.toUpperCase() ?? "ETB",
        notificationRulesJson: typeof input.notificationRules === "string" ? input.notificationRules : null,
        isActive: input.isActive === undefined ? true : Boolean(input.isActive),
        isPublic: input.isPublic === undefined ? true : Boolean(input.isPublic),
      },
    });
    return ok({ service: created, message: `Service ${created.code} created for ${ctx.cityCode}.` });
  } catch (err) {
    return fail(err);
  }
}

// PATCH — update a service (id in body; scope wall checks the owning city).
export async function PATCH(req: Request) {
  try {
    const actor = await requireCapability(req, "service:manage");
    const input = await body<Record<string, unknown>>(req);
    const id = str(input.id, 60);
    if (!id) throw new Error("Service id is required.");
    const existing = await db.serviceDefinition.findUnique({ where: { id } });
    if (!existing) throw new Error("Unknown service.");
    const ctx = await cityContext(actor, { city: existing.cityCode });
    if (existing.cityCode !== ctx.cityCode) {
      throw new SecurityError("Cross-city access denied: this service belongs to another city.", "AUTH_CITY_SCOPE");
    }
    await requireModule(ctx.cityCode, "CITIZEN_SERVICES");

    const data: Record<string, unknown> = {};
    if (input.nameEn !== undefined) data.nameEn = str(input.nameEn, 160) ?? existing.nameEn;
    if (input.nameAm !== undefined) data.nameAm = str(input.nameAm, 160);
    if (input.nameOm !== undefined) data.nameOm = str(input.nameOm, 160);
    if (input.category !== undefined && CATEGORIES.includes(String(input.category))) data.category = String(input.category);
    if (input.description !== undefined) data.description = str(input.description, 2000);
    if (input.requiredDocuments !== undefined) data.requiredDocumentsJson = documentsJson(input.requiredDocuments);
    if (input.processingTimeDays !== undefined) data.processingTimeDays = asInt(input.processingTimeDays, existing.processingTimeDays);
    if (input.workflowCode !== undefined) data.workflowCode = str(input.workflowCode, 60);
    if (input.slaDays !== undefined) data.slaDays = asInt(input.slaDays, null);
    if (input.feeAmount !== undefined) data.feeAmount = asFloat(input.feeAmount, null);
    if (input.feeCurrency !== undefined) data.feeCurrency = str(input.feeCurrency, 8)?.toUpperCase() ?? "ETB";
    if (input.notificationRules !== undefined) data.notificationRulesJson = typeof input.notificationRules === "string" ? input.notificationRules : null;
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
    if (input.isPublic !== undefined) data.isPublic = Boolean(input.isPublic);
    if (input.departmentOrgUnitId !== undefined) {
      const dept = str(input.departmentOrgUnitId, 60);
      if (dept && !ctx.unitIds.includes(dept)) {
        throw new SecurityError(
          `Cross-city access denied: the selected department is outside ${ctx.cityCode}.`,
          "AUTH_CITY_SCOPE",
        );
      }
      data.departmentOrgUnitId = dept;
    }

    const updated = await db.serviceDefinition.update({ where: { id }, data });
    return ok({ service: updated, message: `Service ${updated.code} updated.` });
  } catch (err) {
    return fail(err);
  }
}

// DELETE — remove a service from the acting tenant's catalog.
export async function DELETE(req: Request) {
  try {
    const actor = await requireCapability(req, "service:manage");
    const url = new URL(req.url);
    const id = str(url.searchParams.get("id"), 60);
    if (!id) throw new Error("Service id is required (?id=).");
    const existing = await db.serviceDefinition.findUnique({ where: { id } });
    if (!existing) throw new Error("Unknown service.");
    const ctx = await cityContext(actor, { city: existing.cityCode });
    if (existing.cityCode !== ctx.cityCode) {
      throw new SecurityError("Cross-city access denied: this service belongs to another city.", "AUTH_CITY_SCOPE");
    }
    await requireModule(ctx.cityCode, "CITIZEN_SERVICES");
    await db.serviceDefinition.delete({ where: { id } });
    return ok({ deleted: id, message: `Service ${existing.code} removed from ${ctx.cityCode}.` });
  } catch (err) {
    return fail(err);
  }
}
