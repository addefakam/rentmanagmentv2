#!/bin/bash
# Task 37b browser verification — link-first IA across the entire system.
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"

# --- server (re)start: sandbox reaps background processes between calls ------
pkill -f "next start" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next start -p 3210 > /tmp/next-3210.log 2>&1 < /dev/null &
sleep 7
echo "server: $(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"

$AB close 2>/dev/null
$AB set viewport 1440 900

# --- sign in as a woreda registrar (STF-0001, city tier) ---------------------
$AB open $BASE/login
sleep 2
$AB find label "Staff code" fill "STF-0001"
sleep 1
$AB find text "Sign in" click
sleep 3
echo "after-login url: $($AB get url)"

# --- census helper: tabs + their labels + hash deep-link behavior -----------
census () {
  local url="$1"; local label="$2"; local deep="$3"
  $AB open "$url"
  sleep 2.5
  local n; n=$($AB eval "document.querySelectorAll('[role=tab]').length" 2>/dev/null)
  local labels; labels=$($AB eval "Array.from(document.querySelectorAll('[role=tab]')).map(a=>a.textContent.trim()).join(' | ')" 2>/dev/null)
  echo "CENSUS $label -> tabs=$n labels=[$labels]"
  if [ -n "$deep" ]; then
    $AB open "$url#$deep"
    sleep 2
    local active; active=$($AB eval "Array.from(document.querySelectorAll('[role=tab]')).find(a=>a.getAttribute('aria-selected')==='true')?.textContent.trim() ?? 'NONE'" 2>/dev/null)
    echo "  deep-link #$deep -> active tab: $active"
  fi
}

census $BASE/parties "parties" "register"
census $BASE/properties "properties" "contract"
census $BASE/registration "registration" "registrar"
census $BASE/rent "rent" "payments"
census $BASE/complaints "complaints" "deadlines"
census $BASE/enforcement "enforcement" "penalties"
census $BASE/reports "reports" "analytics"
census $BASE/project "project(evidence)" "promotion"
census $BASE/project/testing "project/testing" "testing"
census $BASE/project/uat "project/uat" "gate"
census $BASE/project/pilot "project/pilot" "pilot"
census $BASE/project/golive "project/golive" "waves"

# --- functional click: /rent -> click the Payments tab -----------------------
$AB open $BASE/rent
sleep 2.5
$AB find text "Payments ledger" click
sleep 1.5
echo "rent after click: url=$($AB get url)"
$AB eval "document.querySelector('h2')?.textContent ?? ''" 2>/dev/null | head -1
echo "rent payments visible: $($AB eval "document.body.innerText.includes('M6 · Payment ledger') ? 'YES' : 'NO'" 2>/dev/null)"

# --- screenshots --------------------------------------------------------------
$AB open $BASE/rent#payments; sleep 2.5
$AB screenshot --full "$SHOTS/ia-city-rent-tabs.png" >/dev/null && echo "shot: ia-city-rent-tabs.png"
$AB open $BASE/complaints; sleep 2.5
$AB screenshot --full "$SHOTS/ia-city-complaints-tabs.png" >/dev/null && echo "shot: ia-city-complaints-tabs.png"
$AB open $BASE/; sleep 3
$AB screenshot --full "$SHOTS/ia-city-dashboard.png" >/dev/null && echo "shot: ia-city-dashboard.png"

# --- bureau head: /settings tabs (no staff tab expected) ---------------------
$AB find text "Sign out" click 2>/dev/null
sleep 2
$AB open $BASE/login
sleep 2
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
sleep 3
census $BASE/settings "settings(bureau head)" "ladder"
n=$($AB eval "Array.from(document.querySelectorAll('[role=tab]')).map(a=>a.textContent.trim()).join(' | ')" 2>/dev/null)
echo "settings tabs: [$n]"
echo "staff-tab present (expect NO for bureau head): $($AB eval "Array.from(document.querySelectorAll('[role=tab]')).some(a=>a.textContent.includes('Staff')) ? 'YES' : 'NO'" 2>/dev/null)"
$AB open $BASE/settings#ladder; sleep 2.5
$AB screenshot --full "$SHOTS/ia-city-settings-tabs.png" >/dev/null && echo "shot: ia-city-settings-tabs.png"

# --- super user: /admin -> /platform/cities tabs ------------------------------
$AB find text "Sign out" click 2>/dev/null
sleep 2
$AB open $BASE/admin
sleep 2
$AB find label "Staff code" fill "STF-0008"
sleep 1
$AB find text "Sign in" click
sleep 3
census $BASE/platform/cities "platform/cities(super user)" "onboard"
census $BASE/platform/management "platform/management(super user)" "regulations"
$AB open $BASE/platform/cities#onboard; sleep 2.5
$AB screenshot --full "$SHOTS/ia-platform-cities-tabs.png" >/dev/null && echo "shot: ia-platform-cities-tabs.png"

echo "=== page errors ==="
$AB errors 2>/dev/null | head -5
$AB close 2>/dev/null
echo "DONE"
