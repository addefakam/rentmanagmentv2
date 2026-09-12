#!/usr/bin/env bash
# Verification: the SEPARATE super-user portal (/admin) — owner directive.
# The dedicated URL serves ONLY the System Super User (STF-0008, SYSTEM_ADMIN)
# bound to Addis Ababa; every other officer is refused; the public /login
# stays untouched; no roster, codes or links leak from the page.
# Usage: bash scripts/verify-super-admin-portal.sh <base_url>
set -u
BASE="${1:-http://localhost:3210}"
JAR="/tmp/rc_super_portal.jar"
rm -f "$JAR"

pass=0; failn=0
ok()  { echo "  PASS: $1"; pass=$((pass+1)); }
bad() { echo "  FAIL: $1"; failn=$((failn+1)); }

echo "== 1. The separate URL itself (GET /admin) =="
c=$(curl -s -o /tmp/rc_admin_page.html -w "%{http_code}" "$BASE/admin")
[ "$c" = "200" ] && ok "/admin renders (200)" || bad "/admin -> $c"
grep -q "System Administration" /tmp/rc_admin_page.html && ok "page identifies as System Administration" || bad "page title missing"
grep -q "STF-0008" /tmp/rc_admin_page.html && bad "page LEAKS the super-user staff code" || ok "no super-user code on the page"
grep -qi "demo codes" /tmp/rc_admin_page.html && bad "page still shows demo hints" || ok "no demo-code hints"
grep -qE 'href="/admin"|href=\{?"/admin' /tmp/rc_admin_page.html && bad "self-link present (should be none)" || ok "no self-referential link"
PUB=$(curl -s "$BASE/login")
echo "$PUB" | grep -qE 'href="/admin"|href=\{?"/admin' && bad "public /login LINKS to the discreet /admin URL" || ok "public /login does not link /admin (discreet)"
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/auth/super")
[ "$c" = "405" ] || [ "$c" = "404" ] && ok "GET /api/auth/super refused ($c — POST-only surface)" || bad "GET /api/auth/super -> $c"

echo "== 2. Super-user enforcement (POST /api/auth/super) =="
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008"}' "$BASE/api/auth/super")
echo "$r" | grep -q "|200" && ok "STF-0008 (System Super User) -> 200 session issued" || bad "STF-0008 -> $r"
echo "$r" | grep -q '"cityCode":"AA"' && ok "session is bound to the Addis Ababa administration" || bad "session city not AA: $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007"}' "$BASE/api/auth/super")
echo "$r" | grep -q "|403" && ok "STF-0007 (ministry analyst, national) -> 403 super-user only" || bad "STF-0007 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0001"}' "$BASE/api/auth/super")
echo "$r" | grep -q "|403" && ok "STF-0001 (AA woreda registrar) -> 403" || bad "STF-0001 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-1001"}' "$BASE/api/auth/super")
echo "$r" | grep -q "|401" && ok "STF-1001 (purged Adama officer) -> 401 unknown code" || bad "STF-1001 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-9999"}' "$BASE/api/auth/super")
echo "$r" | grep -q "|401" && ok "STF-9999 (never existed) -> 401" || bad "STF-9999 -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{}' "$BASE/api/auth/super")
echo "$r" | grep -q "|400" && ok "empty body -> 400 staff code required" || bad "empty body -> $r"

echo "== 3. The issued session is a real console session =="
curl -s -c "$JAR" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008"}' "$BASE/api/auth/super" > /dev/null
grep -q "rc_officer" "$JAR" && ok "rc_officer cookie issued by the portal" || bad "no rc_officer cookie in jar"
c=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/platform/management")
[ "$c" = "200" ] && ok "cookie opens /platform/management (National Management center)" || bad "/platform/management with cookie -> $c"
c=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/platform/cities")
[ "$c" = "200" ] && ok "cookie still opens /platform/cities (City Management)" || bad "/platform/cities with cookie -> $c"
c=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE/")
[ "$c" = "200" ] && ok "cookie opens the console home" || bad "/ with cookie -> $c"
r=$(curl -s -b "$JAR" -H "x-staff-code: STF-0008" "$BASE/api/cities")
echo "$r" | grep -q '"ok":true' && ok "fleet API works for the portal session" || bad "fleet API -> ${r:0:120}"
r=$(curl -s -b "$JAR" -H "x-staff-code: STF-0008" "$BASE/api/national")
echo "$r" | grep -q '"scope":"SYSTEM_ADMIN"' && ok "national management API answers the portal session" || bad "national API -> ${r:0:120}"

echo "== 4. Regression — public sign-in paths untouched =="
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "public login still accepts STF-0008 from Addis Ababa" || bad "STF-0008 via /api/auth/login AA -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008","city":"AD"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|403" && ok "national rule intact: STF-0008 via removed-city context still 403" || bad "STF-0008 via AD -> $r"
r=$(curl -s -w "|%{http_code}" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007","city":"AA"}' "$BASE/api/auth/login")
echo "$r" | grep -q "|200" && ok "ministry analyst still signs in from the public AA portal" || bad "STF-0007 via AA -> $r"

echo
echo "RESULT: $pass passed, $failn failed"
[ "$failn" = "0" ]
