// ============================================================================
// city.ts — Multi-city helpers. A "city" is one BUREAU-tier OrgUnit plus its
// CityConfig row; every operational record hangs under the bureau's subtree
// (woreda -> sub-city -> bureau). These helpers resolve that subtree so the
// boot payload and reports can be scoped per city (Dir. Arts. 2, 6, 13).
// ============================================================================

export type OrgLite = {
  id: string; code: string; tier: string;
  nameEn: string; nameAm: string; nameOm: string;
  parentId: string | null;
};

export type CityScope = {
  cityCode: string;
  config: {
    id: string; cityCode: string; nameEn: string; nameAm: string; nameOm: string;
    currency: string; workWeek: string; minLeaseYears: number; maxPrepayMonths: number;
    canonicalLang: string; complaintDecisionDays: number; appealDays: number;
    bureauId?: string | null;
  } | null;
  bureau: OrgLite | null;
  bureauId: string | null;
  subCityIds: string[];
  woredaIds: string[];
  unitIds: string[]; // bureau + sub-cities + woredas (everything inside the city)
};

/** Walk up the org tree from any unit and return the ancestry ids (inclusive). */
export function ancestorIds(units: OrgLite[], id: string | null | undefined): string[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const chain: string[] = [];
  let cur = id ? byId.get(id) : undefined;
  let guard = 0;
  while (cur && guard++ < 12) {
    chain.push(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/** Find the BUREAU unit at the root of the given unit's ancestry. */
export function bureauOf(units: OrgLite[], id: string | null | undefined): OrgLite | null {
  const byId = new Map(units.map((u) => [u.id, u]));
  let cur = id ? byId.get(id) : undefined;
  let guard = 0;
  while (cur && guard++ < 12) {
    if (cur.tier === "BUREAU") return cur;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return null;
}

/** Collect every descendant unit id of `rootId` (inclusive of the root). */
export function descendantIds(units: OrgLite[], rootId: string): string[] {
  const byParent = new Map<string | null, OrgLite[]>();
  for (const u of units) {
    const list = byParent.get(u.parentId) ?? [];
    list.push(u);
    byParent.set(u.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    for (const child of byParent.get(cur) ?? []) stack.push(child.id);
  }
  return out;
}

/** Build the full scope for a cityCode from the unit list + config rows. */
export function cityScope(
  units: OrgLite[],
  configs: Array<Record<string, unknown> & { cityCode: string; bureauId?: string | null }>,
  cityCode: string | null | undefined,
): CityScope {
  const config = (configs.find((c) => c.cityCode === cityCode) ?? null) as CityScope["config"];
  const bureauId =
    config?.bureauId ??
    units.find((u) => u.tier === "BUREAU" && u.code.startsWith(`${config?.cityCode ?? ""}`))?.id ??
    units.find((u) => u.tier === "BUREAU")?.id ??
    null;
  const bureau = units.find((u) => u.id === bureauId) ?? null;
  const unitIds = bureauId ? descendantIds(units, bureauId) : [];
  const tierOf = new Map(units.map((u) => [u.id, u.tier]));
  return {
    cityCode: config?.cityCode ?? cityCode ?? "AA",
    config,
    bureau,
    bureauId,
    subCityIds: unitIds.filter((id) => tierOf.get(id) === "SUB_CITY"),
    woredaIds: unitIds.filter((id) => tierOf.get(id) === "WOREDA"),
    unitIds,
  };
}

/** City code for an acting officer: nearest BUREAU's city config, if any. */
export function cityCodeForOrgUnit(
  units: OrgLite[],
  configs: Array<{ cityCode: string; bureauId?: string | null }>,
  orgUnitId: string,
): string | null {
  const bureau = bureauOf(units, orgUnitId);
  if (!bureau) return null;
  return configs.find((c) => c.bureauId === bureau.id)?.cityCode ?? null;
}

/** Owner directive — sub-city delegation. The sub-city rent-control officer
 *  (SUBCITY_MONITOR) is responsible for the staff and woredas of HIS area:
 *  when he signs in, everything he sees and touches is confined to his own
 *  sub-city subtree. Returns the org-unit id whose subtree this officer is
 *  confined to, or null when the role keeps the full city scope (bureau- or
 *  woreda-attached roles, national officers). */
export function subtreeRootForRole(
  units: OrgLite[],
  orgUnitId: string,
  roleCode: string,
): string | null {
  if (roleCode !== "SUBCITY_MONITOR") return null;
  const u = units.find((x) => x.id === orgUnitId);
  if (!u || u.tier !== "SUB_CITY") return null;
  return u.id;
}
