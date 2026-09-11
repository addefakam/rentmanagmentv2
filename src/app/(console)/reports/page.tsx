"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { DataPanel } from "@/components/platform/panels-s6s7";

export default function Page() {
  return (
    <ModuleFrame
      route="/reports"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="Data & Reporting (M10, M11)"
        subtitle="Dir. Art. 13; Proc. Art. 18 — replication, backups, aggregation snapshots, public feed." />
          <DataPanel boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
