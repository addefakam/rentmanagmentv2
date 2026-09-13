#!/bin/bash
# Task 43 — sub-city delegation (server already running on 3210, DB seeded):
#   A) BUREAU_HEAD: woreda creation DENIED, staff creation DENIED,
#      sub-city without officer DENIED, sub-city WITH officer -> unit + STF user
#   B) new SUBCITY_MONITOR: boot narrowed to his subtree, creates woreda ok,
#      appoints woreda registrar ok, monitor role DENIED, cross-subcity DENIED
#   C) CITY_ADMIN: still manages staff; uniqueness: 2nd monitor DENIED
set -u
BASE="http://localhost:3210"
T=/home/z/my-project/scripts/tmp
mkdir -p "$T"

api() { # method path body [staffCode]
  curl -s -X "$1" "$BASE$2" -H 'Content-Type: application/json' ${3:+-d "$3"} ${4:+-H "x-staff-code: $4"}
}
login() { curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"staffCode\":\"$1\",\"city\":\"$2\"}" -c "$3" > /dev/null; }

# --- boot as bureau head (cookie) ---------------------------------------------
login STF-0005 AA "$T/jar-bh.txt"
curl -s -b "$T/jar-bh.txt" "$BASE/api/platform" -o "$T/boot-bh.json"
BUREAU_ID=$(python3 -c "import json;print(next(u['id'] for u in json.load(open('$T/boot-bh.json'))['data']['orgUnits'] if u['tier']=='BUREAU'))")
BOLE_ID=$(python3 -c "import json;print(next(u['id'] for u in json.load(open('$T/boot-bh.json'))['data']['orgUnits'] if u['code']=='AA-BOLE'))")
echo "bureau: $BUREAU_ID | AA-BOLE: $BOLE_ID"

# --- C0 an AA-scoped city admin for group C (created by SYSTEM_ADMIN) ----------
CA=$(api POST /api/staff '{"fullName":"T43 AA City Admin","roleCode":"CITY_ADMIN","orgUnitId":"'"$BUREAU_ID"'","language":"en"}' STF-0008)
CA_CODE=$(echo "$CA" | python3 -c "import json,sys;print((json.load(sys.stdin).get('data') or {}).get('staffCode',''))")
echo "AA city admin: $CA_CODE"

echo "--- A1 bureau head creates WOREDA (expect deny)"
api POST /api/org-units "{\"tier\":\"WOREDA\",\"parentId\":\"$BOLE_ID\",\"code\":\"AA-BH-W99\",\"nameEn\":\"BH Woreda\"}" STF-0005 | head -c 200; echo
echo "--- A2 bureau head creates staff (expect 403 staff:manage)"
api POST /api/staff '{"fullName":"BH Staff Probe","roleCode":"BUREAU_ANALYST","orgUnitId":"'"$BOLE_ID"'"}' STF-0005 | head -c 200; echo
echo "--- A3 bureau head founds sub-city WITHOUT officer (expect error)"
api POST /api/org-units "{\"tier\":\"SUB_CITY\",\"parentId\":\"$BUREAU_ID\",\"code\":\"AA-T42\",\"nameEn\":\"Test 42 Sub-city\"}" STF-0005 | head -c 200; echo
echo "--- A4 bureau head founds sub-city WITH officer (expect ok + manager)"
SC=$(api POST /api/org-units "{\"tier\":\"SUB_CITY\",\"parentId\":\"$BUREAU_ID\",\"code\":\"AA-T42\",\"nameEn\":\"Test 42 Sub-city\",\"nameAm\":\"የሙከራ 42\",\"nameOm\":\"Qormataa 42\",\"managerFullName\":\"Test Subcity Officer T42\",\"managerLanguage\":\"en\"}" STF-0005)
echo "$SC" | head -c 340; echo
SC_ID=$(echo "$SC" | python3 -c "import json,sys;print((json.load(sys.stdin).get('data') or {}).get('id',''))")
MON_CODE=$(echo "$SC" | python3 -c "import json,sys;m=((json.load(sys.stdin).get('data') or {}).get('manager') or {});print(m.get('staffCode',''))")
echo "new sub-city id: $SC_ID | officer code: $MON_CODE"

echo "--- B1 officer login + boot scope"
login "$MON_CODE" AA "$T/jar-mon.txt"
curl -s -b "$T/jar-mon.txt" "$BASE/api/platform" -o "$T/boot-mon.json"
python3 -c "
import json
d=json.load(open('$T/boot-mon.json'))['data']
print('officer units:', [u['code'] for u in d['orgUnits']])
print('staff rows:', [(s['staffCode'], s['orgUnit']['code']) for s in d['staff']])
print('counts.orgUnits:', d['counts']['orgUnits'])"
echo "--- B2 officer creates WOREDA under his sub-city (expect ok)"
W=$(api POST /api/org-units "{\"tier\":\"WOREDA\",\"parentId\":\"$SC_ID\",\"code\":\"AA-T42-W01\",\"nameEn\":\"Test 42 Woreda 01\"}" "$MON_CODE")
echo "$W" | head -c 200; echo
W_ID=$(echo "$W" | python3 -c "import json,sys;print((json.load(sys.stdin).get('data') or {}).get('id',''))")
echo "--- B3 officer appoints WOREDA_REGISTRAR at his woreda (expect ok)"
api POST /api/staff '{"fullName":"T42 Woreda Registrar","roleCode":"WOREDA_REGISTRAR","orgUnitId":"'"$W_ID"'","language":"en"}' "$MON_CODE" | head -c 260; echo
echo "--- B4 officer appoints SUBCITY_MONITOR (expect deny)"
api POST /api/staff '{"fullName":"T42 Second Monitor","roleCode":"SUBCITY_MONITOR","orgUnitId":"'"$SC_ID"'"}' "$MON_CODE" | head -c 220; echo
echo "--- B5 officer targets another sub-city (expect 403 scope)"
api POST /api/staff '{"fullName":"T42 Cross Probe","roleCode":"WOREDA_REGISTRAR","orgUnitId":"'"$BOLE_ID"'"}' "$MON_CODE" | head -c 220; echo
echo "--- B6 officer creates WOREDA under ANOTHER sub-city (expect deny)"
api POST /api/org-units "{\"tier\":\"WOREDA\",\"parentId\":\"$BOLE_ID\",\"code\":\"AA-BOLE-W99\",\"nameEn\":\"Cross Woreda\"}" "$MON_CODE" | head -c 240; echo

echo "--- C1 city admin uniqueness: 2nd monitor at AA-T42 (expect deny)"
api POST /api/staff '{"fullName":"T43 Dup Monitor","roleCode":"SUBCITY_MONITOR","orgUnitId":"'"$SC_ID"'"}' "$CA_CODE" | head -c 260; echo
echo "--- C2 city admin founds sub-city without officer (expect error)"
api POST /api/org-units '{"tier":"SUB_CITY","parentId":"'"$BUREAU_ID"'","code":"AA-T43","nameEn":"Test 43"}' "$CA_CODE" | head -c 200; echo
echo "--- C3 city admin still creates staff + woreda (expect ok)"
api POST /api/staff '{"fullName":"T43 Bole Extra Registrar","roleCode":"WOREDA_REGISTRAR","orgUnitId":"'"$BOLE_ID"'"}' "$CA_CODE" | head -c 200; echo
echo done
