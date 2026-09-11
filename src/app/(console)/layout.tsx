// ============================================================================
// (console)/layout.tsx — server-side auth gate for every console page.
// No signed officer cookie -> straight to the login page.
// ============================================================================

import { redirect } from "next/navigation";
import { currentOfficer } from "@/lib/auth/officer";
import { ConsoleShell } from "@/components/platform/shell";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const officer = await currentOfficer();
  if (!officer) redirect("/login");
  return (
    <ConsoleShell
      officer={{
        staffCode: officer.staffCode, fullName: officer.fullName, roleCode: officer.roleCode,
        roleTier: officer.roleTier, orgUnitCode: officer.orgUnitCode,
        cityCode: officer.cityCode, national: officer.national,
      }}
    >
      {children}
    </ConsoleShell>
  );
}
