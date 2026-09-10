// /api/control — M7 compliance monitoring: teams and visits (Proc. Art. 20;
// Dir. Art. 20 team identification and vacancy monitoring).
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createControlTeam, recordControlVisit } from "@/lib/domain/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [teams, visits] = await Promise.all([
      db.controlTeam.findMany({ include: { subCity: true } }),
      db.controlVisit.findMany({ include: { team: true, property: true }, orderBy: { visitedAt: "desc" }, take: 200 }),
    ]);
    return ok({ teams, visits });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    if (input.kind === "team") {
      return ok(await createControlTeam({
        teamCode: String(input.teamCode), subCityId: String(input.subCityId),
        members: String(input.members),
      }));
    }
    if (input.kind === "visit") {
      return ok(await recordControlVisit({
        teamId: String(input.teamId), propertyId: String(input.propertyId),
        origin: String(input.origin), visitedAt: new Date(String(input.visitedAt ?? new Date().toISOString())),
        identificationShown: Boolean(input.identificationShown),
        findings: input.findings ? String(input.findings) : undefined,
        violations: input.violations ? String(input.violations) : undefined,
        vacancyMonths: input.vacancyMonths != null && input.vacancyMonths !== "" ? Number(input.vacancyMonths) : undefined,
      }));
    }
    return fail(new Error("Unknown control payload kind"));
  } catch (err) { return fail(err); }
}
