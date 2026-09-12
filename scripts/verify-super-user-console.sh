#!/usr/bin/env bash
# Verification: the SUPER-USER CONSOLE SCOPE (owner directive).
#  A. National Management center — /platform/management serves the super user.
#  B. National API scoping — stats for SYSTEM_ADMIN only; the regulation
#     register is readable by EVERY officer (reflected to all cities).
#  C. Removed surfaces — registry/operations/project pages are out of the
#     super user's console; their APIs stay tier-scoped as before.
#  C2. Platform Audit Trail (/platform/audit + /api/audit) — the replacement
#     the owner asked for when Insights was removed: SYSTEM_ADMIN-only,
#     fleet-wide chain read + on-demand integrity verdict.
#  D. Mutations (LOCAL ONLY) — add/archive a regulation, propagate a model
#     contract version, then restore the local database.
# Usage: bash scripts/verify-super-user-console.sh <base_url>
set -u
BASE="${1:-http://localhost:3210}"
case "$BASE" in
  http://localhost*|http://127.0.0.1*) LOCAL=1 ;;
  *) LOCAL=0 ;;
esac
JAR8="/tmp/rc_su8.jar"; rm -f "$JAR8"

pass=0; failn=0
ok()  { echo "  PASS: $1"; pass=$((pass+1)); }
bad() { echo "  FAIL: $1"; failn=$((failn+1)); }
api() { curl -s -w "|%{http_code}" -H "x-staff-code: $1" "$BASE/api/national"; }

echo "== A. National Management center (page surface) =="
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/platform/management")
[ "$c" = "307" ] && ok "no session -> redirected to sign-in (307)" || bad "no session -> $c"
curl -s -c "$JAR8" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AA"}' "$BASE/api/auth/login" > /dev/null
c=$(curl -s -b "$JAR8" -o /dev/null -w "%{http_code}" "$BASE/platform/management")
[ "$c" = "200" ] && ok "super user opens /platform/management (200)" || bad "super user -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
[ "$c" = "307" ] && ok "no session -> dashboard / redirected to sign-in (307)" || bad "dashboard no session -> $c"
c=$(curl -s -b "$JAR8" -o /dev/null -w "%{http_code}" "$BASE/")
[ "$c" = "200" ] && ok "super user opens the dashboard / (general-information hub)" || bad "super user dashboard -> $c"

echo "== B. National API scoping (/api/national) =="
r=$(api STF-0008)
echo "$r" | grep -q '"scope":"SYSTEM_ADMIN"' && ok "super user gets the SYSTEM_ADMIN scope" || bad "STF-0008 -> ${r:0:140}"
echo "$r" | grep -q '"stats"' && echo "$r" | grep -q '"tasks"' && ok "fleet statistics + management duties present" || bad "stats/tasks missing: ${r:0:140}"
echo "$r" | grep -q '"rows"' && ok "per-city management table present" || bad "per-city rows missing"
echo "$r" | grep -q '"sections"' && ok "federal contract sections exposed for propagation" || bad "sections missing"
r=$(api STF-0007)
echo "$r" | grep -q '"scope":"OFFICER"' && ok "ministry analyst gets the OFFICER scope (register only)" || bad "STF-0007 -> ${r:0:140}"
echo "$r" | grep -q '"stats"' && bad "STF-0007 must NOT receive fleet statistics" || ok "fleet statistics withheld from non-super users"
r=$(api STF-0001)
echo "$r" | grep -q '"scope":"OFFICER"' && ok "city officer reads the national register (reflected)" || bad "STF-0001 -> ${r:0:140}"
r=$(api STF-1001)
echo "$r" | grep -q "|403" && ok "purged officer (STF-1001) refused (403)" || bad "STF-1001 -> ${r:0:100}"

echo "== C. Removed surfaces stay out of the super user's console =="
r=$(api STF-0007)
echo "$r" | grep -q '"regulations"' && ok "national register reachable from a city console" || bad "register missing for city console"
# Registry/operations writes remain tier-gated: the super user's PAGE set no
# longer includes them, and the domain capabilities never belonged to him.
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0007" -H "Content-Type: application/json" -d '{"action":"ADD_REGULATION","code":"X","titleEn":"X"}' "$BASE/api/national")
echo "$r" | grep -q "|403" && ok "ministry analyst CANNOT add regulations (403)" || bad "STF-0007 ADD_REGULATION -> $r"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0005" -H "Content-Type: application/json" -d '{"action":"PROPAGATE_MODEL_CONTRACT","suffix":"9.9","changes":[{"sectionCode":"CL-1","contentEn":"x"}]}' "$BASE/api/national")
echo "$r" | grep -q "|403" && ok "bureau head CANNOT propagate model contracts (403)" || bad "STF-0005 PROPAGATE -> $r"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d '{"action":"BOGUS_ACTION"}' "$BASE/api/national")
echo "$r" | grep -qE "\|(40[03])" && ok "unknown action refused" || bad "BOGUS_ACTION -> $r"

echo "== C2. Platform Audit Trail — the replacement for the removed Insights =="
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/platform/audit")
[ "$c" = "307" ] && ok "no session -> /platform/audit redirected to sign-in (307)" || bad "/platform/audit no session -> $c"
c=$(curl -s -b "$JAR8" -o /dev/null -w "%{http_code}" "$BASE/platform/audit")
[ "$c" = "200" ] && ok "super user opens /platform/audit (200)" || bad "super user /platform/audit -> $c"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0008" "$BASE/api/audit?limit=50")
echo "$r" | grep -q '"scope":"SYSTEM_ADMIN"' && ok "super user reads the fleet audit trail" || bad "STF-0008 /api/audit -> ${r:0:140}"
echo "$r" | grep -q '"total"' && echo "$r" | grep -q '"events"' && ok "audit payload carries total + events" || bad "total/events missing: ${r:0:140}"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0008" "$BASE/api/audit?limit=20&verify=1")
echo "$r" | grep -q '"intact":true' && ok "full hash-chain walk: integrity INTACT" || bad "chain verify -> ${r:0:140}"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0007" "$BASE/api/audit")
echo "$r" | grep -q "|403" && ok "ministry analyst refused on /api/audit (403)" || bad "STF-0007 /api/audit -> ${r:0:100}"
r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0005" "$BASE/api/audit")
echo "$r" | grep -q "|403" && ok "bureau head refused on /api/audit (403)" || bad "STF-0005 /api/audit -> ${r:0:100}"
r=$(curl -s -w "|%{http_code}" "$BASE/api/audit")
echo "$r" | grep -q "|403" && ok "anonymous refused on /api/audit (403)" || bad "anonymous /api/audit -> ${r:0:100}"

if [ "$LOCAL" = "1" ]; then
  echo "== D. Local mutations: regulation register + fleet propagation =="
  r=$(curl -s -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d '{"action":"ADD_REGULATION","code":"TEST-REG-0001","titleEn":"Verification regulation (test)","type":"MODIFICATION","year":2026,"note":"added by verify-super-user-console"}' "$BASE/api/national")
  echo "$r" | grep -q '"ok":true' && ok "super user ADDS a regulation to the national register" || bad "ADD_REGULATION -> ${r:0:140}"
  r=$(api STF-0001)
  echo "$r" | grep -q "TEST-REG-0001" && ok "the new regulation is REFLECTED to a city console immediately" || bad "not reflected to city console"
  r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d '{"action":"ADD_REGULATION","code":"TEST-REG-0001","titleEn":"Duplicate"}' "$BASE/api/national")
  echo "$r" | grep -qE "\|(40[03])" && ok "duplicate active code refused" || bad "duplicate -> $r"
  r=$(curl -s -w "|%{http_code}" -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d '{"action":"ARCHIVE_REGULATION","id":"NOPE"}' "$BASE/api/national")
  echo "$r" | grep -qE "\|(40[03])" && ok "archiving an unknown entry refused" || bad "archive unknown -> $r"
  ID=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/national" | python3 -c "import sys,json; regs=json.load(sys.stdin)['data']['regulations']; print(next(r['id'] for r in regs if r['code']=='TEST-REG-0001'))")
  r=$(curl -s -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d "{\"action\":\"ARCHIVE_REGULATION\",\"id\":\"$ID\"}" "$BASE/api/national")
  echo "$r" | grep -q '"status":"ARCHIVED"' && ok "ARCHIVE_REGULATION retires the entry" || bad "ARCHIVE -> ${r:0:140}"
  r=$(api STF-0001)
  echo "$r" | grep -q "TEST-REG-0001" && bad "archived entry must vanish from city consoles" || ok "archived entry no longer reflected to cities"
  # Fleet propagation — target AA only so the local run stays surgical.
  r=$(curl -s -H "x-staff-code: STF-0008" -H "Content-Type: application/json" -d '{"action":"PROPAGATE_MODEL_CONTRACT","suffix":"9.9","note":"verification propagation","cities":["AA"],"changes":[{"sectionCode":"SEC-RENT","contentEn":"Verification propagation content (test) — superseded and cleaned up by the suite."}]}' "$BASE/api/national")
  echo "$r" | grep -q '"version":"AA-9.9"' && ok "PROPAGATE creates AA-9.9 from the federal contract" || bad "PROPAGATE -> ${r:0:160}"
  r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/national")
  echo "$r" | grep -q '"federalVersion":"AA-9.9"' && ok "federal version pointer moved to the new version" || bad "federalVersion not moved"
  r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/model-contracts")
  echo "$r" | grep -q '"version":"AA-9.9"' && echo "$r" | grep -q 'Verification propagation content' && ok "amended section content carried into AA-9.9" || bad "AA-9.9 content missing from contract registry"
  echo "  (restoring local DB: removing AA-9.9 + test register entries)"
  bunx tsx scripts/cleanup-national-test.ts && ok "local database restored" || bad "cleanup script failed"
  r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/national")
  echo "$r" | grep -q '"federalVersion":"1.0"' && ok "federal contract back on 1.0 after restore" || bad "federalVersion after restore: ${r:0:80}"
else
  echo "== D. Local mutations SKIPPED (remote target — production data stays untouched) =="
  echo "  SKIP  ADD/ARCHIVE_REGULATION, PROPAGATE_MODEL_CONTRACT (set LOCAL=1 by using a localhost base to exercise them)"
fi

echo
echo "RESULT: $pass passed, $failn failed"
[ "$failn" = "0" ]
