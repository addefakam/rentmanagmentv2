// /platform — legacy Platform Administration URL. City Management (the full
// fleet control plane) now lives at its dedicated URL /platform/cities; this
// shim keeps old bookmarks working by redirecting there. Only the SYSTEM_ADMIN
// passes the destination guard — owner directive: one supreme admin.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/platform/cities");
}
