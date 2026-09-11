"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { SettingsPage } from "@/components/platform/panels-settings";

export default function Page() {
  return (
    <ModuleFrame
      route="/settings"
      render={({ boot, lang, refresh }) => (
        <>
          <PageHead title="City Settings"
        subtitle="Per-city rule sets without code changes (Dir. Art. 14)." />
          <SettingsPage boot={boot} lang={lang} refresh={refresh} />
        </>
      )}
    />
  );
}
