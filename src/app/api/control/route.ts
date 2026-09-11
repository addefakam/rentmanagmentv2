// /api/control — M7 compliance monitoring: teams and visits (Proc. Art. 20;
// Dir. Art. 20 team identification and vacancy monitoring).
// CITY SCOPE: teams are stationed at city sub-cities and visit city
// properties; cross-city team/property references are denied 403.
import { db } from "@/lib/db";
import { ok, fail, body } from "@/lib/api";
import { createControlTeam, recordControlVisit } from "@/lib/domain/service";
import { withGuard, cityContext, readScope, assertPropertyInScope, assertTeamInScope } from "@/lib/security/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const scope = await readScope(req);
    const [teams, visits] = await Promise.all([
      db.controlTeam.findMany({ include: { subCity: true } }),
      db.controlVisit.findMany({ include: { team: true, property: true }, orderBy: { visitedAt: "desc" }, take: 200 }),
    ]);
    return ok({
      teams: scope ? teams.filter((t) => scope.subCityIds.includes(t.subCityId)) : teams,
      visits: scope ? visits.filter((v) => v.property && scope.woredaIds.includes(v.property.woredaId)) : visits,
    });
  } catch (err) { return fail(err); }
}

export async function POST(req: Request) {
  try {
    const input = await body<Record<string, unknown>>(req);
    if (input.kind === "team") {
      return await withGuard(req, "control:manage",
        { action: "CONTROL_TEAM_CREATE", entity: "ControlTeam", ref: (d: { teamCode: string }) => d.teamCode },
        async (actor) => {
          const ctx = await cityContext(actor, {
            city: input.cityCode ?? req.headers.get("x-city-code"),
            unitId: String(input.subCityId ?? ""), unitLabel: "sub-city",
          });
          return createControlTeam({
            teamCode: String(input.teamCode), subCityId: String(input.subCityId),
            members: String(input.members),
          });
        });
    }
    if (input.kind === "visit") {
      return await withGuard(req, "control:manage",
        { action: "CONTROL_VISIT", entity: "ControlVisit", ref: (d: { id: string }) => d.id },
        async (actor) => {
          const ctx = await cityContext(actor, { city: input.cityCode ?? req.headers.get("x-city-code") });
          await assertTeamInScope(ctx, String(input.teamId ?? ""));
          await assertPropertyInScope(ctx, String(input.propertyId ?? ""));
          return recordControlVisit({
            teamId: String(input.teamId), propertyId: String(input.propertyId),
            origin: String(input.origin), visitedAt: new Date(String(input.visitedAt ?? new Date().toISOString())),
            identificationShown: Boolean(input.identificationShown),
            findings: input.findings ? String(input.findings) : undefined,
            violations: input.violations ? String(input.violations) : undefined,
            vacancyMonths: input.vacancyMonths != null && input.vacancyMonths !== "" ? Number(input.vacancyMonths) : undefined,
          });
        });
    }
    return fail(new Error("Unknown control payload kind"));
  } catch (err) { return fail(err); }
}
