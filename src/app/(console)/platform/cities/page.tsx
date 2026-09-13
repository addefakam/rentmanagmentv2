"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { CitiesAdmin } from "@/components/platform/panels-cities";

// /platform/cities — CITY MANAGEMENT, the dedicated URL of the one supreme
// administrator. Owner directive: exactly ONE admin (STF-0008, SYSTEM_ADMIN)
// manages cities with power over every other user; the ministry analyst and
// city-bound officers have no city-management access. The legacy /cities and
// /platform URLs redirect here so old bookmarks keep working. The server
// enforces the same rule independently on every API call (city:write and
// city:admin = SYSTEM_ADMIN only) — the UI never grants rights.
export default function Page() {
  return (
    <ModuleFrame
      route="/platform/cities"
      render={() => (
        <>
          <PageHead
            title="City Management"
            subtitle="The single administration surface of the platform — onboard new cities, configure tenants (branding, modules, domains, contact) and manage the fleet lifecycle. Reserved for the System Admin."
          />
          <CitiesAdmin />
        </>
      )}
    />
  );
}
