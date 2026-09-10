// ============================================================================
// scripts/pipeline/promote.ts — CLI entry for the staged promotion engine.
// Usage:
//   bunx tsx scripts/pipeline/promote.ts --full           (DEV->STAGING->PROD)
//   bunx tsx scripts/pipeline/promote.ts --stage-only S   (seed+validate one stage)
// Mirrors the CI pipeline jobs so the walkthrough can run end to end locally.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { runStagedPromotion } from "../../src/lib/promotion/promote";
import { runSeed } from "../../prisma/seed";
import { runValidationBattery, summarizeChecks } from "../../src/lib/promotion/validate";

async function main() {
  const arg = process.argv[2] ?? "--full";
  const db = new PrismaClient({ log: ["error"] });

  if (arg === "--stage-only") {
    const stage = process.argv[3] ?? "STAGING";
    const seed = await runSeed();
    console.log(`[${stage}] seeded:`, seed.counts);
    const checks = await runValidationBattery(db);
    const sum = summarizeChecks(checks);
    for (const c of checks) {
      const mark = c.passed ? "PASS" : (c.severity === "BLOCKING" ? "FAIL" : "ADV");
      console.log(`  [${mark}] ${c.category} :: ${c.name} -> expected: ${c.expected} | actual: ${c.actual}`);
    }
    console.log(`[${stage}] summary:`, sum);
    process.exit(sum.allBlockingPassed ? 0 : 1);
  }

  const outcome = await runStagedPromotion(db);
  console.log(`\n=== STAGED PROMOTION ${outcome.status} — tag ${outcome.tag} ===`);
  for (const s of outcome.steps) {
    console.log(`  #${s.orderNo} [${s.stage}] ${s.name}: ${s.status}${s.durationMs ? ` (${s.durationMs} ms)` : ""}`);
    if (s.detail) console.log(`      ${s.detail}`);
  }
  const failed = outcome.steps.some((s) => s.status === "FAILED");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("PROMOTION ERROR:", err);
  process.exit(1);
});
