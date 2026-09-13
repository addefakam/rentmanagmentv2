#!/bin/bash
# Task 42 — city Rent Control Bureau head (BUREAU_HEAD) staffing authority:
#   1. staff:manage now includes BUREAU_HEAD  -> staff register API + tab
#   2. bureau head creates a sub-city and a woreda (org:manage, already ok)
#   3. bureau head creates staff at sub-city level with a different role
#   4. cross-city staff creation still denied (city scope wall)
set -u
AB="agent-browser"
BASE="http://localhost:3210"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"

# --- server (re)start: sandbox reaps background processes between calls ------
pkill -f "next-server" 2>/dev/null; pkill -f "next dev" 2>/dev/null; pkill -f "next start" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > "$T/next-3210.log" 2>&1 < /dev/null &
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"

# --- login as AA BUREAU_HEAD STF-0005 ----------------------------------------
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"staffCode":"STF-0005","city":"AA"}' -c "$T/jar42.txt")
echo "login: $(echo "$LOGIN" | head -c 200)"

# --- boot payload (cookie) ----------------------------------------------------
curl -s -b "$T/jar42.txt" "$BASE/api/platform" -o "$T/boot42.json"
python3 - "$T/boot42.json" <<'EOF'
import json,sys
d=json.load(open(sys.argv[1]))
data=d.get("data") or {}
off=data.get("officer") or {}
print("BOOT officer:", off.get("staffCode"), off.get("roleCode"), "| staff rows:", len(data.get("staff") or []), "| orgUnits:", len(data.get("orgUnits") or []))
bureau=[u for u in data.get("orgUnits",[]) if u.get("tier")=="BUREAU"]
scs=[u for u in data.get("orgUnits",[]) if u.get("tier")=="SUB_CITY"]
print("bureaus:", [(u["code"],u["id"]) for u in bureau][:3])
open("/tmp/bureau_id.txt","w").write(bureau[0]["id"] if bureau else "")
EOF
BUREAU_ID=$(cat /tmp/bureau_id.txt)
echo "bureau_id: $BUREAU_ID"

# --- 1) bureau head CREATES a sub-city ---------------------------------------
SC=$(curl -s -X POST "$BASE/api/org-units" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d "{\"tier\":\"SUB_CITY\",\"parentId\":\"$BUREAU_ID\",\"code\":\"AA-TEST-SC\",\"nameEn\":\"Test Sub-city\",\"nameAm\":\"የሙከራ ክፍለ ከተማ\",\"nameOm\":\"Sub-city Qormaata\"}")
echo "create SUB_CITY: $(echo "$SC" | head -c 220)"
SC_ID=$(echo "$SC" | python3 -c "import json,sys; print((json.load(sys.stdin).get('data') or {}).get('id',''))")

# --- 2) bureau head CREATES a woreda under it --------------------------------
W=$(curl -s -X POST "$BASE/api/org-units" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d "{\"tier\":\"WOREDA\",\"parentId\":\"$SC_ID\",\"code\":\"AA-TEST-SC-W01\",\"nameEn\":\"Test Woreda 01\"}")
echo "create WOREDA: $(echo "$W" | head -c 200)"
W_ID=$(echo "$W" | python3 -c "import json,sys; print((json.load(sys.stdin).get('data') or {}).get('id',''))")

# --- 3) bureau head CREATES staff at sub-city level, different roles ---------
S1=$(curl -s -X POST "$BASE/api/staff" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d "{\"fullName\":\"Test Subcity Monitor\",\"roleCode\":\"SUBCITY_MONITOR\",\"orgUnitId\":\"$SC_ID\",\"language\":\"en\"}")
echo "staff SUBCITY_MONITOR @sub-city: $(echo "$S1" | head -c 260)"
S2=$(curl -s -X POST "$BASE/api/staff" -H 'Content-Type: application/json' \
  -H 'x-staff-code: STF-0005' \
  -d "{\"fullName\":\"Test Woreda Registrar\",\"roleCode\":\"WOREDA_REGISTRAR\",\"orgUnitId\":\"$W_ID\",\"language\":\"am\"}")
echo "staff WOREDA_REGISTRAR @woreda: $(echo "$S2" | head -c 260)"

# --- 4) cross-city denial (NEK unit) -----------------------------------------
NEK_UNIT=$(curl -s -b "$T/jar42.txt" "$BASE/api/platform" -o "$T/boot42b.json" -w "" ; python3 -c "
import json
d=json.load(open('$T/boot42b.json'))
data=d.get('data') or {}
nek=[u['id'] for u in data.get('orgUnits',[]) if u.get('code','').startswith('NEK-')]
print(nek[0] if nek else '')")
if [ -n "$NEK_UNIT" ]; then
  X=$(curl -s -X POST "$BASE/api/staff" -H 'Content-Type: application/json' \
    -H 'x-staff-code: STF-0005' \
    -d "{\"fullName\":\"Cross City Probe\",\"roleCode\":\"WOREDA_REGISTRAR\",\"orgUnitId\":\"$NEK_UNIT\"}")
  echo "cross-city staff (expect fail): $(echo "$X" | head -c 200)"
else
  echo "cross-city probe skipped (no NEK units visible to AA actor)"
fi

# --- 5) browser: STF-0005 sees Staff register tab + tier-grouped offices -----
$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 4
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 10); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
echo "login url: $($AB get url)"
$AB open "$BASE/settings#staff"
sleep 5
echo "== tabs:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.getAttribute('aria-selected')+':'+t.textContent.trim()))" 2>/dev/null
echo "== staff table rows:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,80)).slice(0,14))" 2>/dev/null
echo "== home office select options (tier-grouped):"
$AB eval "(()=>{const sels=[...document.querySelectorAll('select')];const s=sels.find(x=>[...x.options].some(o=>o.textContent.includes('City bureau')));return s?JSON.stringify([...s.options].map(o=>o.textContent.trim()).slice(0,12)):'NO_GROUPED_SELECT'})()" 2>/dev/null
$AB screenshot /home/z/my-project/download/settings-bureau-head-staff.png 2>/dev/null
$AB close 2>/dev/null
echo done
