// /api/auth/logout — clears the officer cookie.
import { OFFICER_COOKIE } from "@/lib/auth/officer";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `${OFFICER_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res;
}
