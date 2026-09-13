#!/bin/bash
# Verify Settings tab reorder: Organization hierarchy first, Staff register second.
# v2 — correct login flow (city picker + staff-code input) & API-created city admin.
set -u
AB="agent-browser"
BASE="http://localhost:3210"

# --- server (re)start: sandbox reaps background processes between calls ------
pkill -f "next-server" 2>/dev/null; pkill -f "next dev" 2>/dev/null; pkill -f "next start" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/next-3210.log 2>&1 < /dev/null &
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"

# --- 0. create an active CITY_ADMIN in AA via API (as SYSTEM_ADMIN) ----------
# /api/platform reads the console session cookie; /api/staff reads x-staff-code.
curl -s -c /tmp/jar8.txt -X POST -H "Content-Type: application/json" \
  -d '{"staffCode":"STF-0008","city":"AA"}' "$BASE/api/auth/login" > /dev/null
BUREAU_ID=$(curl -s -b /tmp/jar8.txt "$BASE/api/platform" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
units=[u for u in d['orgUnits'] if u['tier']=='BUREAU' and u['code'].startswith('AA')]
print(units[0]['id'] if units else '')")
echo "bureau: ${BUREAU_ID:-MISSING}"
NEWADMIN=$(curl -s -X POST -H "x-staff-code: STF-0008" -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Tabs Verify Admin\",\"roleCode\":\"CITY_ADMIN\",\"orgUnitId\":\"$BUREAU_ID\",\"language\":\"en\"}" \
  "$BASE/api/staff" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('data',{}).get('staffCode','') if d.get('ok') else '')")
echo "created city admin: ${NEWADMIN:-FAILED}"

tabs_snapshot () {
  $AB eval "JSON.stringify({
    tabs: Array.from(document.querySelectorAll('[role=tab]')).map(a=>a.textContent.trim()),
    active: document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim() ?? null
  })" 2>/dev/null
}

signin () { # $1 = staff code
  $AB close 2>/dev/null
  $AB set viewport 1440 900
  $AB open "$BASE/login?city=AA"
  sleep 3
  $AB find label "Staff code" fill "$1"
  sleep 1
  $AB find text "Sign in" click
  for i in $(seq 1 10); do
    case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac
  done
  echo "  login url: $($AB get url)"
}

# --- 1. CITY_ADMIN: full order incl. Staff register ---------------------------
echo "== CITY_ADMIN ($NEWADMIN)"
signin "$NEWADMIN"
$AB open "$BASE/settings"
sleep 4
echo "  default   -> $(tabs_snapshot)"
$AB open "$BASE/settings#staff"
sleep 3
echo "  #staff    -> $(tabs_snapshot)"
$AB open "$BASE/settings#org"
sleep 3
echo "  #org      -> $(tabs_snapshot)"
$AB screenshot /home/z/my-project/download/settings-cityadmin-org-first.png 2>/dev/null

# --- 2. REGISTRAR: org on top, NO staff tab -----------------------------------
echo "== REGISTRAR (STF-0001)"
signin "STF-0001"
$AB open "$BASE/settings"
sleep 4
echo "  default   -> $(tabs_snapshot)"

$AB close 2>/dev/null
echo "done"
