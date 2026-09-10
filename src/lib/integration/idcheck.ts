// ============================================================================
// idcheck.ts — Integration adapter: national identification verification
// service (Dir. Art. 7 identification; the Fayda national digital ID is the
// natural production partner). Phase 5 runs a deterministic mock with the
// plan-mandated failure and timeout behaviour:
//   MATCH       — identity verified
//   NO_MATCH    — provider answers: no such ID or name mismatch
//   UNAVAILABLE — provider down (graceful degradation: registration continues
//                 with a DEFERRED_ID_CHECK flag, never a hard failure)
// Mode selection: per-call override first, then env ID_MOCK_MODE. A document
// number beginning with "X" always mismatches (deterministic test hook).
// ============================================================================

export class IntegrationError extends Error {
  constructor(message: string, public readonly provider: string, public readonly status: number, public readonly kind: "DECLINED" | "TIMEOUT" | "UNAVAILABLE") {
    super(message);
    this.name = "IntegrationError";
  }
}

export type IdVerificationRequest = {
  idTypeCode: string; // ID-KEBELE | ID-PASSPORT | ID-FAYDA | ...
  idNumber: string;
  fullName: string;
};

export type IdVerification = {
  status: "MATCH" | "NO_MATCH" | "DEFERRED";
  provider: string;
  providerRef: string;
  note: string;
};

export type IdMode = "NORMAL" | "NO_MATCH" | "TIMEOUT";

export function currentIdMode(override?: string): IdMode {
  const raw = (override ?? process.env.ID_MOCK_MODE ?? "NORMAL").toUpperCase();
  return raw === "NO_MATCH" || raw === "TIMEOUT" ? raw : "NORMAL";
}

export interface IdService {
  verify(req: IdVerificationRequest, mode?: IdMode): Promise<IdVerification>;
}

export class MockIdService implements IdService {
  constructor(private readonly provider = "MOCK-ID-SANDBOX") {}

  async verify(req: IdVerificationRequest, mode?: IdMode): Promise<IdVerification> {
    const m = mode ?? currentIdMode();
    await new Promise((r) => setTimeout(r, 1));
    const providerRef = `IDS-${Date.now().toString(36).toUpperCase()}`;
    if (m === "TIMEOUT") {
      // Timeout behaves as graceful degradation for identity checks: the
      // office workflow must not stop because a partner service is down.
      return {
        status: "DEFERRED", provider: this.provider, providerRef,
        note: "Identification service timed out; verification deferred for manual follow-up.",
      };
    }
    if (m === "NO_MATCH" || req.idNumber.toUpperCase().startsWith("X")) {
      return {
        status: "NO_MATCH", provider: this.provider, providerRef,
        note: "Provider reports no matching identity record for the presented document.",
      };
    }
    return {
      status: "MATCH", provider: this.provider, providerRef,
      note: "Identity record matched the presented document.",
    };
  }
}

export const idService: IdService = new MockIdService();
