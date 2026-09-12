"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { CitiesAdmin } from "@/components/platform/panels-cities";

// /platform — the dedicated Platform Administration URL (the "main module at
// the top level"). SYSTEM_ADMIN only (see PAGE_ACCESS). This is the single
// surface with full fleet super-powers: onboard cities, tenant configuration
// (white-label, modules, domains, contact), lifecycle suspend/reactivate.
// /cities remains as the read-only City Directory for lower national tiers.
export default function Page() {
  return (
    <ModuleFrame
      route="/platform"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead
            title="Platform Administration"
            subtitle="The platform control plane — onboard new cities, configure tenants (branding, modules, domains, contact) and manage the fleet lifecycle. Reserved for the System Admin."
          />
          <CitiesAdmin />
        </>
      )}
    />
  );
}
