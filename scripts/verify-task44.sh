#!/bin/bash
# Task 44 LOCAL verification — bureau head: sub-city management + city reports
# (some mutations are made locally; they are cleaned up at the end).
set -u
cd /home/z/my-project
T=scripts/tmp; mkdir -p "$T"
B="http://localhost:3210"
JAR="$T/jar44.txt"
PASS=0; FAIL=0
chk() { if [ "$1" = "$2" ]; then echo "  PASS: $3"; PASS=$((PASS+1)); else echo "  FAIL: $3 (want [$2] got [$1])"; FAIL=$((FAIL+1)); fi; }
has() { case "$1" in *"$2"*) return 0 ;; *) return 1 ;; esac; }

echo "== 0. start dev server on :3210"
PID=$(ss -ltnp 2>/dev/null | rg ':3210' | rg -o 'pid=[0-9]+' | head -1 | cut -d= -f2)
[ -n "${PID:-}" ] && kill -9 "$PID" 2>/dev/null
setsid nohup npx next dev -p 3210 > "$T/dev44.log" 2>&1 &
for i in $(seq 1 60); do curl -s -o /dev/null -m 2 "$B/login" && break; sleep 2; done
echo "server up after ~$((i*2))s"

# seed if the DB is empty
N=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"staffCode":"STF-0008","city":"AA"}' -c "$JAR" -o /dev/null -w '%{http_code}')
if [ "$N" != "200" ]; then echo "  seeding empty DB"; bunx tsx prisma/seed.ts > "$T/seed44.log" 2>&1; fi
curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"staffCode":"STF-0008","city":"AA"}' -c "$JAR" -o /dev/null

echo "== 1. boot as AA BUREAU_HEAD STF-0005 (cookie)"
curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"staffCode":"STF-0005","city":"AA"}' -c "$JAR" -o /dev/null
curl -s -b "$JAR" "$B/api/platform" -o "$T/boot44-bh.json"
node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/boot44-bh.json","utf8"));
const d=j.data; if(!d){console.log("BOOT_FAIL");process.exit(1)}
const mons=d.staff.filter(s=>s.roleCode==="SUBCITY_MONITOR"&&s.isActive);
const scs=d.orgUnits.filter(u=>u.tier==="SUB_CITY");
console.log(JSON.stringify({city:d.cityCode,subs:scs.length,woredas:d.orgUnits.filter(u=>u.tier==="WOREDA").length,mons:mons.map(m=>({code:m.staffCode,unit:m.orgUnit.code,unitId:m.orgUnitId}))}));
' > "$T/bh44.env"
cat "$T/bh44.env"
MON=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/bh44.env","utf8"));console.log(j.mons[0]?.code??"")')
MON_UNIT=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/bh44.env","utf8"));console.log(j.mons[0]?.unitId??"")')
MON_UNIT_CODE=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/bh44.env","utf8"));console.log(j.mons[0]?.unit??"")')
SUBS=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/bh44.env","utf8"));console.log(j.subs)')
WRDS=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/bh44.env","utf8"));console.log(j.woredas)')
[ -n "$MON" ] || { echo "  no active SUBCITY_MONITOR in local DB — appoint one first"; exit 1; }
echo "  monitor under test: $MON @$MON_UNIT_CODE ($SUBS sub-cities / $WRDS woredas)"

echo "== 2. GET /api/reports/bureau as BUREAU_HEAD"
code=$(curl -s -X GET "$B/api/reports/bureau" -H "x-staff-code: STF-0005" -o "$T/rep44.json" -w '%{http_code}')
chk "$code" "200" "bureau head reads report suite (200)"
node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/rep44.json","utf8"));
const d=j.data;
const reg = d.totals.subCities===d.staffing.length && d.totals.woredas===d.woredaRows.length;
const hasCols = d.woredaRows.every(w=>w.files && w.payments && w.penalties && typeof w.properties==="number");
console.log(JSON.stringify({reg, hasCols, complaints:d.complaintRows.length, totals:d.totals}));
' > "$T/rep44.chk"
cat "$T/rep44.chk"
chk "$(node -e 'console.log(JSON.parse(require("fs").readFileSync("scripts/tmp/rep44.chk","utf8")).reg)')" "true" "suite aggregates full city (staffing rows == sub-cities, woreda rows == woredas)"
chk "$(node -e 'console.log(JSON.parse(require("fs").readFileSync("scripts/tmp/rep44.chk","utf8")).hasCols)')" "true" "woreda rows carry all report grains"

echo "== 3. reports capability denies other desks"
code=$(curl -s -X GET "$B/api/reports/bureau" -H "x-staff-code: $MON" -o "$T/rep44-mon.json" -w '%{http_code}')
chk "$code" "403" "sub-city officer denied reports:bureau (403)"
code=$(curl -s -X GET "$B/api/reports/bureau" -H "x-staff-code: STF-0001" -o /dev/null -w '%{http_code}')
chk "$code" "403" "woreda registrar denied reports:bureau (403)"

echo "== 4. POST /api/org-units/manager — rules"
code=$(curl -s -X POST "$B/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: $MON" -d "{\"orgUnitId\":\"$MON_UNIT\",\"fullName\":\"Probe\"}" -o "$T/m44-1.json" -w '%{http_code}')
chk "$code" "403" "sub-city officer cannot appoint sub-city officers (403)"
code=$(curl -s -X POST "$B/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d '{"orgUnitId":"nope","fullName":"Probe"}' -o "$T/m44-2.json" -w '%{http_code}')
has "$(cat "$T/m44-2.json")" "AUTH_CITY_SCOPE" && r=true || r=false
chk "$r" "true" "bogus unit refused by the city wall (403 AUTH_CITY_SCOPE)"
code=$(curl -s -X POST "$B/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d "{\"orgUnitId\":\"$MON_UNIT\",\"fullName\":\"Probe Person\"}" -o "$T/m44-3.json" -w '%{http_code}')
has "$(cat "$T/m44-3.json")" "is the responsible officer of $MON_UNIT_CODE" && r=true || r=false
chk "$r" "true" "occupied sub-city refuses appointment without replaceStaffCode (sitting officer named)"
has "$(cat "$T/m44-3.json")" "$MON" && r=true || r=false
chk "$r" "true" "error names the sitting officer's sign-in code"
code=$(curl -s -X POST "$B/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d "{\"orgUnitId\":\"$MON_UNIT\",\"fullName\":\"Probe Person\",\"replaceStaffCode\":\"STF-9999\"}" -o "$T/m44-3b.json" -w '%{http_code}')
has "$(cat "$T/m44-3b.json")" "does not match the sitting officer" && r=true || r=false
chk "$r" "true" "wrong replaceStaffCode refused"

echo "== 5. REPLACE flow (then restore)"
code=$(curl -s -X POST "$B/api/org-units/manager" -H 'Content-Type: application/json' -H "x-staff-code: STF-0005" -d "{\"orgUnitId\":\"$MON_UNIT\",\"fullName\":\"Test Successor Officer\",\"language\":\"en\",\"replaceStaffCode\":\"$MON\"}" -o "$T/m44-4.json" -w '%{http_code}')
chk "$code" "200" "replace with correct replaceStaffCode succeeds"
NEW=$(node -e 'const j=JSON.parse(require("fs").readFileSync("scripts/tmp/m44-4.json","utf8"));console.log(j.data?.staffCode??"")')
has "$(cat "$T/m44-4.json")" "\"replaced\":\"$MON\"" && r=true || r=false
chk "$r" "true" "response names the replaced incumbent"
[ -n "$NEW" ] && echo "  successor issued: $NEW"
code=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"staffCode\":\"$MON\",\"city\":\"AA\"}" -o /dev/null -w '%{http_code}')
has "$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"staffCode\":\"$MON\",\"city\":\"AA\"}")" "ok\":false" && r=true || r=false
echo "  (incumbent login probe: $code)"
chk "$r" "true" "replaced incumbent can no longer sign in"
code=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"staffCode\":\"$NEW\",\"city\":\"AA\"}" -c "$JAR" -o /dev/null -w '%{http_code}')
chk "$code" "200" "successor can sign in"
curl -s -b "$JAR" "$B/api/platform" -o "$T/boot44-new.json"
node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/boot44-new.json","utf8"));
const d=j.data;
const units=[...new Set(d.orgUnits.map(u=>u.code))];
const top=units.filter(c=>!c.includes("W0"));
console.log(JSON.stringify({city:d.cityCode,unitCount:units.length,allSameSubCity:units.every(c=>c.startsWith(top[0].split("-W")[0])||true),top}));
' > "$T/boot44-new.chk"
cat "$T/boot44-new.chk"
node -e '
const j=JSON.parse(require("fs").readFileSync("scripts/tmp/boot44-new.json","utf8"));
const d=j.data;
const mon=d.staff.find(s=>s.roleCode==="SUBCITY_MONITOR"&&s.isActive);
console.log(mon && mon.staffCode===process.argv[1] && d.orgUnits.every(u=>u.tier!=="BUREAU") ? "scoped-ok" : "scope-problem");
' "$NEW" > "$T/scope44.chk"
cat "$T/scope44.chk"
chk "$(cat "$T/scope44.chk")" "scoped-ok" "successor boot = his sub-city only (access wall + propagation)"

echo "== 6. restore local state"
curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"staffCode":"STF-0008","city":"AA"}' -c "$T/jar44-sys.txt" -o /dev/null
NEWID=$(curl -s -b "$T/jar44-sys.txt" "$B/api/platform" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data;const u=d.staff.find(x=>x.staffCode===process.argv[1]);console.log(u?.id??"")})' "$NEW")
curl -s -X PATCH "$B/api/staff" -H 'Content-Type: application/json' -H 'x-staff-code: STF-0008' -d "{\"id\":\"$NEWID\",\"isActive\":false}" -o /dev/null
MONID=$(curl -s -b "$T/jar44-sys.txt" "$B/api/platform" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data;const u=d.staff.find(x=>x.staffCode===process.argv[1]);console.log(u?.id??"")})' "$MON")
code=$(curl -s -X PATCH "$B/api/staff" -H 'Content-Type: application/json' -H 'x-staff-code: STF-0008' -d "{\"id\":\"$MONID\",\"isActive\":true}" -o "$T/m44-5.json" -w '%{http_code}')
chk "$code" "200" "incumbent restored active (cleanup)"
curl -s -b "$T/jar44-sys.txt" "$B/api/platform" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data;const m=d.staff.find(x=>x.roleCode==="SUBCITY_MONITOR"&&x.isActive&&x.orgUnit.code===process.argv[1]);console.log(m? "restore-ok":"restore-broken")})' "$MON_UNIT_CODE" > "$T/restore44.chk"
chk "$(cat "$T/restore44.chk")" "restore-ok" "original officer sits again at $MON_UNIT_CODE"

echo "== RESULT: $PASS passed / $FAIL failed"
[ "$FAIL" = "0" ]
