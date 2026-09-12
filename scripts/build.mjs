// ============================================================================
// scripts/build.mjs — database-aware production build wrapper.
//
// Prisma requires one provider per schema: local development runs SQLite
// (prisma/schema.prisma) while cloud deployments (Vercel + Neon) run
// PostgreSQL (prisma/schema.postgres.prisma). This wrapper picks the right
// schema from DATABASE_URL, regenerates the Prisma client, then runs
// `next build` — so Vercel's default build command (`npm run build`) works
// with zero manual overrides.
//
//   DATABASE_URL=file:./db/custom.db            -> sqlite schema  (local)
//   DATABASE_URL=postgres://...@ep-xxx.neon.tech -> postgres schema (Neon)
//
// For the self-hosted standalone server bundle use `npm run build:standalone`.
// ============================================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Load .env when the shell has not already set DATABASE_URL (Vercel injects
// env natively; local runs may rely on the .env file).
if (!process.env.DATABASE_URL && existsSync(".env")) {
  const line = readFileSync(".env", "utf8")
    .split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

const url = process.env.DATABASE_URL ?? "";
const isPostgres = /^(postgres|postgresql):\/\//i.test(url.trim());
const schema = isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

const runner = (process.platform === "win32") ? "npx.cmd" : "npx";

console.log(`[build] DATABASE_URL scheme: ${isPostgres ? "postgresql" : "sqlite (default)"}`);

// Cloud (Vercel + Neon): bring the production database to the shipped state
// before bundling — schema sync, and a full re-provision from the committed
// snapshot when the database is empty or stale. No-op for local SQLite.
if (isPostgres) {
  console.log("[build] provisioning the production database (provision-neon.mjs)...");
  const prov = spawnSync(runner, ["node", "scripts/provision-neon.mjs"], { stdio: "inherit" });
  if (prov.status !== 0) {
    console.error(`[build] database provisioning failed (exit ${prov.status})`);
    process.exit(prov.status ?? 1);
  }
}

console.log(`[build] prisma generate --schema ${schema}`);
const gen = spawnSync(runner, ["--no-install", "prisma", "generate", "--schema", schema], {
  stdio: "inherit",
});
if (gen.status !== 0) {
  console.error(`[build] prisma generate failed (exit ${gen.status})`);
  process.exit(gen.status ?? 1);
}

console.log("[build] next build");
const build = spawnSync(runner, ["--no-install", "next", "build"], { stdio: "inherit" });
process.exit(build.status ?? 1);
