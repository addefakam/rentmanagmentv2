// ============================================================================
// bank.ts — Integration adapter: bank / payment gateway sandbox (Proc. Art. 13;
// SRS open item O3: production partner APIs are procured later, so Phase 5
// tests run against a deterministic mock with injectable failure modes).
//
// Failure modes (the plan requires failure and timeout behaviour):
//   NORMAL   — settle instantly, return a provider reference
//   DECLINE  — provider declines the transaction (424 to the caller, no ledger entry)
//   TIMEOUT  — provider never answers (504, no ledger entry, retry safe)
// Mode selection: per-call override argument first, then env BANK_MOCK_MODE.
// ============================================================================

export type BankTransferRequest = {
  debtorRef: string; // tenant payment instrument reference
  creditorRef: string; // bureau collection account
  amountETB: number;
  reference: string; // receipt intent / ledger correlation
  method: string; // CBE_BIRR | TELEBIRR | AMOLE | BANK_TRANSFER | M-PESA
};

export type BankSettlement = {
  status: "SETTLED";
  providerRef: string;
  settledAt: Date;
  provider: string;
};

export class IntegrationError extends Error {
  constructor(message: string, public readonly provider: string, public readonly status: number, public readonly kind: "DECLINED" | "TIMEOUT" | "UNAVAILABLE") {
    super(message);
    this.name = "IntegrationError";
  }
}

export type BankMode = "NORMAL" | "DECLINE" | "TIMEOUT";

export function currentBankMode(override?: string): BankMode {
  const raw = (override ?? process.env.BANK_MOCK_MODE ?? "NORMAL").toUpperCase();
  return raw === "DECLINE" || raw === "TIMEOUT" ? raw : "NORMAL";
}

export interface BankGateway {
  initiateTransfer(req: BankTransferRequest, mode?: BankMode): Promise<BankSettlement>;
}

/** Deterministic sandbox. Real gateway binds behind the same interface at
 *  procurement (O3); ledger code depends only on BankSettlement. */
export class MockBankGateway implements BankGateway {
  constructor(private readonly provider = "MOCK-BANK-SANDBOX") {}

  async initiateTransfer(req: BankTransferRequest, mode?: BankMode): Promise<BankSettlement> {
    const m = currentBankMode(mode);
    // Simulated network latency (kept tiny for test throughput)
    await new Promise((r) => setTimeout(r, 2));
    if (req.amountETB <= 0) {
      throw new IntegrationError("Transfer amount must be positive.", this.provider, 424, "DECLINED");
    }
    if (m === "TIMEOUT") {
      await new Promise((r) => setTimeout(r, 15));
      throw new IntegrationError(
        `Payment provider ${this.provider} did not respond within the timeout window. ` +
        `No ledger entry was recorded; retry when the channel is restored.`,
        this.provider, 504, "TIMEOUT",
      );
    }
    if (m === "DECLINE") {
      throw new IntegrationError(
        `Payment provider ${this.provider} declined the transfer (insufficient funds / blocked instrument). ` +
        `No ledger entry was recorded.`,
        this.provider, 424, "DECLINED",
      );
    }
    const providerRef = `BNK-${Date.now().toString(36).toUpperCase()}-${Math.abs(hashRef(req.reference)).toString(36).toUpperCase()}`;
    return { status: "SETTLED", providerRef, settledAt: new Date(), provider: this.provider };
  }
}

function hashRef(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export const bankGateway: BankGateway = new MockBankGateway();
