"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { RegistrationPanel } from "@/components/platform/panels-s2s3";

export default function Page() {
  return (
    <ModuleFrame
      route="/registration"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Registration & Certification (M4)"
        subtitle="Proc. Arts. 4, 6, 9, 12, 13; Dir. Arts. 6-10 — nine-point checklist, certify, stamp, register in the book." />
          <RegistrationPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
