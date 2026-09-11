// /api/payments — M6 electronic payment ledger (Proc. Arts. 12-14).
// CITY SCOPE: payments hang off registration files; a city-bound officer can
// only record and list payments of files inside their own city's woredas.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { recordPayment } from "@/lib/domain/service";
import { withGuard, cityContext, assertFileInScope } from "@/lib/security/authz";
import { withReadGuard } from "@/lib/security/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Phase 8 hardening (DEF-06-01): financial ledger read.
    await withReadGuard(req, { capability: "read:payments", sensitive: true, entity: "Payment ledger" });
    const scope = await readScope(req);
    const payments = await db.payment.findMany({
      include: { file: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    const filtered = scope
      ? payments.filter((p) => p.fileId && p.file && scope.woredaIds.includes(p.file.woredaId))
      : payments;
    return ok(filtered);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    return await withGuard(req, "payment:record",
      { action: "PAYMENT_RECORD", entity: "Payment", ref: (d: { receiptNumber: string }) => d.receiptNumber,
        summary: (d: { providerRef: string | null }) => d.providerRef ? `Settled ${d.providerRef}` : "Cash channel (auto referral)" },
      async (actor) => {
        const ctx = await cityContext(actor, {
          city: input.cityCode ?? req.headers.get("x-city-code"),
          unitId: String(input.recordedByOrgUnitId ?? ""), unitLabel: "recording office",
        });
        await assertFileInScope(ctx, String(input.fileId ?? ""));
        return recordPayment({
          fileId: String(input.fileId), amount: Number(input.amount),
          kind: String(input.kind), monthsCovered: input.monthsCovered ? Number(input.monthsCovered) : undefined,
          method: String(input.method), isCash: Boolean(input.isCash),
          paidAt: new Date(String(input.paidAt ?? new Date().toISOString())),
          recordedByOrgUnitId: String(input.recordedByOrgUnitId),
        });
      });
  } catch (err) { return fail(err); }
}
