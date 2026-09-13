#!/bin/bash
# Task 47 debug — staff creation API as SYSTEM_ADMIN.
set -u
BASE="http://localhost:3210"
J=/tmp/t47d-cookies.txt

pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/t47d-dev.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; exit 1; }
echo "server up"

echo "--- login STF-0008 ---"
curl -s -c $J -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"staffCode":"STF-0008","city":"AA"}' | head -c 300; echo

echo "--- platform boot: AA-BUREAU entry (raw context) ---"
curl -s -b $J "$BASE/api/platform" | grep -oP '.{80}AA-BUREAU.{120}' | head -2

echo "--- POST /api/staff as STF-0005 (expect 403 staff:manage revoked) ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/staff" \
  -H "Content-Type: application/json" -H "x-staff-code: STF-0005" -H "x-city-code: AA" \
  -d '{"fullName":"X","roleCode":"WOREDA_REGISTRAR","orgUnitId":"00000000-0000-0000-0000-000000000000","language":"en"}'

echo "--- POST /api/staff as STF-0008 without unit (expect validation error, not AUTH_MISSING) ---"
curl -s -X POST "$BASE/api/staff" -H "Content-Type: application/json" \
  -H "x-staff-code: STF-0008" -H "x-city-code: AA" \
  -d '{"fullName":"Probe","roleCode":"CITY_ADMIN"}' | head -c 300; echo
echo "=== debug done ==="
