#!/bin/bash
# Task 45 browser verification — city dashboard report charts.
# A) bureau head (STF-0005): "City report charts" section with 6 chart cards
# B) registrar (STF-0001): dashboard unchanged — NO charts section
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"

# --- server restart: sandbox reaps background processes between calls --------
pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/t45-dev2.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; tail -20 /tmp/t45-dev2.log; exit 1; }
echo "server up"

$AB close 2>/dev/null
$AB set viewport 1440 900

# --- A) bureau head dashboard with charts ------------------------------------
$AB open "$BASE/login?city=AA"
sleep 2
$AB find label "Staff code" fill "STF-0005"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 15); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
echo "bureau head url: $($AB get url)"
sleep 3   # let boot + report fetch + charts render

T=$($AB eval "document.body.innerText.includes('City report charts')" 2>/dev/null)
echo "charts section present: $T"
SURF=$($AB eval "document.querySelectorAll('.recharts-surface').length" 2>/dev/null)
echo "recharts surfaces: $SURF"
CARDS=$($AB eval "Array.from(document.querySelectorAll('h3')).map(h=>h.textContent).filter(t=>t&&t.includes('—')).join(' | ')" 2>/dev/null)
echo "chart cards: $CARDS"
LINK=$($AB eval "Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')==='/reports#bureau')?.textContent ?? 'MISSING'" 2>/dev/null)
echo "reports deep-link: $LINK"

$AB eval "window.scrollTo(0, 300)" > /dev/null 2>&1
sleep 1
$AB screenshot "$SHOTS/task45-dashboard-charts-top.png"
$AB eval "window.scrollTo(0, 900)" > /dev/null 2>&1
sleep 1
$AB screenshot "$SHOTS/task45-dashboard-charts-mid.png"
$AB eval "window.scrollTo(0, 1600)" > /dev/null 2>&1
sleep 1
$AB screenshot "$SHOTS/task45-dashboard-charts-bottom.png"

# hover tooltip on the first chart (pipeline) for tooltip styling evidence
$AB eval "window.scrollTo(0, 450)" > /dev/null 2>&1
sleep 1
BX=$($AB eval "(()=>{const b=document.querySelectorAll('.recharts-bar-rectangle path')[2];if(!b)return 'NONE';const r=b.getBoundingClientRect();return Math.round(r.x+r.width/2)+' '+Math.round(r.y+r.height/2);})()" 2>/dev/null)
echo "hover target: $BX"
if [ "$BX" != "NONE" ]; then
  X=${BX% *}; Y=${BX#* }
  $AB hover "$X" "$Y" > /dev/null 2>&1 || true
  sleep 1
  $AB screenshot "$SHOTS/task45-chart-tooltip.png"
  TT=$($AB eval "!!document.querySelector('.recharts-tooltip-wrapper')" 2>/dev/null)
  echo "tooltip visible: $TT"
fi

# --- B) registrar dashboard unchanged (no charts) ----------------------------
$AB open "$BASE/api/auth/logout" > /dev/null 2>&1 || true
$AB open "$BASE/login?city=AA"
sleep 2
$AB find label "Staff code" fill "STF-0001"
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 15); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
echo "registrar url: $($AB get url)"
sleep 3
R1=$($AB eval "document.body.innerText.includes('City report charts')" 2>/dev/null)
R2=$($AB eval "document.querySelectorAll('.recharts-surface').length" 2>/dev/null)
echo "registrar sees charts section: $R1 (expect False) | surfaces: $R2 (expect 0)"
$AB screenshot "$SHOTS/task45-registrar-no-charts.png"

$AB close 2>/dev/null
echo "browser verification done"
