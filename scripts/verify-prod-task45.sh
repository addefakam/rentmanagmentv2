#!/bin/bash
# Task 45 PRODUCTION verification — city dashboard report charts.
# Read-only API probes + browser evidence on https://rentmanagmentv2-ndhb.vercel.app
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
TMP=/home/z/my-project/scripts/tmp
SHOTS="/home/z/my-project/download"
PASS=0; FAIL=0
ok()  { echo "PASS: $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

# --- API: report feed as the AA bureau head (read-only) ----------------------
CODE=$(curl -s -o "$TMP/p45-rep.json" -w '%{http_code}' -H 'x-staff-code: STF-0005' -H 'x-city-code: AA' "$BASE/api/reports/bureau")
[ "$CODE" = "200" ] && ok "bureau head report feed 200" || bad "report feed http $CODE"
python3 - "$TMP/p45-rep.json" <<'PY'
import sys, json
d = json.load(open(sys.argv[1]))
r = d.get("data") or {}
t = r.get("totals", {})
print("city:", r.get("cityCode"), "| subCities:", t.get("subCities"), "| woredas:", t.get("woredas"),
      "| files:", t.get("files"), "| registered:", t.get("registeredFiles"),
      "| receipts:", t.get("paymentReceipts"), "| complaints:", t.get("complaints"),
      "| penalties:", t.get("penaltyCases"))
wr = r.get("woredaRows", [])
print("woredaRows:", len(wr), "| staffing:", len(r.get("staffing", [])), "| complaintRows:", len(r.get("complaintRows", [])))
PY
SUBS=$(python3 -c "import json;d=json.load(open('$TMP/p45-rep.json'));print((d.get('data') or {}).get('totals',{}).get('subCities',0))")
WORS=$(python3 -c "import json;d=json.load(open('$TMP/p45-rep.json'));print((d.get('data') or {}).get('totals',{}).get('woredas',0))")
[ "${SUBS:-0}" -ge 1 ] && [ "${WORS:-0}" -ge 1 ] && ok "aggregated feed has sub-cities ($SUBS) and woredas ($WORS)" || bad "feed aggregation empty"

# --- API: deny probes (registrar + monitor stay 403) --------------------------
C1=$(curl -s -o /dev/null -w '%{http_code}' -H 'x-staff-code: STF-0001' -H 'x-city-code: AA' "$BASE/api/reports/bureau")
[ "$C1" = "403" ] && ok "registrar 403 on report feed" || bad "registrar expected 403 got $C1"

# --- Browser: bureau head dashboard charts ------------------------------------
$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 4
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 20); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
echo "prod bureau head url: $($AB get url)"
sleep 5   # boot + report fetch + charts
T=$($AB eval "/city report charts/i.test(document.body.innerText)" 2>/dev/null)
[ "$T" = "true" ] && ok "charts section present for bureau head" || bad "charts section missing ($T)"
S=$($AB eval "document.querySelectorAll('.recharts-surface').length" 2>/dev/null)
E=$($AB eval "Array.from(document.querySelectorAll('div')).filter(d=>d.children.length===0&&/No records in city scope yet/.test(d.textContent)).length" 2>/dev/null)
CARDS=$(( ${S:-0} + ${E:-0} ))
[ "$CARDS" -ge 6 ] && ok "six chart cards rendered ($S charts + $E in-scope empty states)" || bad "expected >=6 chart cards got $CARDS ($S charts + $E empty)"
L=$($AB eval "!!Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/reports#bureau')" 2>/dev/null)
[ "$L" = "true" ] && ok "deep-link to full report tables present" || bad "deep-link missing"

$AB eval "window.scrollTo(0, 0)" > /dev/null 2>&1; sleep 1
$AB screenshot "$SHOTS/prod-task45-charts-top.png"
$AB eval "window.scrollTo(0, 700)" > /dev/null 2>&1; sleep 1
$AB screenshot "$SHOTS/prod-task45-charts-mid.png"
$AB eval "window.scrollTo(0, 1500)" > /dev/null 2>&1; sleep 1
$AB screenshot "$SHOTS/prod-task45-charts-bottom.png"

# --- Browser: regression — NEK city admin also gets the charts ----------------
$AB find text "Sign out" click > /dev/null 2>&1
sleep 2
$AB open "$BASE/login?city=NEK"
sleep 4
$AB find label "Staff code" fill "STF-2003"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 20); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
echo "prod NEK city admin url: $($AB get url)"
sleep 5
N=$($AB eval "/city report charts/i.test(document.body.innerText)" 2>/dev/null)
[ "$N" = "true" ] && ok "NEK city admin sees charts section" || bad "NEK city admin charts missing"
$AB screenshot "$SHOTS/prod-task45-nek-charts.png"

$AB close 2>/dev/null
echo "== PROD RESULT: $PASS passed, $FAIL failed =="
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
