#!/bin/bash
# Task 47 verification — Registry/Operations/Project tools REMOVED from city level.
# A) fresh AA CITY_ADMIN (created via SYSTEM_ADMIN API): sidebar = Dashboard /
#    Data & Reports / City Settings / Service Catalog; dashboard = 3 management
#    cards; direct desk+project URLs refused; services open.
# B) STF-0005 bureau head: unchanged minimal console.
# C) STF-0003 sub-city officer (AA-BOLE): keeps desk pages (registry lives at
#    sub-city level).
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"
J=/tmp/t47-cookies.txt

pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/t47-dev.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; tail -20 /tmp/t47-dev.log; exit 1; }
echo "server up"

# --- create a fresh AA CITY_ADMIN as SYSTEM_ADMIN (staff:manage) -------------
curl -s -c $J -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"staffCode":"STF-0008","city":"AA"}' > /dev/null
BUREAU_ID=$(curl -s -b $J "$BASE/api/platform" | python3 -c "
import json,sys
d=json.load(sys.stdin)
u=[x for x in d['data']['orgUnits'] if x['code']=='AA-BUREAU']
print(u[0]['id'] if u else '')")
echo "AA-BUREAU id: ${BUREAU_ID:0:12}…"
NEW=$(curl -s -X POST "$BASE/api/staff" -H "Content-Type: application/json" \
  -H "x-staff-code: STF-0008" -H "x-city-code: AA" \
  -d "{\"fullName\":\"T47 City Admin\",\"roleCode\":\"CITY_ADMIN\",\"orgUnitId\":\"$BUREAU_ID\",\"language\":\"en\"}")
CA_CODE=$(echo "$NEW" | grep -oP 'STF-[0-9]+' | head -1)
echo "new city admin: $CA_CODE  (resp head: $(echo "$NEW" | head -c 120))"
[ -n "$CA_CODE" ] || { echo "CITY ADMIN CREATION FAILED"; exit 1; }

$AB close 2>/dev/null
$AB set viewport 1440 900

login_as() { # $1=city $2=code
  $AB open "$BASE/login?city=$1" > /dev/null 2>&1
  sleep 4
  $AB find label "Staff code" fill "$2" > /dev/null 2>&1
  sleep 1
  $AB find text "Sign in" click > /dev/null 2>&1
  for i in $(seq 1 25); do
    sleep 2
    U=$($AB get url 2>/dev/null)
    case "$U" in *"/login"*) ;; *) break ;; esac
  done
  # wait for the console nav to actually render (first compile can be slow)
  for i in $(seq 1 12); do
    N=$($AB eval "document.querySelectorAll('nav[aria-label=Console] a').length" 2>/dev/null)
    [ "$N" != "0" ] && [ -n "$N" ] && break
    sleep 2
  done
  sleep 2
}
nav_state() {
  $AB eval "JSON.stringify({
    groups: Array.from(document.querySelectorAll('nav[aria-label=Console] > div > p')).map(p=>p.textContent).filter(t=>['Overview','Registry','Operations','Insights','Administration','Project tools'].includes(t)),
    links: Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href'))
  })" 2>/dev/null
}

echo "=== A) NEW CITY ADMIN ($CA_CODE @AA) ==="
login_as "AA" "$CA_CODE"
echo "url: $($AB get url)"
echo "nav: $(nav_state)"
echo "dashboard: $($AB eval "JSON.stringify({
  explainer: document.body.innerText.includes('Incremental Module Construction'),
  cards: Array.from(document.querySelectorAll('main a')).filter(a=>['/settings#org','/reports#bureau','/services'].includes(a.getAttribute('href'))).map(a=>a.getAttribute('href')),
  chartsSurfaces: document.querySelectorAll('.recharts-surface').length,
  projectCard: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/project')
})" 2>/dev/null)"
for P in parties properties registration rent complaints enforcement project; do
  $AB open "$BASE/$P" > /dev/null 2>&1
  sleep 2
  echo "direct /$P refused: $($AB eval "document.body.innerText.includes('Not available for your role')" 2>/dev/null)"
done
$AB open "$BASE/services" > /dev/null 2>&1
sleep 2
echo "/services opens: $($AB eval "!document.body.innerText.includes('Not available for your role')" 2>/dev/null)"
$AB open "$BASE/" > /dev/null 2>&1
sleep 3
$AB screenshot "$SHOTS/task47-city-admin.png" > /dev/null 2>&1 || true

echo "=== B) BUREAU HEAD (STF-0005) — unchanged ==="
login_as "AA" "STF-0005"
echo "nav: $(nav_state)"

echo "=== C) SUB-CITY OFFICER (STF-0003 @AA-BOLE) — keeps desk pages ==="
login_as "AA" "STF-0003"
echo "nav: $(nav_state)"
$AB screenshot "$SHOTS/task47-subcity-officer.png" > /dev/null 2>&1 || true
echo "=== done ==="
