// /api/registration-files — M4 registration workflow intake (Proc. Arts. 4, 7).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createRegistrationFile } from "@/lib/domain/service";
import { withGuard } from "@/lib/security/authz";
import { withReadGuard } from "@/lib/security/session";

export const dynamic = "force-dynamic";

type WitnessInput = { fullName: string; idTypeId: string; idNumber: string };

export async function GET(req: Request) {
  try {
    // Phase 8 hardening (DEF-06-01): files carry identity + financial data.
    await withReadGuard(req, { capability: "read:registration", sensitive: true, entity: "Registration files" });
    const files = await db.registrationFile.findMany({
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
      () => createRegistrationFile({
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
      }));
  } catch (err) { return fail(err); }
}
