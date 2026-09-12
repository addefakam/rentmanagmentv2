#!/usr/bin/env bash
# Verification: Adama City Administration ("AD") is removed from the system
# ENTIRELY (owner directive) — no tenant, no org tree, no officers, no
# branding, no data anywhere — while Addis Ababa and the national accounts
# keep working untouched.
# Usage: bash scripts/verify-adama-removed.sh <base_url>
set -u
BASE="${1:-http://localhost:3210}"
JAR8="/tmp/rc_stf0008_removal.jar"
rm -f "$JAR8"

pass=0; failn=0
ok()  { echo "  PASS: $1"; pass=$((pass+1)); }
bad() { echo "  FAIL: $1"; failn=$((failn+1)); }

echo "== 1. Login directory (/api/auth/staff) =="
DIR=$(curl -s "$BASE/api/auth/staff")
echo "$DIR" | grep -q '"cityCode":"AD"' && bad "city list STILL OFFERS Adama" || ok "Adama is not in the city list"
echo "$DIR" | grep -q '"cityCode":"AA"' && ok "Addis Ababa still in the city list" || bad "AA missing from city list"
AD=$(curl -s "$BASE/api/auth/staff?city=AD")
echo "$AD" | grep -q '"STF-' && bad "AD roster still returns officers" || ok "AD roster is empty (city does not exist)"
AA=$(curl -s "$BASE/api/auth/staff?city=AA")
echo "$AA" | grep -q '"STF-0008"' && ok "AA roster keeps STF-0008 (system admin)" || bad "AA roster lost STF-0008"
echo "$AA" | grep -q '"STF-0007"' && ok "AA roster keeps STF-0007 (ministry analyst)" || bad "AA roster lost STF-0007"

echo "== 2. Sign-in enforcement (POST /api/auth/login) =="
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-1001","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|401" && ok "STF-1001 (ex-Adama registrar) -> 401 unknown staff code" || bad "STF-1001 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-1005","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|401" && ok "STF-1005 (ex-Adama bureau head) -> 401 unknown staff code" || bad "STF-1005 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-0008 via ADDIS ABABA -> 200 session issued" || bad "STF-0008 via AA -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "STF-0007 via ADDIS ABABA -> 200" || bad "STF-0007 via AA -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|403" && ok "STF-0008 via ADAMA context -> still refused 403 (national rule)" || bad "STF-0008 via AD -> $r"

echo "== 3. White-label branding (tenant gone = 404) =="
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tenant/branding?slug=adama")
[ "$c" = "404" ] && ok "?slug=adama branding -> 404 (tenant removed)" || bad "?slug=adama -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tenant/branding?city=AD")
[ "$c" = "404" ] && ok "?city=AD branding -> 404" || bad "?city=AD -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tenant/branding?slug=addis-ababa")
[ "$c" = "200" ] && ok "?slug=addis-ababa branding -> 200" || bad "?slug=addis-ababa -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/login?slug=adama")
[ "$c" = "200" ] && ok "/login?slug=adama renders safely on default branding (no crash)" || bad "/login?slug=adama -> $c"

echo "== 4. Fleet table and console switcher (system admin view) =="
curl -s -c "$JAR8" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008"}' "$BASE/api/auth/login" > /dev/null
r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/cities")
echo "$r" | grep -q '"cityCode":"AD"' && bad "fleet table STILL LISTS Adama" || ok "fleet table has no Adama row"
echo "$r" | grep -q '"cityCode":"AA"' && ok "fleet table still lists Addis Ababa" || bad "fleet table lost AA"
r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/platform")
echo "$r" | grep -q '"cityCode":"AD"' && bad "console switcher STILL OFFERS Adama" || ok "console switcher has no Adama"

echo
echo "RESULT: $pass passed, $failn failed"
[ "$failn" = "0" ]
