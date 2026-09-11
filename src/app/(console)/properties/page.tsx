"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { AssetsPanel } from "@/components/platform/panels-s2s3";

export default function Page() {
  return (
    <ModuleFrame
      route="/properties"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Properties & Model Contract (M2, M3)"
        subtitle="Proc. Arts. 2, 5, 10 — property registry with exemption clocks; the city model contract studio." />
          <AssetsPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
