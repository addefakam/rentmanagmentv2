#!/bin/bash
# Task 44 PRODUCTION verification — read-only; mutating probes are designed
# to FAIL before any write (deny rules), so production data is untouched.
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"
PASS=0; FAIL=0
chk() { if [ "$1" = "$2" ]; then echo "  PASS: $3"; PASS=$((PASS+1)); else echo "  FAIL: $3 (want [$2] got [$1])"; FAIL=$((FAIL+1)); fi; }
has() { case "$1" in *"$2"*) return 0 ;; *) return 1 ;; esac; }

echo "== 1. GET /api/reports/bureau as AA BUREAU_HEAD (read-only)"
code=$(curl -s "$BASE/api/reports/bureau" -H "x-staff-code: STF-0005" -o "$T/prod44-rep.json" -w '%{http_code}')
chk "$code" "200" "bureau head reads the city report suite (200)"
node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/prod44-rep.json","utf8"));
const d=j.data;
console.log(JSON.stringify({
  city:d.cityCode, subs:d.totals.subCities, woredas:d.totals.woredas,
  staffRows:d.staffing.length, woredaRows:d.woredaRows.length,
  noOfficer:d.totals.subCitiesWithoutOfficer, props:d.totals.properties, files:d.totals.files,
  bole:d.staffing.find(s=>s.subCityCode==="AA-BOLE")
}));
' > "$T/prod44-rep.chk"
cat "$T/prod44-rep.chk"
chk "$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/prod44-rep.chk","utf8"));console.log(j.city==="AA"&&j.subs===j.staffRows&&j.woredas===j.woredaRows)')" "true" "suite aggregates the whole city (AA: sub-cities and woredas fully covered)"
chk "$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/prod44-rep.chk","utf8"));console.log(j.bole? (j.bole.officer? "officer-listed":"no-officer") : "missing")')" "officer-listed" "staffing report lists AA-BOLE's responsible officer"

echo "== 2. deny probes (read-only)"
code=$(curl -s "$BASE/api/reports/bureau" -H "x-staff-code: STF-0003" -o "$T/prod44-d1.json" -w '%{http_code}')
chk "$code" "403" "sub-city officer denied reports:bureau (403)"
code=$(curl -s "$BASE/api/reports/bureau" -H "x-staff-code: STF-0001" -o /dev/null -w '%{http_code}')
chk "$code" "403" "woreda registrar denied reports:bureau (403)"

echo "== 3. manager-appointment deny probes (all fail BEFORE any write)"
code=$(curl -s -X POST "$BASE/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0003" -d '{"orgUnitId":"x"}' -o "$T/prod44-m1.json" -w '%{http_code}')
chk "$code" "403" "sub-city officer cannot appoint sub-city officers (403)"
code=$(curl -s -X POST "$BASE/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d '{"orgUnitId":"prod-fake","fullName":"Probe"}' -o "$T/prod44-m2.json" -w '%{http_code}')
has "$(cat "$T/prod44-m2.json")" "AUTH_CITY_SCOPE" && r=true || r=false
chk "$r" "true" "bogus unit refused by the city wall"
BOLE_UNIT=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/prod44-rep.chk","utf8"));console.log("")')
curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"staffCode":"STF-0005","city":"AA"}' -c "$T/jar-prod44.txt" -o /dev/null
curl -s -b "$T/jar-prod44.txt" "$BASE/api/platform" -o "$T/prod44-boot.json"
BOLE_UNIT=$(node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/prod44-boot.json","utf8"));
const d=j.data;
const u=d.orgUnits.find(x=>x.code==="AA-BOLE");
console.log(u?.id??"");')
code=$(curl -s -X POST "$BASE/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d "{\"orgUnitId\":\"$BOLE_UNIT\",\"fullName\":\"Probe Person\"}" -o "$T/prod44-m3.json" -w '%{http_code}')
has "$(cat "$T/prod44-m3.json")" "is the responsible officer of AA-BOLE" && r=true || r=false
chk "$r" "true" "occupied AA-BOLE refuses blind appointment (sitting officer named, nothing written)"
has "$(cat "$T/prod44-m3.json")" "STF-0003" && r=true || r=false
chk "$r" "true" "error names the sitting officer's sign-in code"

echo "== 4. browser — AA bureau head"
$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 6
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
echo "  login url: $($AB get url)"
$AB open "$BASE/reports#bureau"
sleep 8
echo "== tabs:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.getAttribute('aria-selected')+':'+t.textContent.trim()))" 2>/dev/null
echo "== staffing table (first rows):"
$AB eval "JSON.stringify([...document.querySelectorAll('table tbody tr')].slice(0,3).map(r=>[...r.cells].map(c=>c.textContent.trim())))" 2>/dev/null
$AB eval "(()=>{const ts=[...document.querySelectorAll('[role=combobox]')];const t=ts.find(x=>x.textContent.includes('staffing'));if(!t)return 'no selector';t.click();return 'opened'})()" 2>/dev/null
sleep 1.5
$AB eval "(()=>{const o=[...document.querySelectorAll('[role=option]')].find(x=>x.textContent.includes('Penalty cases'));o?.click();return o?'switched':'no option'})()" 2>/dev/null
sleep 1.5
echo "== penalties table headers:"
$AB eval "JSON.stringify([...document.querySelectorAll('table th')].map(t=>t.textContent.trim()))" 2>/dev/null
echo "== CSV button:"
$AB eval "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Download CSV');return b?(b.disabled?'DISABLED':'enabled'):'NOT FOUND'})()" 2>/dev/null
$AB screenshot /home/z/my-project/download/prod-task44-bureau-reports.png 2>/dev/null
$AB open "$BASE/settings#org"
sleep 7
echo "== org headers:"
$AB eval "JSON.stringify([...document.querySelectorAll('table th')].map(t=>t.textContent.trim()))" 2>/dev/null
echo "== AA-BOLE row:"
$AB eval "(()=>{const r=[...document.querySelectorAll('table tbody tr')].find(x=>x.cells[0]?.textContent.trim()==='AA-BOLE');return JSON.stringify(r?{officer:r.cells[4].textContent.trim(),actions:r.cells[6].textContent.trim()}:null)})()" 2>/dev/null
$AB screenshot /home/z/my-project/download/prod-task44-org-officers.png 2>/dev/null

echo "== 5. regression — NEK city admin also gets the bureau reports tab"
$AB open "$BASE/login?city=NEK"
sleep 5
$AB find label "Staff code" fill "STF-2003"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 12); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
$AB open "$BASE/reports#bureau"
sleep 7
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.getAttribute('aria-selected')+':'+t.textContent.trim()))" 2>/dev/null
$AB screenshot /home/z/my-project/download/prod-task44-nek-reports.png 2>/dev/null

echo "== RESULT: $PASS passed / $FAIL failed"
[ "$FAIL" = "0" ]
