"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { AuditTrailPage } from "@/components/platform/panels-audit";

// /platform/audit — PLATFORM AUDIT TRAIL, the System Super User's fleet-wide
// oversight surface (owner directive "remove insight and add some else if
// needed"). It replaced Insights (city Data & Reports) in the super user's
// console: instead of city analytics, the super user inspects the
// tamper-evident audit chain across EVERY tenant city — WHO did WHAT, WHERE,
// WHEN — and can walk the full SHA-256 chain on demand to prove that no
// historical event was altered (NFR-07 / OWASP ASVS V7).
export default function Page() {
  return (
    <ModuleFrame
      route="/platform/audit"
      render={() => (
        <>
          <PageHead
            title="Platform Audit Trail"
            subtitle="Fleet-wide oversight of the immutable audit chain (NFR-07) — every state-changing action in every city, with on-demand hash-chain integrity verification. Reserved for the System Super User."
          />
          <AuditTrailPage />
        </>
      )}
    />
  );
}
