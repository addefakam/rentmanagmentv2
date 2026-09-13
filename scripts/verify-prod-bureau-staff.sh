#!/bin/bash
# Task 42 PRODUCTION verification (read-only — no data created).
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"

# --- API: bureau head denied on bogus unit (proves new route live + wall) -----
curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"staffCode":"STF-0005","city":"AA"}' -c "$T/jar-prod42.txt" > "$T/login-prod42.json"
echo "login: $(head -c 140 "$T/login-prod42.json")"
X=$(curl -s -X POST "$BASE/api/staff" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d '{"fullName":"Probe","roleCode":"WOREDA_REGISTRAR","orgUnitId":"prod-fake-unit-id"}')
echo "deny probe: $(echo "$X" | head -c 200)"

# --- browser: AA bureau head ---------------------------------------------------
$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 6
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
echo "AA login url: $($AB get url)"
$AB open "$BASE/settings#staff"
sleep 7
echo "== AA tabs:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.getAttribute('aria-selected')+':'+t.textContent.trim()))" 2>/dev/null
echo "== AA form labels:"
$AB eval "JSON.stringify([...document.querySelectorAll('label')].map(l=>l.textContent.trim()).filter(t=>t&&t.length<70).slice(0,8))" 2>/dev/null
$AB eval "(()=>{const ts=[...document.querySelectorAll('[role=combobox]')];const t=ts.find(x=>x.textContent.includes('select office'))||ts[2];t.click();return 'opened'})()" 2>/dev/null
sleep 2
echo "== AA home office options (first 6):"
$AB eval "JSON.stringify([...document.querySelectorAll('[role=option]')].map(o=>o.textContent.trim()).slice(0,6))" 2>/dev/null
$AB key Escape 2>/dev/null
$AB screenshot /home/z/my-project/download/prod-bureau-head-staff.png 2>/dev/null

# --- regression: NEK city admin still sees staff register ----------------------
$AB open "$BASE/login?city=NEK"
sleep 5
$AB find label "Staff code" fill "STF-2003"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
$AB open "$BASE/settings#staff"
sleep 7
echo "== NEK tabs (CITY_ADMIN):"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()))" 2>/dev/null
$AB screenshot /home/z/my-project/download/prod-nek-cityadmin-staff.png 2>/dev/null
$AB close 2>/dev/null
echo done
