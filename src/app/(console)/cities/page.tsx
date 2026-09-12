"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { CitiesAdmin } from "@/components/platform/panels-cities";

// /cities — the read-only City Directory. Lower national tiers (e.g. the
// ministry analyst) see every city's status and stats here without any
// management controls. The single management surface is /platform (reserved
// for the System Admin); the server independently enforces that on every API
// mutation (city:write = SYSTEM_ADMIN only).
export default function Page() {
  return (
    <ModuleFrame
      route="/cities"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead
            title="City Directory"
            subtitle="Read-only directory of every city on the platform — status, structure and operations at a glance. Onboarding, tenant configuration and lifecycle control are reserved for the Platform Administrator."
          />
          <CitiesAdmin readOnly />
        </>
      )}
    />
  );
}
