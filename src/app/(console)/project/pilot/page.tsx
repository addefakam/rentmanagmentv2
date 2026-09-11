"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { PilotPanel } from "@/components/platform/panels-p7";

export default function Page() {
  return (
    <ModuleFrame
      route="/project/pilot"
      render={({ lang, refresh }) => (
        <>
          <PageHead title="P7 · Migration, Training & Pilot"
        subtitle="Legacy book migration, reconciliation, training and pilot day logs." />
          <PilotPanel lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
