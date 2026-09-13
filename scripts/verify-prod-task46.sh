#!/bin/bash
# Task 46 PRODUCTION verification (read-only — no data created).
# A) AA bureau head STF-0005: sidebar exactly 3 links; dashboard = KPI + charts +
#    2 management cards; direct removed pages refused; kept pages open.
# B) NEK city admin STF-2003: regression — wide sidebar unchanged.
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
SHOTS="/home/z/my-project/download"

$AB close 2>/dev/null
$AB set viewport 1440 900

login_prod() { # $1=city  $2=staffCode
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
  sleep 4
}

sidebar() {
  $AB eval "JSON.stringify({
    links: Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href')),
    groups: Array.from(document.querySelectorAll('nav[aria-label=Console] p')).map(p=>p.textContent)
  })" 2>/dev/null
}

echo "=== A) AA CITY BUREAU HEAD (STF-0005) ==="
login_prod "AA" "STF-0005"
echo "url: $($AB get url)"
echo "sidebar: $(sidebar)"
echo "dashboard: $($AB eval "JSON.stringify({
  sprintExplainer: document.body.innerText.includes('Incremental Module Construction'),
  mgmtReports: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/reports#bureau'),
  mgmtSettings: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/settings#org'),
  chartsSurfaces: document.querySelectorAll('.recharts-surface').length,
  deskCards: Array.from(document.querySelectorAll('a')).filter(a=>/^\/(parties|properties|registration|rent|complaints|enforcement)$/.test(a.getAttribute('href')||'')).length,
  projectCard: !!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/project')
})" 2>/dev/null)"
$AB screenshot "$SHOTS/prod-task46-bureau-head.png" > /dev/null 2>&1 || true
$AB open "$BASE/parties" > /dev/null 2>&1
sleep 3
echo "direct /parties refused: $($AB eval "document.body.innerText.includes('Not available for your role')" 2>/dev/null)"
$AB open "$BASE/reports#bureau" > /dev/null 2>&1
sleep 3
echo "/reports#bureau bureau tab: $($AB eval "document.body.innerText.includes('Bureau reports')" 2>/dev/null)"
$AB open "$BASE/settings#org" > /dev/null 2>&1
sleep 3
echo "/settings#org sub-city mgmt: $($AB eval "/sub-city/i.test(document.body.innerText)" 2>/dev/null)"
$AB screenshot "$SHOTS/prod-task46-bureau-head-settings.png" > /dev/null 2>&1 || true

echo "=== B) NEK CITY ADMIN (STF-2003) — regression, wide console ==="
login_prod "NEK" "STF-2003"
echo "url: $($AB get url)"
echo "sidebar: $(sidebar)"
$AB screenshot "$SHOTS/prod-task46-nek-cityadmin.png" > /dev/null 2>&1 || true

echo "=== done ==="
