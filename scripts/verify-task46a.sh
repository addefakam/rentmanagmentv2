#!/bin/bash
# Task 46 part A recheck — bureau head minimal console (robust login).
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"

UP=0
for i in $(seq 1 20); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
if [ "$UP" != "1" ]; then
  pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
  sleep 1
  cd /home/z/my-project
  setsid nohup npx next dev -p 3210 > /tmp/t46-dev2.log 2>&1 < /dev/null &
  for i in $(seq 1 45); do sleep 2; curl -sf -o /dev/null "$BASE/login" && { UP=1; break; }; done
fi
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; exit 1; }
echo "server up"

$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA" > /dev/null 2>&1
sleep 5
$AB find label "Staff code" fill "STF-0005" > /dev/null 2>&1
sleep 1
$AB find text "Sign in" click > /dev/null 2>&1
for i in $(seq 1 25); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
echo "url: $($AB get url)"
sleep 4

echo "sidebar: $($AB eval "JSON.stringify({
  links: Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href')),
  groups: Array.from(document.querySelectorAll('nav[aria-label=Console] p')).map(p=>p.textContent)
})" 2>/dev/null)"
echo "dashboard: $($AB eval "JSON.stringify({
  sprintExplainer: document.body.innerText.includes('Incremental Module Construction'),
  mgmtReports: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/reports#bureau'),
  mgmtSettings: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/settings#org'),
  chartsSurfaces: document.querySelectorAll('.recharts-surface').length,
  sprintCards: Array.from(document.querySelectorAll('a')).filter(a=>/^\/(parties|properties|registration|rent|complaints|enforcement)$/.test(a.getAttribute('href')||'')).length,
  projectCard: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/project')
})" 2>/dev/null)"
$AB screenshot "$SHOTS/task46-bureau-head-dashboard.png" > /dev/null 2>&1 || true

# direct URL enforcement — ModuleFrame must refuse removed pages
for P in parties properties registration rent complaints enforcement services project; do
  $AB open "$BASE/$P" > /dev/null 2>&1
  sleep 2
  R=$($AB eval "document.body.innerText.includes('Not available for your role')" 2>/dev/null)
  echo "direct /$P refused: $R"
done

# kept pages still open
$AB open "$BASE/reports#bureau" > /dev/null 2>&1
sleep 3
echo "/reports#bureau opens with bureau tab: $($AB eval "document.body.innerText.includes('Bureau reports')" 2>/dev/null)"
$AB open "$BASE/settings#org" > /dev/null 2>&1
sleep 3
echo "/settings#org opens org editor: $($AB eval "document.body.innerText.includes('Organization hierarchy') || document.body.innerText.includes('sub-city')" 2>/dev/null)"
$AB screenshot "$SHOTS/task46-bureau-head-settings.png" > /dev/null 2>&1 || true
echo "=== done ==="
