"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { DisputesPanel } from "@/components/platform/panels-s4s5";

export default function Page() {
  return (
    <ModuleFrame
      route="/complaints"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Complaints & Deadline Engine (M8, M12)"
        subtitle="Proc. Arts. 22-26; Dir. Arts. 17-19 — eight-grounds intake, decisions, appeals, deadline clocks." />
          <DisputesPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
