#!/bin/bash
# PRODUCTION verification — Settings tab reorder (org first, staff second).
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"

tabs_snapshot () {
  $AB eval "JSON.stringify({
    tabs: Array.from(document.querySelectorAll('[role=tab]')).map(a=>a.textContent.trim()),
    active: document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim() ?? null
  })" 2>/dev/null
}

signin () { # $1 = staff code, $2 = city
  $AB close 2>/dev/null
  $AB set viewport 1440 900
  $AB open "$BASE/login?city=$2"
  sleep 4
  $AB find label "Staff code" fill "$1"
  sleep 1
  $AB find text "Sign in" click
  for i in $(seq 1 12); do
    case "$($AB get url 2>/dev/null)" in */login*) sleep 3 ;; *) break ;; esac
  done
  echo "  login url: $($AB get url)"
}

echo "== NEKEMTE CITY_ADMIN (STF-2003) on production =="
signin "STF-2003" "NEK"
$AB open "$BASE/settings"
sleep 5
echo "  default -> $(tabs_snapshot)"
$AB open "$BASE/settings#staff"
sleep 4
echo "  #staff  -> $(tabs_snapshot)"
$AB screenshot /home/z/my-project/download/prod-settings-nek-org-first.png 2>/dev/null

echo "== AA BUREAU_HEAD (STF-0005) on production =="
signin "STF-0005" "AA"
$AB open "$BASE/settings"
sleep 5
echo "  default -> $(tabs_snapshot)"

$AB close 2>/dev/null
echo "done"
