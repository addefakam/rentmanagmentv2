// /api/registration-files/[id] — M4 registrar acts: checklist, certification,
// stamping, registration, annotation (Dir. Arts. 6-10).
import { ok, fail, body } from "@/lib/api";
import {
  checkChecklist, certifyFile, stampFile, registerFile, annotateFile,
} from "@/lib/domain/service";

export const dynamic = "force-dynamic";

type Payload = {
  action: "check" | "certify" | "stamp" | "register" | "annotate";
  items?: { orderNo: number; passed: boolean; note?: string }[];
  registrarName?: string;
  code?: string; text?: string; byOrgUnitId?: string;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = await body<Payload>(req);
    switch (p.action) {
      case "check":
        return ok(await checkChecklist(id, p.items ?? []));
      case "certify":
        return ok(await certifyFile(id, p.registrarName ?? "Woreda Registrar"));
      case "stamp":
        return ok(await stampFile(id));
      case "register":
        return ok(await registerFile(id, p.registrarName ?? "Woreda Registrar"));
      case "annotate":
        return ok(await annotateFile(id, String(p.code), String(p.text), String(p.byOrgUnitId ?? id)));
      default:
        return fail(new Error(`Unknown action: ${p.action}`));
    }
  } catch (err) { return fail(err); }
}
