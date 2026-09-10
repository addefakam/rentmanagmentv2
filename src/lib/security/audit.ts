// ============================================================================
// audit.ts — NFR-07 immutable audit trail with hash-chain integrity.
// Every state-changing action is appended with a SHA-256 hash chained to the
// previous event (OWASP ASVS V7). Any alteration of a historical event
// invalidates every subsequent hash, so tampering is detectable.
// ============================================================================

import { createHash } from "crypto";
import { db } from "@/lib/db";

export const GENESIS_HASH = "0".repeat(64);

export type AuditInput = {
  actorCode: string; // STF-xxxx | SYSTEM | PUBLIC | INTEGRATION
  actorRole: string;
  orgUnitCode?: string | null;
  action: string;
  entity: string;
  entityRef?: string | null;
  summary?: string | null;
};

function hashEvent(prevHash: string, e: {
  action: string; entity: string; entityRef?: string | null;
  actorCode: string; at: Date; summary?: string | null;
}): string {
  return createHash("sha256")
    .update([prevHash, e.at.toISOString(), e.actorCode, e.action, e.entity, e.entityRef ?? "", e.summary ?? ""].join("|"))
    .digest("hex");
}

/** Append one audit event at the chain tip. Retries if the tip moved between
 *  read and write (concurrent append protection). */
export async function recordAudit(input: AuditInput) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const tip = await db.auditEvent.findFirst({ orderBy: { seq: "desc" } });
    const prevHash = tip?.hash ?? GENESIS_HASH;
    const at = new Date();
    const hash = hashEvent(prevHash, { ...input, at });
    try {
      return await db.auditEvent.create({
        data: {
          actorCode: input.actorCode, actorRole: input.actorRole,
          orgUnitCode: input.orgUnitCode ?? null,
          action: input.action, entity: input.entity,
          entityRef: input.entityRef ?? null, summary: input.summary ?? null,
          prevHash, hash,
          at,
        },
      });
    } catch {
      // unique-hash collision means the tip advanced concurrently; retry
    }
  }
  throw new Error("Audit append failed after retries: concurrent chain writes");
}

export type ChainVerdict = {
  events: number;
  checked: number;
  intact: boolean;
  brokenAtSeq: number | null;
  reason: string | null;
};

/** Walk the whole chain in seq order recomputing every hash. */
export async function verifyAuditChain(): Promise<ChainVerdict> {
  const events = await db.auditEvent.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    const expected = hashEvent(prevHash, { ...e, at: e.at });
    if (e.prevHash !== prevHash || e.hash !== expected) {
      return {
        events: events.length, checked: e.seq - 1, intact: false,
        brokenAtSeq: e.seq,
        reason: e.prevHash !== prevHash
          ? `Event ${e.seq} does not link to its predecessor (prevHash mismatch).`
          : `Event ${e.seq} payload hash mismatch — event was altered after append.`,
      };
    }
    prevHash = e.hash;
  }
  return { events: events.length, checked: events.length, intact: true, brokenAtSeq: null, reason: null };
}
