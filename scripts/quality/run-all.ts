// ============================================================================
// run-all.ts — Phase 5 quality runner. Executes the full automated battery,
// parses per-test outcomes, and writes results.json next to the compliance
// matrix so /api/quality and the Phase 5 report can attach evidence.
// Run: bun scripts/quality/run-all.ts
// ============================================================================

import { writeFileSync } from "fs";

const files = [
  "tests/seed-config.test.ts",
  "tests/phase4-domain.test.ts",
  "tests/integration.test.ts",
  "tests/security.test.ts",
  "tests/compliance-legal.test.ts",
];

const proc = Bun.spawnSync({
  cmd: ["bun", "test", ...files],
  cwd: "/home/z/my-project",
  env: { ...process.env, DO_NOT_TRACK: "1" },
  stdout: "pipe",
  stderr: "pipe",
});

const out = new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr);
const byTest: Record<string, "pass" | "fail"> = {};
for (const line of out.split("\n")) {
  const m = line.match(/^\((pass|fail)\)\s+(.+?)(\s+\[\d+\.?\d*ms\])?$/);
  if (m) {
    // bun prints "Suite > case"; matrix rows reference the leaf case name
    const leaf = m[2].trim().split(" > ").pop()!.trim();
    byTest[leaf] = m[1] as "pass" | "fail";
  }
}

const totals = {
  pass: Object.values(byTest).filter((v) => v === "pass").length,
  fail: Object.values(byTest).filter((v) => v === "fail").length,
};

const results = {
  generatedAt: new Date().toISOString(),
  command: `bun test ${files.join(" ")}`,
  totals,
  byTest,
};

writeFileSync("/home/z/my-project/src/lib/compliance/results.json", JSON.stringify(results, null, 2));
console.log(`battery: ${totals.pass} pass / ${totals.fail} fail -> src/lib/compliance/results.json`);
if (totals.fail > 0) {
  for (const [name, v] of Object.entries(byTest)) if (v === "fail") console.log("  FAIL", name);
  process.exit(1);
}
