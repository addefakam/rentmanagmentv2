#!/bin/bash
# Task 46 browser verification — city bureau head MINIMAL console.
# A) bureau head (STF-0005): sidebar exactly 3 links (Dashboard / Data & Reports /
#    City Settings); no Registry/Operations/Project groups; dashboard shows the two
#    management cards (no sprint grid, no project card); direct /parties refused.
# B) registrar (STF-0001): sidebar unchanged (7 desk links + Data & Reports);
#    dashboard keeps the sprint grid (project card now RBAC-gated away).
# C) sub-city officer (STF-2004): sidebar keeps his desk + settings links.
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"

# --- server restart: sandbox reaps background processes between calls --------
pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/t46-dev.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; tail -20 /tmp/t46-dev.log; exit 1; }
echo "server up"

login_as() {
  $AB open "$BASE/login?city=AA" > /dev/null 2>&1
  sleep 2
  $AB find label "Staff code" fill "$1" > /dev/null 2>&1
  sleep 1
  $AB find text "Sign in" click > /dev/null 2>&1
  for i in $(seq 1 15); do
    sleep 2
    U=$($AB get url 2>/dev/null)
    case "$U" in *"/login"*) ;; *) break ;; esac
  done
  sleep 3
}

sidebar_state() {
  $AB eval "JSON.stringify({
    links: Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href')),
    groups: Array.from(document.querySelectorAll('nav[aria-label=Console] p')).map(p=>p.textContent)
  })" 2>/dev/null
}

$AB close 2>/dev/null
$AB set viewport 1440 900

echo "=== A) CITY BUREAU HEAD (STF-0005) — minimal console ==="
login_as "STF-0005"
echo "url: $($AB get url)"
echo "sidebar: $(sidebar_state)"
DASH=$($AB eval "JSON.stringify({
  sprintExplainer: document.body.innerText.includes('Incremental Module Construction'),
  mgmtReports: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/reports#bureau'),
  mgmtSettings: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/settings#org'),
  chartsSurfaces: document.querySelectorAll('.recharts-surface').length,
  sprintCards: Array.from(document.querySelectorAll('a')).filter(a=>/^\/(parties|properties|registration|rent|complaints|enforcement)$/.test(a.getAttribute('href')||'')).length,
  projectCard: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/project')
})" 2>/dev/null)
echo "dashboard: $DASH"
$AB open "$BASE/parties" > /dev/null 2>&1
sleep 3
echo "direct /parties refused: $($AB eval "document.body.innerText.includes('Not available for your role')" 2>/dev/null)"
$AB screenshot "$SHOTS/task46-bureau-head-sidebar.png" > /dev/null 2>&1 || true

echo "=== B) WOREDA REGISTRAR (STF-0001) — regression, untouched ==="
login_as "STF-0001"
echo "url: $($AB get url)"
echo "sidebar: $(sidebar_state)"
DASH2=$($AB eval "JSON.stringify({
  sprintCards: Array.from(document.querySelectorAll('a')).filter(a=>/^\/(parties|properties|registration|rent|complaints|enforcement|reports)$/.test(a.getAttribute('href')||'')).length,
  projectCard: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/project'),
  explainer: document.body.innerText.includes('Incremental Module Construction')
})" 2>/dev/null)
echo "dashboard: $DASH2"
$AB screenshot "$SHOTS/task46-registrar-sidebar.png" > /dev/null 2>&1 || true

echo "=== C) SUB-CITY OFFICER (STF-2004) — regression ==="
login_as "STF-2004"
echo "url: $($AB get url)"
echo "sidebar: $(sidebar_state)"
$AB screenshot "$SHOTS/task46-subcity-officer-sidebar.png" > /dev/null 2>&1 || true

echo "=== done ==="
