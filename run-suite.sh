#!/bin/zsh
set -u
cd /Users/shadracklilan/Workdir/institute/digitalhub-frontend
S=/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/7d36f958-aa69-467e-968e-e46f88c181e4/scratchpad
B=$S/bench
run() { # label
  local l=$1
  echo "== $l on $(git branch --show-current) @ $(git log --oneline -1 | cut -c1-8) $(date +%H:%M:%S)"
  npx dotenv -c development -- npx tsx $B/crawl-roles.mts $l 2>&1 | grep -vE '^prisma' | tail -1
  npx dotenv -c development -- npx tsx $B/capture.mts $l martin.odegaard@test.com lime-gorilla 2>&1 | grep -E '^\{' | cut -c1-120
  npx dotenv -c development -- npx tsx $B/capture-attendance.mts $l martin.odegaard@test.com 2>&1 | grep -E '^\{' | cut -c1-160
  npx dotenv -c development -- npx tsx $B/capture-hooks.mts $l 2>&1 | grep -E '^\{' | cut -c1-120
  npx dotenv -c development -- npx tsx $B/capture-memo.mts $l 2>&1 | grep -vE '^prisma' | tail -1
  npx dotenv -c development -- npx tsx $B/capture-forms.mts $l 2>&1 | grep -vE '^prisma' | tail -5
  echo "== done $l $(date +%H:%M:%S)"
}
rm -rf $B/out/crawl-before $B/out/crawl-after $B/out/before $B/out/after $B/out/attendance-* $B/out/hooks-* $B/out/memo-* $B/out/forms-*
git checkout -q dev && sleep 3 && run before
git checkout -q fix/ENG-2144-exhaustive-deps && sleep 3 && run after
echo "== DIFFS =="
node -e '
const fs=require("fs");const B=process.argv[1];
const strip=(o)=>JSON.parse(JSON.stringify(o,(k,v)=>["loadMs","documentBytes","other","label"].includes(k)?undefined:v));
function cmp(name,a,b){ const A=JSON.stringify(strip(a)),Bs=JSON.stringify(strip(b)); console.log(`${name}: ${A===Bs?"IDENTICAL":"DIFFERENT"}`); if(A!==Bs){ let i=0; while(i<A.length&&A[i]===Bs[i]) i++; console.log("   before:",A.slice(Math.max(0,i-100),i+150)); console.log("   after: ",Bs.slice(Math.max(0,i-100),i+150)); } }
const a=JSON.parse(fs.readFileSync(`${B}/out/crawl-before/results.json`)),b=JSON.parse(fs.readFileSync(`${B}/out/crawl-after/results.json`));
let same=0,diff=[];for (const k of Object.keys(a)){const x=a[k],y=b[k]; if(y&&x.status===y.status&&x.text===y.text&&JSON.stringify(x.pageErrors)===JSON.stringify(y.pageErrors)&&JSON.stringify(x.consoleErrors)===JSON.stringify(y.consoleErrors)) same++; else diff.push(k);}
console.log(`crawl: routes ${Object.keys(a).length} same ${same} diff ${diff.length} ${diff.join(", ")}`);
console.log("after pageErrors:", Object.entries(b).filter(([,v])=>v.pageErrors.length).map(([k,v])=>`${k}: ${v.pageErrors[0]}`).join(" | ")||"none");
console.log("after non-200:", Object.entries(b).filter(([,v])=>v.status!==200).map(([k,v])=>`${k}=${v.status}`).join(", ")||"none");
for (const [name,dir] of [["case-notes",""],["attendance","attendance-"],["hooks","hooks-"],["memo","memo-"],["forms","forms-"]]) { try { cmp(name, JSON.parse(fs.readFileSync(`${B}/out/${dir}before/metrics.json`)), JSON.parse(fs.readFileSync(`${B}/out/${dir}after/metrics.json`))); } catch(e){ console.log(`${name}: missing (${String(e).slice(0,80)})`); } }
' $B
psql shamiri_db -Atc "delete from monthly_supervisor_evaluation where id like 'bench_%'; delete from weekly_fellow_ratings where id like 'bench_%'; delete from intervention_session_ratings where id like 'bench_%';" | tail -1
echo "== SUITE COMPLETE $(date +%H:%M:%S) on $(git branch --show-current)"
