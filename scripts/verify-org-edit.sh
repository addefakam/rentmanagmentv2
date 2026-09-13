#!/bin/bash
# Verify org unit editing: Edit dialog on sub-cities/woredas, trilingual save.
set -u
AB="agent-browser"
BASE="http://localhost:3210"

# --- server (re)start: sandbox reaps background processes between calls ------
pkill -f "next-server" 2>/dev/null; pkill -f "next dev" 2>/dev/null; pkill -f "next start" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/next-3210.log 2>&1 < /dev/null &
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"

$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA"
sleep 4
$AB find label "Staff code" fill "STF-2003"   # local active CITY_ADMIN (Tabs Verify Admin)
sleep 1
$AB find text "Sign in" click
for i in $(seq 1 10); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
echo "login url: $($AB get url)"

$AB open "$BASE/settings#org"
sleep 5
echo "== table before edit:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,90)))" 2>/dev/null

# capture original AA-BOLE woreda row values, then edit its Amharic name
ORIG=$($AB eval "(()=>{const tr=[...document.querySelectorAll('table tbody tr')].find(r=>r.textContent.includes('AA-BOLE-W01'));return tr?tr.querySelectorAll('input,td')[0].textContent+'|'+tr.textContent:'NO_ROW'})()" 2>/dev/null)
echo "target row: $ORIG"

$AB eval "(()=>{const tr=[...document.querySelectorAll('table tbody tr')].find(r=>r.textContent.includes('AA-BOLE-W01'));const b=[...tr.querySelectorAll('button')].find(b=>b.textContent.trim()==='Edit');b.click();return 'clicked'})()" 2>/dev/null
sleep 2
echo "== dialog present:"
$AB eval "!!document.querySelector('[role=dialog]') ? document.querySelector('[role=dialog]').textContent.slice(0,180) : 'NO_DIALOG'" 2>/dev/null

# set the three name fields inside the dialog (EN unchanged, AM/OM changed)
$AB eval "(()=>{const d=document.querySelector('[role=dialog]');const ins=[...d.querySelectorAll('input')];
const set=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
set(ins[0],'Bole Woreda Office'); set(ins[1],'ቦሌ ወረዳ ቢሮ'); set(ins[2],'Wolfensuu Boolee'); return 'set '+(ins.length)})()" 2>/dev/null
sleep 1
$AB eval "(()=>{const d=document.querySelector('[role=dialog]');const b=[...d.querySelectorAll('button')].find(b=>/Save changes/.test(b.textContent));b.click();return 'saved'})()" 2>/dev/null
sleep 3
echo "== table after save:"
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,110)).filter(t=>t.includes('AA-BOLE-W01')))" 2>/dev/null

$AB screenshot /home/z/my-project/download/settings-org-edit-saved.png 2>/dev/null
$AB close 2>/dev/null
echo done
