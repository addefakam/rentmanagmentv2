"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { CitiesAdmin } from "@/components/platform/panels-cities";

export default function Page() {
  return (
    <ModuleFrame
      route="/cities"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead
            title="City Management"
            subtitle="Onboard a new city in one configuration step, or deactivate an existing one — no code changes, no seed scripts."
          />
          <CitiesAdmin />
        </>
      )}
    />
  );
}
