// ============================================================================
// officer.ts — Lightweight signed-cookie officer sessions for the console.
// The officer identity (staff code + role + home city) is issued at /api/auth
// login and stored in an HttpOnly cookie signed with HMAC-SHA256. API routes
// continue to use the existing x-staff-code capability layer (authz.ts); the
// cookie only decides WHO is browsing and WHICH pages they may open.
// ============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const OFFICER_COOKIE = "rc_officer";
const TTL_SECONDS = 60 * 60 * 12; // half a working day

function secret(): string {
  return process.env.AUTH_SECRET || "rent-control-demo-secret-1320-2016";
}

export type Officer = {
  staffCode: string;
  fullName: string;
  roleCode: string;
  roleTier: string; // WOREDA | SUB_CITY | BUREAU | MINISTRY | SYSTEM | ...
  orgUnitId: string;
  orgUnitCode: string;
  cityCode: string | null; // null for national (MINISTRY/SYSTEM) staff
  national: boolean; // may switch cities and see everything
  iat: number;
};

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeOfficer(officer: Omit<Officer, "iat">): string {
  const body = Buffer.from(JSON.stringify({ ...officer, iat: Date.now() })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeOfficer(token: string | undefined | null): Officer | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const officer = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Officer;
    if (!officer.staffCode || typeof officer.iat !== "number") return null;
    if (Date.now() - officer.iat > TTL_SECONDS * 1000) return null;
    return officer;
  } catch {
    return null;
  }
}

/** Server-component helper: read + verify the officer cookie. */
export async function currentOfficer(): Promise<Officer | null> {
  const store = await cookies();
  return decodeOfficer(store.get(OFFICER_COOKIE)?.value);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

const NATIONAL_ROLES = new Set(["MINISTRY_ANALYST", "SYSTEM_ADMIN"]);
export function isNationalRole(roleCode: string): boolean {
  return NATIONAL_ROLES.has(roleCode);
}
