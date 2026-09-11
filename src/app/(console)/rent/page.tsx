"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { RentPanel } from "@/components/platform/panels-s4s5";

export default function Page() {
  return (
    <ModuleFrame
      route="/rent"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Rent Adjustment & Payments (M5, M6)"
        subtitle="Proc. Arts. 8-13; Dir. Arts. 11, 16 — June calendar engine and the electronic payment ledger." />
          <RentPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
