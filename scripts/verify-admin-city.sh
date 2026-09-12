#!/usr/bin/env bash
# Verification: System Admin (STF-0008) attached to the Addis Ababa (AA) roster only.
# Usage: bash scripts/verify-admin-city.sh <base_url>
set -u
BASE="${1:-http://localhost:3210}"

pass=0; failn=0
ok()  { echo "  PASS: $1"; pass=$((pass+1)); }
bad() { echo "  FAIL: $1"; failn=$((failn+1)); }

echo "== 1. Rosters (/api/auth/staff?city=…) =="
AA=$(curl -s "$BASE/api/auth/staff?city=AA")
AD=$(curl -s "$BASE/api/auth/staff?city=AD")
echo "$AA" | grep -q '"STF-0008"' && ok "AA roster INCLUDES STF-0008 (system admin)" || bad "AA roster missing STF-0008"
echo "$AA" | grep -q '"STF-0007"' && ok "AA roster INCLUDES STF-0007 (ministry analyst)" || bad "AA roster missing STF-0007"
echo "$AD" | grep -q '"STF-0008"' && bad "AD roster STILL LISTS STF-0008 (must be removed)" || ok "AD roster EXCLUDES STF-0008"
echo "$AD" | grep -q '"STF-0007"' && bad "AD roster STILL LISTS STF-0007 (must be removed)" || ok "AD roster EXCLUDES STF-0007"
echo "$AD" | grep -q '"STF-1001"' && ok "AD roster keeps city officers (STF-1001)" || bad "AD roster lost STF-1001"

echo "== 2. Sign-in enforcement (POST /api/auth/login) =="
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|403" && ok "STF-0008 via ADAMA context -> 403 refused" || bad "STF-0008 via AD -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-0008 via ADDIS ABABA -> 200 session issued" || bad "STF-0008 via AA -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-0008 without city (API/legacy caller) -> 200 (contextual rule)" || bad "STF-0008 no-city -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|403" && ok "STF-0007 via ADAMA -> 403 refused (national rule)" || bad "STF-0007 via AD -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-0007 via ADDIS ABABA -> 200 (ministry signs in from capital)" || bad "STF-0007 via AA -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-1001","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-1001 (Adama registrar) -> 200 (city officers unaffected)" || bad "STF-1001 -> $r"

echo "== 3. Branded portals render =="
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/login?slug=adama")
[ "$c" = "200" ] && ok "/login?slug=adama renders (roster defaults to Adama)" || bad "/login?slug=adama -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/login?slug=addis-ababa")
[ "$c" = "200" ] && ok "/login?slug=addis-ababa renders" || bad "/login?slug=addis-ababa -> $c"

echo
echo "RESULT: $pass passed, $failn failed"
[ "$failn" = "0" ]
