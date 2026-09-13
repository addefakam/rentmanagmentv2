#!/bin/bash
# Task 43 PRODUCTION verification (read-only; deny probes write nothing).
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"
api() { curl -s -X "$1" "$BASE$2" -H 'Content-Type: application/json' ${3:+-d "$3"} ${4:+-H "x-staff-code: $4"}; }
login() { curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"staffCode\":\"$1\",\"city\":\"$2\"}" -c "$3" > /dev/null; }

login STF-0005 AA "$T/jar-p43.txt"
curl -s -b "$T/jar-p43.txt" "$BASE/api/platform" -o "$T/boot-p43.json"
BOLE_ID=$(python3 -c "import json;d=json.load(open('$T/boot-p43.json'))['data'];print(next(u['id'] for u in d['orgUnits'] if u['code']=='AA-BOLE'))")
echo "prod AA-BOLE: $BOLE_ID"
echo "-- deny: bureau head woreda:"; api POST /api/org-units "{\"tier\":\"WOREDA\",\"parentId\":\"$BOLE_ID\",\"code\":\"PROBE-X1\",\"nameEn\":\"Probe\"}" STF-0005 | head -c 180; echo
echo "-- deny: bureau head staff:"; api POST /api/staff "{\"fullName\":\"Probe\",\"roleCode\":\"BUREAU_ANALYST\",\"orgUnitId\":\"$BOLE_ID\"}" STF-0005 | head -c 180; echo

echo "-- sub-city officer STF-0003 (AA-BOLE) boot scope:"
login STF-0003 AA "$T/jar-p43mon.txt"
curl -s -b "$T/jar-p43mon.txt" "$BASE/api/platform" -o "$T/boot-p43mon.json"
python3 -c "
import json
d=json.load(open('$T/boot-p43mon.json'))['data']
units=[u['code'] for u in d['orgUnits']]
print('units:', units[:4], '... total', len(units))
print('all inside AA-BOLE subtree:', all(u.startswith('AA-BOLE') for u in units))
print('staff orgs:', sorted({s['orgUnit']['code'] for s in d['staff']}))"
echo "-- deny: officer staff at another sub-city:"
OTHER_ID=$(python3 -c "import json;d=json.load(open('$T/boot-p43.json'))['data'];print(next(u['id'] for u in d['orgUnits'] if u['code']=='AA-ARADA'))")
api POST /api/staff "{\"fullName\":\"Probe\",\"roleCode\":\"WOREDA_REGISTRAR\",\"orgUnitId\":\"$OTHER_ID\"}" STF-0003 | head -c 200; echo

$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"; sleep 6
$AB find label "Staff code" fill "STF-0005"; sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
$AB open "$BASE/settings#org"; sleep 7
echo "BH tabs: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()))" 2>/dev/null)"
echo "BH heading: $($AB eval "(()=>{const p=[...document.querySelectorAll('p')].find(x=>x.textContent.includes('Found a new sub-city'));return p?p.textContent.slice(0,60):'MISSING'})()" 2>/dev/null)"
$AB screenshot /home/z/my-project/download/prod-task43-bureau-head.png 2>/dev/null

$AB open "$BASE/login?city=AA"; sleep 6
$AB find label "Staff code" fill "STF-0003"; sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
$AB open "$BASE/settings#org"; sleep 7
echo "MON tabs: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()))" 2>/dev/null)"
echo "MON org rows: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,44)))" 2>/dev/null)"
$AB screenshot /home/z/my-project/download/prod-task43-subcity-officer.png 2>/dev/null
$AB close 2>/dev/null
echo done
