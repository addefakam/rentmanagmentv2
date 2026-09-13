#!/bin/bash
# Task 43 browser verification: bureau head view + sub-city officer view.
set -u
AB="agent-browser"
BASE="http://localhost:3210"

signin() { # city code
  $AB open "$BASE/login?city=$1" > /dev/null 2>&1
  sleep 4
  $AB find label "Staff code" fill "$2" > /dev/null 2>&1
  sleep 1
  $AB find text "Sign in" click > /dev/null 2>&1
  for i in $(seq 1 10); do case "$($AB get url 2>/dev/null)" in */login*) sleep 2 ;; *) break ;; esac; done
  $AB get url 2>/dev/null
}

$AB close 2>/dev/null
$AB set viewport 1440 900

echo "===== BUREAU HEAD STF-0005 ====="
signin AA STF-0005
$AB open "$BASE/settings#org"
sleep 5
echo "tabs: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()))" 2>/dev/null)"
echo "creation heading: $($AB eval "(()=>{const p=[...document.querySelectorAll('p')].find(x=>x.textContent.includes('Found a new sub-city'));return p?p.textContent:'MISSING'})()" 2>/dev/null)"
echo "officer field present: $($AB eval "JSON.stringify([...document.querySelectorAll('label')].some(l=>l.textContent.includes('Responsible officer')))" 2>/dev/null)"
echo "level field: $($AB eval "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.trim()==='Level');return l?l.parentElement.querySelector('input,select')?.value??l.parentElement.textContent.trim().slice(0,40):'MISSING'})()" 2>/dev/null)"
$AB screenshot /home/z/my-project/download/task43-bureau-head-org.png 2>/dev/null

echo "===== SUB-CITY OFFICER STF-2003 ====="
signin AA STF-2003
$AB open "$BASE/settings#org"
sleep 5
echo "tabs: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('[role=tab]')).map(t=>t.textContent.trim()))" 2>/dev/null)"
echo "org rows: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,60)))" 2>/dev/null)"
$AB open "$BASE/settings#staff"
sleep 5
echo "staff rows: $($AB eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(tr=>tr.textContent.trim().slice(0,70)))" 2>/dev/null)"
echo "role options: $($AB eval "(()=>{const ts=[...document.querySelectorAll('[role=combobox]')];const t=ts.find(x=>/Registrar|Stamper|Committee/.test(x.textContent));if(!t)return 'no-role-trigger';t.click();return 'opened'})()" 2>/dev/null)"
sleep 1
echo "role select options: $($AB eval "JSON.stringify([...document.querySelectorAll('[role=option]')].map(o=>o.textContent.trim()))" 2>/dev/null)"
$AB key Escape 2>/dev/null
$AB screenshot /home/z/my-project/download/task43-subcity-officer.png 2>/dev/null
$AB close 2>/dev/null
echo done
