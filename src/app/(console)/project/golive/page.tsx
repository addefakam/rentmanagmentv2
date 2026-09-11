"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { GoLivePanel } from "@/components/platform/panels-p8";

export default function Page() {
  return (
    <ModuleFrame
      route="/project/golive"
      render={({ lang, refresh }) => (
        <>
          <PageHead title="P8 · Go-Live & Operations"
        subtitle="Go-live waves, cutover, hypercare and the closure record." />
          <GoLivePanel lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
