#!/bin/bash
# Verify: all woredas listed+editable in Settings org editor; /parties link present.
set -u
AB="agent-browser"
BASE="http://localhost:3210"

pkill -f "next-server" 2>/dev/null; pkill -f "next dev" 2>/dev/null
PID=$(ss -ltnp 2>/dev/null | grep ':3210' | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
sleep 1
cd /home/z/my-project
setsid nohup npx next dev -p 3210 > /tmp/next-3210.log 2>&1 < /dev/null &
for i in $(seq 1 45); do code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login" 2>/dev/null); [ "$code" = "200" ] && break; sleep 2; done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' $BASE/login)"

$AB close 2>/dev/null; $AB set viewport 1440 900
$AB open "$BASE/login?city=AA"; sleep 4
$AB find label "Staff code" fill "STF-2003"; sleep 1
$AB find text "Sign in" click
for i in $(seq 1 10); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
echo "login url: $($AB get url)"

$AB open "$BASE/settings#org"; sleep 6
echo "== row census:"
$AB eval "JSON.stringify({
  subCities: [...document.querySelectorAll('table tbody tr')].filter(r=>/SUB CITY/.test(r.textContent)).length,
  woredaRows: [...document.querySelectorAll('table tbody tr')].filter(r=>/WOREDA/.test(r.textContent)).length,
  editButtons: [...document.querySelectorAll('table tbody tr')].filter(r=>r.textContent.includes('Edit')).length,
  boleW01Visible: [...document.querySelectorAll('table tbody tr')].some(r=>r.textContent.includes('AA-BOLE-W01')),
  headers: [...document.querySelectorAll('table thead th')].map(t=>t.textContent.trim())
})" 2>/dev/null
echo "bole-w01 row: $($AB eval "JSON.stringify([...document.querySelectorAll('table tbody tr')].map(tr=>tr.textContent.trim().slice(0,130)).filter(t=>t.includes('AA-BOLE-W01')))" 2>/dev/null)"

# Edit a woreda under a NON-default sub-city (AA-BOLE-W01), OM name only
$AB eval "(()=>{const tr=[...document.querySelectorAll('table tbody tr')].find(r=>r.textContent.includes('AA-BOLE-W01'));if(!tr)return 'NO_ROW';const b=[...tr.querySelectorAll('button')].find(b=>b.textContent.trim()==='Edit');b.click();return 'clicked'})()" 2>/dev/null
sleep 2
$AB eval "(()=>{const d=document.querySelector('[role=dialog]');if(!d)return 'NO_DIALOG';const ins=[...d.querySelectorAll('input')];const set=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};set(ins[2],'Wolfensuu Boolee W01');return 'filled'})()" 2>/dev/null
$AB eval "(()=>{const d=document.querySelector('[role=dialog]');const b=[...d.querySelectorAll('button')].find(b=>/Save changes/.test(b.textContent));b.click();return 'saved'})()" 2>/dev/null
sleep 3
echo "after-save bole-w01: $($AB eval "JSON.stringify([...document.querySelectorAll('table tbody tr')].map(tr=>tr.textContent.trim().slice(0,130)).filter(t=>t.includes('AA-BOLE-W01')))" 2>/dev/null)"

$AB open "$BASE/parties"; sleep 5
echo "parties link: $($AB eval "(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/settings#org');return a? 'LINK OK: '+a.parentElement.textContent.trim().slice(0,110):'NO_LINK'})()" 2>/dev/null)"

$AB screenshot /home/z/my-project/download/settings-org-all-woredas.png 2>/dev/null
$AB close 2>/dev/null
echo done
