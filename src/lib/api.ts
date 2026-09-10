// ============================================================================
// api.ts — Shared API helpers: LegalError -> 422 mapping with the violated
// legal rule surfaced to the client (traceability to the end user);
// SecurityError -> 403 (Phase 5 RBAC); IntegrationError -> provider status
// (424 declined / 504 timeout) with the ledger left untouched.
// ============================================================================

import { NextResponse } from "next/server";
import { LegalError } from "@/lib/domain/service";

export function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

export function fail(err: unknown) {
  if (err instanceof LegalError) {
    return NextResponse.json({ ok: false, error: err.message, rule: err.rule }, { status: 422 });
  }
  if (err instanceof Error && err.name === "SecurityError") {
    const sec = err as Error & { missing?: string };
    return NextResponse.json(
      { ok: false, error: err.message, rule: "NFR-04 access control (ASVS V4)", code: sec.missing ?? "AUTH_FORBIDDEN" },
      { status: 403 },
    );
  }
  if (err instanceof Error && err.name === "IntegrationError") {
    const ie = err as Error & { status?: number; provider?: string; kind?: string };
    return NextResponse.json(
      { ok: false, error: err.message, rule: "Integration failure", provider: ie.provider, kind: ie.kind },
      { status: typeof ie.status === "number" ? ie.status : 502 },
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function body<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
