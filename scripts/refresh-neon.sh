#!/usr/bin/env bash
# ============================================================================
# refresh-neon.sh — bring the Neon production database to the CURRENT shipped
# state (multi-city SaaS platform) from the freshly-seeded local SQLite.
#
# Why: Neon still holds the 2026-09-11 single-city state (131 org units, no
# Adama/Dire Dawa, no CityConfig.isActive, no CITY_ADMIN role). The deployed
# code queries the new schema, so /api/auth/staff fails and the login page
# shows no cities/officers. This script replaces the old state with the
# verified current one (AA + AD active, DR deactivated demo, 152 org units,
# 14 staff, full Phase 7/8 record, intact audit chain).
#
# Usage:
#   NEON_URL='postgresql://USER:PASS@ep-xxx.neon.tech/neondb?sslmode=require' \
#     bash scripts/refresh-neon.sh
#
# NOTE: use the DIRECT endpoint (host WITHOUT "-pooler") — Neon's pooler
# terminates long transactions, which would break the bulk copy.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${NEON_URL:-}" ]]; then
  echo "ERROR: NEON_URL is required (direct endpoint, not -pooler)." >&2
  exit 1
fi
export DATABASE_URL="$NEON_URL"

echo "== [1/5] Regenerating the PostgreSQL Prisma client (node_modules/.prisma-pg) =="
npx prisma generate --schema prisma/schema.postgres.prisma --output node_modules/.prisma-pg

echo "== [2/5] Resetting the Neon public schema (drops the stale single-city state) =="
printf 'DROP SCHEMA public CASCADE;\nCREATE SCHEMA public;\n' \
  | npx prisma db execute --schema prisma/schema.postgres.prisma --stdin

echo "== [3/5] Creating the current schema on Neon =="
npm run db:push:pg

echo "== [4/5] Bulk-copying the verified local state to Neon (batched ETL) =="
SOURCE_URL="file:/home/z/my-project/db/custom.db" \
TARGET_URL="$NEON_URL" \
  bun scripts/etl-sqlite-to-neon.ts

echo "== [5/5] Verifying Neon row counts =="
DATABASE_URL="$NEON_URL" bun scripts/check-neon.ts

echo ""
echo "== Restoring the local SQLite Prisma client (local dev unaffected) =="
npm run db:generate

echo "DONE — Neon now matches the verified demo state. No Vercel redeploy needed;"
echo "refresh the login page (hard reload) and the city/officer lists will appear."
