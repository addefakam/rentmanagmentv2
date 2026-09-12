// ============================================================================
// scripts/build.mjs — database-aware production build wrapper.
//
// Prisma requires one provider per schema: local development runs SQLite
// (prisma/schema.prisma) while cloud deployments (Vercel + Neon) run
// PostgreSQL (prisma/schema.postgres.prisma). This wrapper picks the right
// schema from DATABASE_URL, regenerates the Prisma client, provisions the
// production database when on PostgreSQL (see scripts/provision-neon.mjs),
// then runs `next build`.
//
//   DATABASE_URL=file:./db/custom.db            -> sqlite schema  (local)
//   DATABASE_URL=postgres://...@ep-xxx.neon.tech -> postgres schema (Neon)
//
// The Prisma CLI is invoked directly via node (node_modules/prisma/build/
// index.js) — NOT via npx, which failed on Vercel's bun-run build. Same for
// the Next.js CLI. For the self-hosted standalone bundle use
// `npm run build:standalone`.
// ============================================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Load .env when the shell has not already set DATABASE_URL (Vercel injects
// env natively; local runs may rely on the .env file).
if (!process.env.DATABASE_URL && existsSync(".env")) {
  const line = readFileSync(".env", "utf8")
    .split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

const root = process.cwd();
const require2 = createRequire(path.join(root, "package.json"));

// Direct CLI paths — immune to npx resolution quirks on Vercel.
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(prismaCli)) {
  console.error("[build] prisma CLI not found at node_modules/prisma/build/index.js");
  process.exit(1);
}

const run = (label, cli, args) => {
  console.log(`[build] ${label}`);
  const r = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`[build] ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
};

const url = process.env.DATABASE_URL ?? "";
const isPostgres = /^(postgres|postgresql):\/\//i.test(url.trim());
const schema = isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

console.log(`[build] DATABASE_URL scheme: ${isPostgres ? "postgresql" : "sqlite (default)"}`);

// Regenerate the client FIRST, so provisioning talks to PostgreSQL through
// the default @prisma/client (no second client copy needed).
run(`prisma generate --schema ${schema}`, prismaCli, ["generate", "--schema", schema]);

// Cloud (Vercel + Neon): bring the production database to the shipped state
// before bundling — additive schema sync, and a full re-provision from the
// committed snapshot when the database is empty or stale. No-op locally.
if (isPostgres) {
  console.log("[build] provisioning the production database (provision-neon.mjs)...");
  const prov = spawnSync(process.execPath, [path.join(root, "scripts", "provision-neon.mjs")], { stdio: "inherit" });
  if (prov.status !== 0) {
    console.error(`[build] database provisioning failed (exit ${prov.status})`);
    process.exit(prov.status ?? 1);
  }
}

run("next build", nextCli, ["build"]);
