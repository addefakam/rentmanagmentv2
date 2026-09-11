"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { QualityPanel } from "@/components/platform/panels-p5";

export default function Page() {
  return (
    <ModuleFrame
      route="/project/testing"
      render={({ lang, refresh }) => (
        <>
          <PageHead title="P5 · Testing & Compliance"
        subtitle="V-model test battery, legal compliance matrix, security and performance evidence." />
          <QualityPanel lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
