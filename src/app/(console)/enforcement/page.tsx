"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { EnforcementPanel } from "@/components/platform/panels-s6s7";

export default function Page() {
  return (
    <ModuleFrame
      route="/enforcement"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Control & Penalties (M7, M9)"
        subtitle="Proc. Arts. 20, 29-32; Dir. Arts. 20, 22 — control teams, vacancy monitoring, penalty ladder." />
          <EnforcementPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
