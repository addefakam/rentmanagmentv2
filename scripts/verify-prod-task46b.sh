#!/bin/bash
# Task 46 refinement PRODUCTION verify (read-only): bureau head group order
# Overview -> Administration -> Insights; card order settings-first.
set -u
AB="agent-browser"
BASE="https://rentmanagmentv2-ndhb.vercel.app"
SHOTS="/home/z/my-project/download"

$AB close 2>/dev/null
$AB set viewport 1440 900
$AB open "$BASE/login?city=AA" > /dev/null 2>&1
sleep 4
$AB find label "Staff code" fill "STF-0005" > /dev/null 2>&1
sleep 1
$AB find text "Sign in" click > /dev/null 2>&1
for i in $(seq 1 25); do
  sleep 2
  U=$($AB get url 2>/dev/null)
  case "$U" in *"/login"*) ;; *) break ;; esac
done
sleep 4
echo "url: $($AB get url)"
$AB eval "JSON.stringify({groups: Array.from(document.querySelectorAll('nav[aria-label=Console] > div > p')).map(p=>p.textContent), links: Array.from(document.querySelectorAll('nav[aria-label=Console] a')).map(a=>a.getAttribute('href')), cards: Array.from(document.querySelectorAll('main a')).filter(a=>['/settings#org','/reports#bureau'].includes(a.getAttribute('href'))).map(a=>a.getAttribute('href'))})" 2>/dev/null
$AB screenshot "$SHOTS/prod-task46b-bureau-head-order.png" > /dev/null 2>&1 || true
echo "=== done ==="
