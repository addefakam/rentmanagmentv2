// /admin — the SEPARATE super-user portal (owner directive). A discreet,
// code-only sign-in bound to the Addis Ababa federal administration: no city
// picker, no officer roster, no demo hints. Only the System Super User
// (STF-0008, SYSTEM_ADMIN) passes — enforced server-side by /api/auth/super,
// never by the page itself. A valid super-user session is bounced straight to
// the City Management console; the public /login keeps serving everyone else.
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentOfficer } from "@/lib/auth/officer";
import { SuperAdminForm } from "@/components/super-admin-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "System Administration — Restricted" };

export default async function SuperAdminPage() {
  const officer = await currentOfficer();
  if (officer?.roleCode === "SYSTEM_ADMIN") redirect("/platform/cities");
  return <SuperAdminForm />;
}
