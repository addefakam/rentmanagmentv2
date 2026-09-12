// /cities — legacy City Directory URL. Owner directive: ONE supreme admin
// manages cities, from the dedicated URL /platform/cities. This shim keeps
// old bookmarks working by redirecting there; the destination page (and the
// city:admin API capability) allow only the SYSTEM_ADMIN through.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/platform/cities");
}
