"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { PartiesPanel } from "@/components/platform/panels-s1";

export default function Page() {
  return (
    <ModuleFrame
      route="/parties"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Parties (M1)"
        subtitle="Proc. Arts. 4, 7; Dir. Art. 7 — identification original and copy; proxy with two witnesses." />
          <PartiesPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
