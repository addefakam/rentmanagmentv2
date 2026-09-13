#!/usr/bin/env bash
# Local verification of the single-admin city-management change.
# Usage: bash scripts/verify-single-admin.mjs.sh <base_url>
set -u
BASE="${1:-http://localhost:3210}"
JAR8="/tmp/rc_stf0008.jar"
JAR7="/tmp/rc_stf0007.jar"
rm -f "$JAR8" "$JAR7"

pass=0; failn=0
ok()  { echo "  PASS: $1"; pass=$((pass+1)); }
bad() { echo "  FAIL: $1"; failn=$((failn+1)); }

echo "== 1. Sign in locally (demo passwordless) =="
code8=$(curl -s -o /tmp/login8.json -w "%{http_code}" -c "$JAR8" -H "Content-Type: application/json" -d '{"staffCode":"STF-0008"}' "$BASE/api/auth/login")
code7=$(curl -s -o /tmp/login7.json -w "%{http_code}" -c "$JAR7" -H "Content-Type: application/json" -d '{"staffCode":"STF-0007"}' "$BASE/api/auth/login")
[ "$code8" = "200" ] && ok "STF-0008 login 200" || bad "STF-0008 login -> $code8 $(cat /tmp/login8.json | head -c 200)"
[ "$code7" = "200" ] && ok "STF-0007 login 200" || bad "STF-0007 login -> $code7 $(cat /tmp/login7.json | head -c 200)"

echo "== 2. API layer: city:admin (fleet read) =="
r=$(curl -s -H "x-staff-code: STF-0008" "$BASE/api/cities")
echo "$r" | head -c 80 | grep -q '"ok":true' && ok "STF-0008 GET /api/cities -> ok (fleet table)" || bad "STF-0008 GET /api/cities -> $(echo "$r" | head -c 200)"
r=$(curl -s -H "x-staff-code: STF-0007" "$BASE/api/cities")
echo "$r" | grep -q 'AUTH_FORBIDDEN' && ok "STF-0007 GET /api/cities -> 403 AUTH_FORBIDDEN (removed)" || bad "STF-0007 GET /api/cities -> $(echo "$r" | head -c 200)"

echo "== 3. API layer: city:manage (city settings PATCH) =="
r=$(curl -s -X PATCH -H "x-staff-code: STF-0007" -H "Content-Type: application/json" -d '{"cityCode":"AA","appealDays":"15"}' "$BASE/api/settings")
echo "$r" | grep -q 'AUTH_FORBIDDEN' && ok "STF-0007 PATCH /api/settings -> 403 (city:manage removed)" || bad "STF-0007 PATCH /api/settings -> $(echo "$r" | head -c 200)"

echo "== 4. API layer: city:write stays SYSTEM_ADMIN-only =="
r=$(curl -s -X PATCH -H "x-staff-code: STF-0007" -H "Content-Type: application/json" -d '{"cityCode":"AA","isActive":true}' "$BASE/api/cities")
echo "$r" | grep -q 'AUTH_FORBIDDEN' && ok "STF-0007 lifecycle PATCH /api/cities -> 403" || bad "STF-0007 lifecycle PATCH -> $(echo "$r" | head -c 200)"

echo "== 5. Pages: redirects + guards (cookie sessions) =="
loc=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -b "$JAR8" "$BASE/cities")
echo "$loc" | grep -q "platform/cities" && ok "GET /cities as STF-0008 -> $loc" || bad "GET /cities as STF-0008 -> $loc"
loc=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -b "$JAR8" "$BASE/platform")
echo "$loc" | grep -q "platform/cities" && ok "GET /platform as STF-0008 -> $loc" || bad "GET /platform as STF-0008 -> $loc"
c=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR8" "$BASE/platform/cities")
[ "$c" = "200" ] && ok "GET /platform/cities as STF-0008 -> 200" || bad "GET /platform/cities as STF-0008 -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR7" "$BASE/platform/cities")
[ "$c" = "200" ] && ok "GET /platform/cities as STF-0007 -> 200 (shell blocks client-side)" || bad "GET /platform/cities as STF-0007 -> $c"

echo "== 6. No-break: analyst ministry surfaces still work =="
r=$(curl -s -b "$JAR7" "$BASE/api/platform")
echo "$r" | head -c 80 | grep -q '"ok":true' && ok "STF-0007 boot /api/platform -> ok (console intact)" || bad "STF-0007 boot -> $(echo "$r" | head -c 200)"
c=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR7" "$BASE/reports")
[ "$c" = "200" ] && ok "STF-0007 /reports page -> 200 (analytics intact)" || bad "STF-0007 /reports -> $c"
c=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR7" "$BASE/settings")
[ "$c" = "200" ] && ok "STF-0007 /settings page -> 200 (shell blocks client-side)" || bad "STF-0007 /settings -> $c"

echo
echo "RESULT: $pass passed, $failn failed"
[ "$failn" = "0" ]
