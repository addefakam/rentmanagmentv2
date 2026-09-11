// /api/registration-files/[id] — M4 registrar acts: checklist, certification,
// stamping, registration, annotation (Dir. Arts. 6-9). Phase 5: the stamping
// desk is a distinct role from the registrar (Dir. Art. 9), enforced here.
// CITY SCOPE: every act resolves the file first and denies officers whose
// city is not the file's city (403 before any legal state changes).
import { fail, body } from "@/lib/api";
import {
  checkChecklist, certifyFile, stampFile, registerFile, annotateFile,
} from "@/lib/domain/service";
import { withGuard, cityContext, CityScopeError } from "@/lib/security/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Payload = {
  action: "check" | "certify" | "stamp" | "register" | "annotate";
  items?: { orderNo: number; passed: boolean; note?: string }[];
  registrarName?: string;
  code?: string; text?: string; byOrgUnitId?: string;
  cityCode?: string;
};

const CAPS: Record<Payload["action"], { cap: string; action: string }> = {
  check: { cap: "registration:check", action: "FILE_CHECKLIST" },
  certify: { cap: "registration:certify", action: "FILE_CERTIFY" },
  stamp: { cap: "registration:stamp", action: "FILE_STAMP" },
  register: { cap: "registration:register", action: "FILE_REGISTER" },
  annotate: { cap: "registration:annotate", action: "FILE_ANNOTATE" },
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const p = await body<Payload>(req);
    const spec = CAPS[p.action];
    if (!spec) return fail(new Error(`Unknown action: ${p.action}`));
    return await withGuard(req, spec.cap,
      { action: spec.action, entity: "RegistrationFile", ref: (d) => (d as { fileNumber?: string }).fileNumber ?? id },
      async (actor) => {
        // City scope wall: the file's woreda must belong to the acting city.
        const file = await db.registrationFile.findUnique({ where: { id }, select: { woredaId: true } });
        if (file) {
          const ctx = await cityContext(actor, {
            city: p.cityCode ?? req.headers.get("x-city-code"),
            unitId: file.woredaId, unitLabel: "file's woreda",
          });
          if (ctx.woredaIds.length > 0 && !ctx.woredaIds.includes(file.woredaId)) {
            throw new CityScopeError("Cross-city access denied: this registration file belongs to another city.");
          }
        }
        switch (p.action) {
          case "check":
            return await checkChecklist(id, p.items ?? []);
          case "certify":
            return await certifyFile(id, p.registrarName ?? "Woreda Registrar");
          case "stamp":
            return await stampFile(id);
          case "register":
            return await registerFile(id, p.registrarName ?? "Woreda Registrar");
          case "annotate":
            return await annotateFile(id, String(p.code), String(p.text), String(p.byOrgUnitId ?? id));
        }
      });
  } catch (err) { return fail(err); }
}
