#!/bin/bash
# Task 42 follow-up: Home office tier-grouped options (radix portal) + cross-city denial.
set -u
AB="agent-browser"
BASE="http://localhost:3210"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"

# --- cross-city / bogus-unit denial -------------------------------------------
curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"staffCode":"STF-0005","city":"AA"}' -c "$T/jar43.txt" > /dev/null
X=$(curl -s -X POST "$BASE/api/staff" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d '{"fullName":"Cross City Probe","roleCode":"WOREDA_REGISTRAR","orgUnitId":"cmtzFAKE0000ngng000fake00"}')
echo "bogus-unit staff (expect deny): $(echo "$X" | head -c 220)"

# --- browser: open the Home office radix select and read its options ----------
$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 4
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 10); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
$AB open "$BASE/settings#staff"
sleep 5
echo "== form labels:"
$AB eval "JSON.stringify([...document.querySelectorAll('#staff,label')].map(l=>l.textContent.trim()).filter(t=>t&&t.length<70).slice(0,10))" 2>/dev/null
# triggers: Role(1) Home office(2) Language(3)
$AB eval "(()=>{const ts=[...document.querySelectorAll('[role=combobox]')];if(ts.length<2)return 'TRIGGERS:'+ts.length;ts[1].click();return 'opened'})()" 2>/dev/null
sleep 2
echo "== home office options:"
$AB eval "JSON.stringify([...document.querySelectorAll('[role=option]')].map(o=>o.textContent.trim()).slice(0,14))" 2>/dev/null
$AB key Escape 2>/dev/null
$AB screenshot /home/z/my-project/download/settings-bureau-head-staff-form.png 2>/dev/null
$AB close 2>/dev/null
echo done
