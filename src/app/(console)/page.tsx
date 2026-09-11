"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { DashboardPage } from "@/components/platform/panels-dashboard";

export default function Page() {
  return (
    <ModuleFrame
      route="/"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="" />
          <DashboardPage boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
