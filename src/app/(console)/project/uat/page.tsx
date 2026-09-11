"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { UatPanel } from "@/components/platform/panels-p6";

export default function Page() {
  return (
    <ModuleFrame
      route="/project/uat"
      render={({ lang, refresh }) => (
        <>
          <PageHead title="P6 · UAT & Legal Validation"
        subtitle="Role-based acceptance battery and the legal validation session." />
          <UatPanel lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
