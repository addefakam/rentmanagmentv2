// /api/payments — M6 electronic payment ledger (Proc. Arts. 12-14).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { recordPayment } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await db.payment.findMany({
      include: { file: true }, orderBy: { createdAt: "desc" }, take: 200,
    });
    return ok(payments);
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    const payment = await recordPayment({
      fileId: String(input.fileId), amount: Number(input.amount),
      kind: String(input.kind), monthsCovered: input.monthsCovered ? Number(input.monthsCovered) : undefined,
      method: String(input.method), isCash: Boolean(input.isCash),
      paidAt: new Date(String(input.paidAt ?? new Date().toISOString())),
      recordedByOrgUnitId: String(input.recordedByOrgUnitId),
    });
    return ok(payment);
  } catch (err) { return fail(err); }
}
