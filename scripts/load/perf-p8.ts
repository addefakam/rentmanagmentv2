// ============================================================================
// perf-p8.ts — Phase 8 staging performance re-run (the standing go-live
// checklist item carried from the Phase 5 assessment: "a re-run of these
// profiles in the staging environment as a standing item, using the same
// persisted harness with raised concurrency").
// Raised profiles vs Phase 5: WOREDA 25->40 VUs, CITY_PEAK 60->90 VUs,
// REG_E2E 20->25 samples. Same endpoints, same NFR-01 targets.
// Output: scripts/load/perf-output-p8.json (referenced by the PERF_RERUN drill).
// Run: bun scripts/load/perf-p8.ts   (dev/staging server on :3000)
// ============================================================================

import { writeFileSync, mkdirSync } from "fs";

const BASE = process.env.PERF_BASE ?? "http://localhost:3000";

type Sample = { ms: number; ok: boolean };

const READ_MIX: { path: string; weight: number }[] = [
  { path: "/api/parties", weight: 3 },
  { path: "/api/registration-files", weight: 3 },
  { path: "/api/payments", weight: 2 },
  { path: "/api/complaints", weight: 2 },
  { path: "/api/deadlines", weight: 1 },
  { path: "/api/publications", weight: 2 },
  { path: "/api/platform", weight: 1 },
  { path: "/api/phase8", weight: 1 }, // new go-live evidence surface under load
];

function pickMix(): string {
  const total = READ_MIX.reduce((a, r) => a + r.weight, 0);
  let r = Math.random() * total;
  for (const row of READ_MIX) {
    r -= row.weight;
    if (r <= 0) return row.path;
  }
  return "/api/parties";
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function timedGet(path: string): Promise<Sample> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    await res.json();
    return { ms: performance.now() - t0, ok: res.ok };
  } catch {
    return { ms: performance.now() - t0, ok: false };
  }
}

async function runLoadProfile(name: string, vus: number, durationMs: number) {
  const samples: Sample[] = [];
  const stopAt = Date.now() + durationMs;
  const worker = async () => {
    while (Date.now() < stopAt) {
      samples.push(await timedGet(pickMix()));
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: vus }, worker));
  const wallMs = performance.now() - t0;
  const lat = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => !s.ok).length;
  return {
    profile: name,
    virtualUsers: vus,
    durationMs,
    requests: samples.length,
    throughputRps: Number(((samples.length / wallMs) * 1000).toFixed(1)),
    errorRatePct: Number(((errors / Math.max(1, samples.length)) * 100).toFixed(2)),
    p50: Number(pct(lat, 50).toFixed(0)),
    p95: Number(pct(lat, 95).toFixed(0)),
    p99: Number(pct(lat, 99).toFixed(0)),
    max: Number((lat[lat.length - 1] ?? 0).toFixed(0)),
  };
}

async function registrationE2E(samples: number) {
  const times: number[] = [];
  let failures = 0;
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    const boot = await fetch(`${BASE}/api/platform`, { cache: "no-store" });
    await boot.json();
    const files = await fetch(`${BASE}/api/registration-files`, { cache: "no-store" });
    await files.json();
    const parties = await fetch(`${BASE}/api/parties`, { cache: "no-store" });
    await parties.json();
    const ms = performance.now() - t0;
    if (boot.ok && files.ok && parties.ok) times.push(ms); else failures++;
    await new Promise((r) => setTimeout(r, 150));
  }
  times.sort((a, b) => a - b);
  return {
    profile: "REG_E2E",
    samples,
    failures,
    p50: Number(pct(times, 50).toFixed(0)),
    p95: Number(pct(times, 95).toFixed(0)),
    max: Number((times[times.length - 1] ?? 0).toFixed(0)),
    targetMs: 5000,
  };
}

const results = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  note: "Phase 8 staging re-run with raised concurrency (Phase 5 standing checklist item).",
  nfrTargets: { interactiveP95Ms: 3000, registrationE2EMs: 5000, cityLoadVUs: 500 },
  profiles: [] as Record<string, unknown>[],
};

console.log("Profile WOREDA-RAISED (40 VUs, 20s)...");
results.profiles.push(await runLoadProfile("WOREDA", 40, 20000));
console.log("Profile CITY_PEAK-RAISED (90 VUs, 25s)...");
results.profiles.push(await runLoadProfile("CITY_PEAK", 90, 25000));
console.log("Profile REG_E2E (25 samples)...");
results.profiles.push(await registrationE2E(25));

for (const p of results.profiles as Record<string, number | string>[]) {
  console.log(
    `${String(p.profile).padEnd(10)} reqs=${String(p.requests ?? p.samples).padEnd(6)} ` +
    `p50=${String(p.p50)}ms p95=${String(p.p95)}ms p99=${p.p99 ?? "-"}ms ` +
    `rps=${p.throughputRps ?? "-"} err=${p.errorRatePct ?? "0"}%`,
  );
}

mkdirSync("/home/z/my-project/scripts/load", { recursive: true });
writeFileSync("/home/z/my-project/scripts/load/perf-output-p8.json", JSON.stringify(results, null, 2));
console.log("written: scripts/load/perf-output-p8.json");
