// ============================================================================
// api.ts — Shared API helpers: LegalError -> 422 mapping with the violated
// legal rule surfaced to the client (traceability to the end user).
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
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function body<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
