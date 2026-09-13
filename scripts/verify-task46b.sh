#!/bin/bash
# Task 46 refinement — "make Administration next to dashboard".
# Bureau head group order must be: Overview -> Administration -> Insights.
# Registrar group order must stay: Overview -> Registry -> Operations -> Administration.
set -u
AB="agent-browser"
BASE="http://localhost:3210"
SHOTS="/home/z/my-project/download"

pkill -f "next dev -p 3210" 2>/dev/null; pkill -f "next-server" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/t46b-dev.log 2>&1 < /dev/null &
UP=0
for i in $(seq 1 45); do
  sleep 2
  if curl -sf -o /dev/null "$BASE/login"; then UP=1; break; fi
done
[ "$UP" = "1" ] || { echo "SERVER NEVER CAME UP"; tail -20 /tmp/t46b-dev.log; exit 1; }
echo "server up"

$AB close 2>/dev/null
$AB set viewport 1440 900

login_as() {
  $AB open "$BASE/login?city=AA" > /dev/null 2>&1
  sleep 4
  $AB find label "Staff code" fill "$1" > /dev/null 2>&1
  sleep 1
  $AB find text "Sign in" click > /dev/null 2>&1
  for i in $(seq 1 25); do
    sleep 2
    U=$($AB get url 2>/dev/null)
    case "$U" in *"/login"*) ;; *) break ;; esac
  done
  sleep 4
}

nav_groups() {
  $AB eval "JSON.stringify(Array.from(document.querySelectorAll('nav[aria-label=Console] > div > p')).map(p=>p.textContent))" 2>/dev/null
}
nav_links() {
  $AB eval "JSON.stringify(Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href')))" 2>/dev/null
}

echo "=== BUREAU HEAD (STF-0005) ==="
login_as "STF-0005"
echo "url: $($AB get url)"
echo "groups: $(nav_groups)"
echo "links:  $(nav_links)"
echo "dashboard card order: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('main a[href="/settings#org"], main a[href="/reports#bureau"]')).map(a=>a.getAttribute('href')))" 2>/dev/null)"
$AB screenshot "$SHOTS/task46b-bureau-head-order.png" > /dev/null 2>&1 || true

echo "=== REGISTRAR (STF-0001) — regression ==="
login_as "STF-0001"
echo "url: $($AB get url)"
echo "groups: $(nav_groups)"
echo "=== done ==="
