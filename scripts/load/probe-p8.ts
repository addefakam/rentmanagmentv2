// probe-p8.ts — short diagnostic: what do failing requests return under load?
import { readFileSync } from "fs";

const BASE = "http://localhost:3000";
const VUS = Number(process.env.PROBE_VUS ?? 40);
const DURATION = Number(process.env.PROBE_MS ?? 8000);
const PATHS = ["/api/parties", "/api/registration-files", "/api/payments", "/api/phase8"];

const counts: Record<string, number> = {};
const samples: { status: number; ms: number; path: string; body?: string }[] = [];
const stopAt = Date.now() + DURATION;

async function worker() {
  while (Date.now() < stopAt) {
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
      const ms = performance.now() - t0;
      const key = `HTTP ${res.status}`;
      counts[key] = (counts[key] ?? 0) + 1;
      if (res.status >= 400 && samples.length < 5) {
        const text = await res.text();
        samples.push({ status: res.status, ms: Number(ms.toFixed(0)), path, body: text.slice(0, 200) });
      }
    } catch (err) {
      const key = `THROW ${(err as Error).name}: ${String((err as Error).message).slice(0, 60)}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
}

await Promise.all(Array.from({ length: VUS }, worker));
console.log(`VUs=${VUS} duration=${DURATION}ms`);
console.log(counts);
for (const s of samples) console.log(JSON.stringify(s));
void readFileSync;
