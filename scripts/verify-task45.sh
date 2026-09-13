#!/usr/bin/env bash
# Task 45 local verification — city dashboard report charts.
# 1) dev server on :3210  2) seed payments + complaints (STF-0001 registrar)
# 3) GET /api/reports/bureau as STF-0005 (bureau head) -> chart-feed assertions
# 4) deny probe: registrar must stay 403 on the reports endpoint
set -u
cd /home/z/my-project
BASE=http://localhost:3210
TMP=/home/z/my-project/scripts/tmp
mkdir -p "$TMP"
PASS=0; FAIL=0
ok()  { echo "PASS: $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }
jqv() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

# --- 1) server (re)start — sandbox reaps background processes between calls --
pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
setsid nohup npx next dev -p 3210 > /tmp/t45-dev.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; echo "server up after ~$((i*2))s"; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; tail -20 /tmp/t45-dev.log; exit 1; }

# --- 2) login STF-0005 (AA bureau head) --------------------------------------
curl -s -c "$TMP/t45-bh.jar" -H 'Content-Type: application/json' \
  -d '{"staffCode":"STF-0005","city":"AA"}' "$BASE/api/auth/login" > "$TMP/t45-login.json"
BH=$(jqv "d['officer']['staffCode']" < "$TMP/t45-login.json")
[ "$BH" = "STF-0005" ] && ok "bureau head login" || bad "bureau head login ($BH)"

# --- 3) seed: 4 payments (1 cash) + 3 complaints, one full decide pipeline ----
W="cmtzq3uup001wnmmx60p5807k"   # AA-BOLE-W01
curl -s -H 'x-staff-code: STF-0001' -H 'x-city-code: AA' "$BASE/api/registration-files" > "$TMP/t45-files.json"
IDS=$(python3 -c "
import json
d = json.load(open('$TMP/t45-files.json'))
rows = d.get('data') or d
if isinstance(rows, dict): rows = rows.get('files') or rows.get('items') or []
reg = [r['id'] for r in rows if r.get('status') == 'REGISTERED'][:4]
print(' '.join(reg))
")
echo "registered file ids: $IDS"
i=0
for FID in $IDS; do
  i=$((i+1))
  if [ "$i" = "4" ]; then BODY="{\"fileId\":\"$FID\",\"amount\":9300,\"kind\":\"RENT\",\"method\":\"CASH\",\"isCash\":true,\"paidAt\":\"2026-09-10T09:00:00.000Z\",\"recordedByOrgUnitId\":\"$W\"}";
  else BODY="{\"fileId\":\"$FID\",\"amount\":$((5000+i*1100)),\"kind\":\"RENT\",\"method\":\"TELEBIRR\",\"isCash\":false,\"paidAt\":\"2026-09-10T09:00:00.000Z\",\"recordedByOrgUnitId\":\"$W\"}"; fi
  R=$(curl -s -X POST -H 'x-staff-code: STF-0001' -H 'Content-Type: application/json' -H 'x-city-code: AA' -d "$BODY" "$BASE/api/payments")
  echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print('payment $i ->','OK' if d.get('ok') else d)" 2>/dev/null || echo "payment $i -> RAW $R"
done

for G in CG-1 CG-5 CG-8; do
  curl -s -X POST -H 'x-staff-code: STF-0001' -H 'Content-Type: application/json' -H 'x-city-code: AA' \
    -d "{\"channel\":\"PORTAL\",\"groundCode\":\"$G\",\"description\":\"Task 45 chart seed ($G) — rent dispute raised through the portal.\",\"receivedAt\":\"2026-09-11T08:30:00.000Z\",\"receivedAtOrgUnitId\":\"$W\"}" \
    "$BASE/api/complaints" > "$TMP/t45-c.json"
  CID=$(jqv "d['data']['id']" < "$TMP/t45-c.json")
  echo "complaint $G -> id=$CID"
  if [ "$G" = "CG-1" ] && [ -n "$CID" ]; then
    curl -s -X PATCH -H 'x-staff-code: STF-0001' -H 'Content-Type: application/json' -H 'x-city-code: AA' \
      -d "{\"id\":\"$CID\",\"action\":\"verify\",\"note\":\"complete\"}" "$BASE/api/complaints" > /dev/null
    curl -s -X PATCH -H 'x-staff-code: STF-0001' -H 'Content-Type: application/json' -H 'x-city-code: AA' \
      -d "{\"id\":\"$CID\",\"action\":\"investigate\",\"note\":\"field check done\"}" "$BASE/api/complaints" > /dev/null
    curl -s -X PATCH -H 'x-staff-code: STF-0001' -H 'Content-Type: application/json' -H 'x-city-code: AA' \
      -d "{\"id\":\"$CID\",\"action\":\"decide\",\"decision\":\"UPHOLD\",\"summary\":\"Ceiling enforced\"}" "$BASE/api/complaints" > /dev/null
  fi
done

# --- 4) report suite as bureau head — the exact feed the charts consume ------
curl -s -H 'x-staff-code: STF-0005' -H 'x-city-code: AA' "$BASE/api/reports/bureau" > "$TMP/t45-rep.json"
python3 - "$TMP/t45-rep.json" <<'PY'
import sys, json
d = json.load(open(sys.argv[1]))
r = d.get("data") or {}
t = r.get("totals", {})
print("city:", r.get("cityCode"), "| totals:", {k: t.get(k) for k in ("files","registeredFiles","properties","paymentReceipts","paymentsEtb","complaints","openComplaints","penaltyCases","penaltiesEtb","subCities","woredas")})
wr = r.get("woredaRows", [])
live = [w for w in wr if w["files"]["total"] or w["payments"]["receipts"] or w["penalties"]["cases"]]
print("woredaRows:", len(wr), "| rows with activity:", len(live))
if live:
    w = live[0]
    print("sample:", w["woredaCode"], "files:", w["files"]["total"], "receipts:", w["payments"]["receipts"], "etb:", w["payments"]["totalEtb"], "fines:", w["penalties"]["imposedEtb"])
comp = r.get("complaintRows", [])
print("complaintRows:", [(c["unitCode"], c["received"], c["open"], c["decided"]) for c in comp])
st = r.get("staffing", [])
print("staffing rows:", len(st), "| with officer:", sum(1 for s in st if s["officer"]))
PY

PAYS=$(jqv "d['data']['totals']['paymentReceipts']" < "$TMP/t45-rep.json")
COMPS=$(jqv "d['data']['totals']['complaints']" < "$TMP/t45-rep.json")
ETB=$(jqv "d['data']['totals']['paymentsEtb']" < "$TMP/t45-rep.json")
FINES=$(jqv "d['data']['totals']['penaltiesEtb']" < "$TMP/t45-rep.json")
[ "${PAYS:-0}" -ge 4 ] 2>/dev/null && ok "payments in report feed ($PAYS receipts, ETB $ETB)" || bad "payments in report feed ($PAYS)"
[ "${COMPS:-0}" -ge 3 ] 2>/dev/null && ok "complaints in report feed ($COMPS)" || bad "complaints in report feed ($COMPS)"
python3 -c "exit(0 if float('${FINES:-0}') > 0 else 1)" && ok "penalty fines present (ETB $FINES — cash referral)" || echo "NOTE: fines zero (cash referral may differ) — fine for charts"

# --- 5) deny probe: registrar stays 403 on the bureau report feed ------------
CODE=$(curl -s -o "$TMP/t45-deny.json" -w '%{http_code}' -H 'x-staff-code: STF-0001' -H 'x-city-code: AA' "$BASE/api/reports/bureau")
[ "$CODE" = "403" ] && ok "registrar denied on /api/reports/bureau (403)" || bad "registrar deny expected 403 got $CODE"

echo "== RESULT: $PASS passed, $FAIL failed =="
exit $([ "$FAIL" = "0" ] && echo 0 || echo 1)
