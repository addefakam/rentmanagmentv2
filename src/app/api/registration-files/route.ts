// /api/registration-files — M4 registration workflow intake (Proc. Arts. 4, 7).
// CITY SCOPE: files are opened at a city woreda under the city's model
// contract; a city-bound officer can only open and list files of their own
// city — the woreda, the property and the model contract are all validated.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createRegistrationFile } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertPropertyInScope, CityScopeError } from "@/lib/security/authz";
import { withReadGuard } from "@/lib/security/session";
import { requireModuleForRequest, requireModule } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type WitnessInput = { fullName: string; idTypeId: string; idNumber: string };

export async function GET(req: Request) {
  try {
    // SaaS module gate — disabled module = API unavailable (not just hidden).
    await requireModuleForRequest(req, "SERVICE_REQUESTS");
    // Phase 8 hardening (DEF-06-01): files carry identity + financial data.
    await withReadGuard(req, { capability: "read:registration", sensitive: true, entity: "Registration files" });
    const scope = await readScope(req);
    const files = await db.registrationFile.findMany({
      where: scope ? { woredaId: { in: scope.woredaIds } } : {},
      include: {
        woreda: true, property: true, landlord: true, tenant: true,
        witnesses: true, checklist: true, annotations: true, bookEntries: true,
      },
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(files);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "registration:file",
      { action: "FILE_OPEN", entity: "RegistrationFile", ref: (d: { fileNumber: string }) => d.fileNumber },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.woredaId ?? ""), unitLabel: "woreda",
        });
        await requireModule(ctx.cityCode, "SERVICE_REQUESTS"); // SaaS module gate (target tenant resolved by the scope wall)
        await assertPropertyInScope(ctx, String(input.propertyId ?? ""));
        // The executed model contract must be the acting city's own.
        const contract = await db.modelContract.findUnique({
          where: { id: String(input.modelContractId ?? "") }, select: { cityCode: true },
        });
        if (contract?.cityCode && contract.cityCode !== ctx.cityCode) {
          throw new CityScopeError(
            `Cross-city access denied: the selected model contract belongs to ${contract.cityCode}, not ${ctx.cityCode}.`,
          );
        }
        return createRegistrationFile({
          woredaId: String(input.woredaId), propertyId: String(input.propertyId),
          landlordId: String(input.landlordId), tenantId: String(input.tenantId),
          agentId: input.agentId ? String(input.agentId) : undefined,
          modelContractId: String(input.modelContractId),
          monthlyRent: Number(input.monthlyRent),
          leaseStart: new Date(String(input.leaseStart)),
          leaseEnd: new Date(String(input.leaseEnd)),
          prepaymentMonths: Number(input.prepaymentMonths ?? 0),
          paymentMethod: String(input.paymentMethod),
          paymentMethodConfirmed: Boolean(input.paymentMethodConfirmed),
          interpreterUsed: Boolean(input.interpreterUsed),
          interpreterName: input.interpreterName ? String(input.interpreterName) : undefined,
          isLegacy: Boolean(input.isLegacy),
          witnesses: Array.isArray(input.witnesses) ? (input.witnesses as WitnessInput[]) : [],
          enteredByOrgUnitId: String(input.woredaId),
        });
      });
  } catch (err) { return fail(err); }
}
