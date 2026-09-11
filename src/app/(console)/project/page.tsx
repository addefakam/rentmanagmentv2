"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { EvidencePanel } from "@/components/platform/panels-evidence";

export default function Page() {
  return (
    <ModuleFrame
      route="/project"
      render={({ lang }) => (
        <>
          <PageHead title="Evidence & Gates"
        subtitle="Phase 3 promotion evidence and gate exit checklists." />
          <EvidencePanel lang={lang} />
        </>
      )}
    />
  );
}
