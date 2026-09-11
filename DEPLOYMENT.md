# Deploying to Vercel with Neon PostgreSQL

This guide takes the repository from GitHub to a working Vercel deployment backed by a Neon Postgres database.

> **Why your first attempt returned `404: NOT_FOUND` (Code: NOT_FOUND):** the platform was
> originally built on SQLite. Two things broke the Vercel **build**, and Vercel serves its
> generic `404 NOT_FOUND` page when a domain has no successful deployment behind it:
>
> 1. The Prisma schema declared `provider = "sqlite"` — Neon is PostgreSQL-only, so the
>    generated client could not talk to your Neon URL.
> 2. `next.config.ts` forced `output: "standalone"` and the old `build` script copied files
>    into `.next/standalone/` — a self-hosting layout that does not match Vercel's routing.
>
> Both are fixed in this revision: the build is now **database-aware** (`scripts/build.mjs`
> picks the SQLite or PostgreSQL schema from `DATABASE_URL` and regenerates the Prisma client
> automatically), and Vercel gets the default Next.js output. No manual build-command override
> is needed.

## 1. Create the Neon database

1. Sign in at <https://neon.tech> and create a project (region close to your users — e.g. EU
   or Bahrain).
2. Copy the **connection string**; it looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-xxxx-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Keep `sslmode=require` (Neon includes it; do not remove it).

## 2. Configure Vercel

1. **Vercel → Add New → Project → Import** the `addefakam/rentmanagmentv2` repository.
2. Framework preset: **Next.js** (auto-detected). Leave the build command as
   `npm run build` — the wrapper handles Prisma schema selection.
3. Under **Environment Variables** add:
   | Key | Value | Environments |
   |---|---|---|
   | `DATABASE_URL` | your Neon **pooled** connection string (see below) | Production, Preview, Development |

   Use the host that contains `-pooler` and append `&pgbouncer=true`, e.g.:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
   ```
   (In Neon's dashboard, the connection string with "Pooled connection" toggled on. The
   plain non-pooler host also works at runtime, but pooled is the recommended default.)

4. **Deploy.** The build log should show:
   ```
   [build] DATABASE_URL scheme: postgresql
   [build] prisma generate --schema prisma/schema.postgres.prisma
   [build] next build
   ```

> **Environment variables only apply to deployments created AFTER they are saved.** If you
> add or change `DATABASE_URL`, you must trigger a new deployment (Vercel → Deployments →
> ⋯ → Redeploy) — redeploys of an old build do not pick it up either; use
> "Redeploy" on the latest commit so the build re-runs.

## 3. Initialize the database (schema + seed)

> **STATUS: ALREADY DONE for this project's Neon database.** The schema was pushed, the
> full platform state was loaded, and the tamper-evident audit chain verified intact
> (814/814 events) on 2026-09-11. The steps below are only needed when provisioning a
> **fresh** Neon database, or to re-run after a reset.

A fresh Neon database is empty. From your local machine (repository checked out):

```bash
# 1. Point at Neon for this session (quote the whole URL)
export DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require"

# 2. Create all tables
npm run db:push:pg          # prisma db push --schema prisma/schema.postgres.prisma

# 3. Seed the platform's configuration and shipped operational state
npm run db:seed             # bunx tsx prisma/seed.ts
```

The seed is idempotent and loads the full shipped arc: the 131-unit organizational tree,
catalogs and penalty parameters, demo staff, the Phase 7 migration/pilot record and the
Phase 8 go-live/operations record (waves, hypercare, annual cycle, referrals, Ministry feed,
handover, PIR, closure minute).

Without seeding the console still renders (auth falls back to demo mode) but every register
will be empty — **seed before reviewing**.

> **Slow seed / timeouts over WAN?** `prisma/seed.ts` writes row-by-row; across a WAN (and
> through Neon's pooler, which terminates long transactions) it can stall. The repository
> ships `scripts/etl-sqlite-to-neon.ts`: seed a local SQLite database first (quick, local),
> then bulk-copy everything with batched `createMany` — this is how this project's Neon
> database was populated. The script realigns the `AuditEvent.seq` sequence, and the
> resulting hash chain verifies intact. Verify with `scripts/check-neon.ts`.

## 4. Verify

- Open the deployment URL → the console loads in demo mode (no sign-in wall).
- The **P8 · Go-Live & Operations** tab should show the closure state:
  Wave 1 LIVE, hypercare 28/28, closure minute SIGNED under GATE-G9-2026-09-11.
- Language switch (Amharic / English / Afan Oromo) works from the header.

## 5. If it is still not working — 60-second checklist

All of the following has been verified end to end on 2026-09-11 (production build against
the live Neon database: home page and all API routes return 200 with real data).

1. **Vercel → Deployments: is the LATEST deployment `Ready`?**
   - `Error` / `Canceled` → open the build log. The three `[build]` lines (see step 2.4)
     must appear. If the build command is not `npm run build` (a leftover custom override),
     reset it: Settings → Git → Build Command → clear override / set `npm run build`.
   - No deployment newer than your last code push → the deploy never ran: trigger
     Deployments → Redeploy on the latest commit.
2. **Is `DATABASE_URL` set at all?** Vercel → Settings → Environment Variables. It must be
   there with the **Production** scope ticked, and the value must start with
   `postgresql://` (not `file:`). A missing/SQLite URL makes the build pick the SQLite
   schema and the deployment will not work.
3. **Did the env var exist BEFORE the latest deployment?** Env changes never affect already-
   built deployments. After any change: Deployments → ⋯ → Redeploy (latest commit).
4. **Smoke-test the deployment itself**, not the custom domain:
   ```bash
   curl -s https://<your-app>.vercel.app/api/platform | head -c 200
   ```
   Expected: `{"ok":true,...`. If the custom domain 404s but `*.vercel.app` works, the
   domain mapping is the issue (Vercel → Settings → Domains).
5. **Verify the database state any time** from a local checkout:
   ```bash
   DATABASE_URL='postgresql://...@ep-xxxx.neon.tech/neondb?sslmode=require' \
     bun scripts/check-neon.ts
   ```
   Expected healthy counts: OrgUnit 131, Party 56, Property 28, AuditEvent 814,
   ClosureMinute 1 (SIGNED).

## Notes and troubleshooting

- **Local development stays on SQLite.** `DATABASE_URL=file:./db/custom.db` + `npm run dev`.
  The build wrapper switches schemas automatically in both directions.
- **Neon pooling:** for the app's `DATABASE_URL` on Vercel, use the **pooled** endpoint
  (host contains `-pooler`) and append `&pgbouncer=true` — Prisma must disable prepared
  statements for PgBouncer transaction mode, or runtime queries fail. For one-off
  migrations/seeding use the **direct** endpoint (host without `-pooler`).
- **Two schema files, one rule:** `prisma/schema.prisma` (SQLite) and
  `prisma/schema.postgres.prisma` (PostgreSQL) must stay model-identical. If you change one,
  copy the change to the other — the datasource block is the only intended difference.
- **404 after a successful deploy?** Check Vercel → Deployments: if the latest deployment is
  in `Error` state, the domain serves 404. Open the build log and look at the `[build]`
  lines; a missing or malformed `DATABASE_URL` is the usual culprit.
- **500s at runtime instead of 404** typically mean tables are missing — re-run step 3.
- **Node version:** Vercel's default (20.x) is fine; Next 16 requires >= 18.18.
- **Production authentication:** the platform ships in demo auth mode. The production
  read-path (identity-provider sign-in, capability-matrix reads) is switched per the
  operations runbook (runbook v1.1, "Access management") — leave demo mode until you are
  ready to enforce officer sign-in.
