"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { NationalManagementPage } from "@/components/platform/panels-national";

// /platform/management — NATIONAL MANAGEMENT, the System Super User's own
// working surface (owner directive). Fleet statistics, live management duties,
// the national regulation register (added regulations/modifications are
// reflected to EVERY city automatically) and fleet-wide model-contract
// propagation. Registry, Operations and Project tools are intentionally NOT
// part of the super user's console — they stay with the city tiers; this page
// is what the /admin super-user portal signs in to.
export default function Page() {
  return (
    <ModuleFrame
      route="/platform/management"
      render={() => (
        <>
          <PageHead
            title="National Management"
            subtitle="The platform-wide command center of the System Super User — national statistics, management duties, the national regulation register (reflected to all cities) and fleet-wide model contract changes."
          />
          <NationalManagementPage />
        </>
      )}
    />
  );
}
