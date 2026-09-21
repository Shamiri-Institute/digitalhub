#!/bin/zsh
set -u
cd /Users/shadracklilan/Workdir/institute/digitalhub-frontend
B=/private/tmp/claude-501/-Users-shadracklilan-Workdir-institute-digitalhub-frontend/88b3163f-2751-4602-98a3-5dd2a244bc66/scratchpad/bench
run() {
  local l=$1
  echo "== $l on $(git branch --show-current) @ $(git log --oneline -1 | cut -c1-8) $(date +%H:%M:%S)"
  npx dotenv -c development -- npx tsx $B/crawl-roles.mts $l 2>&1 | grep -vE '^prisma' | tail -1
  npx dotenv -c development -- npx tsx $B/capture-forms.mts $l 2>&1 | grep -vE '^prisma' | tail -5
  npx dotenv -c development -- npx tsx $B/typing.mts $l 2>&1 | grep -vE '^prisma' | tr -d '\n' | tr -s ' '; echo
  npx dotenv -c development -- npx tsx $B/pickers.mts $l 2>&1 | grep -vE '^prisma' | tail -1
  echo "== done $l $(date +%H:%M:%S)"
}
rm -rf $B/out/crawl-before $B/out/crawl-after $B/out/forms-before $B/out/forms-after $B/out/typing-before $B/out/typing-after $B/out/pickers-before $B/out/pickers-after
git checkout -q dev || exit 1
PORT=3001 npm run dev > $B/dev.log 2>&1 &
DEV=$!
until grep -q "Ready in" $B/dev.log; do sleep 1; done
curl -s -o /dev/null http://localhost:3001/login; sleep 2
run before
git checkout -q fix/ENG-2143-deprecated || exit 1
sleep 5; curl -s -o /dev/null http://localhost:3001/login; sleep 2
run after
echo "== DIFFS =="
node -e '
const fs=require("fs");const B=process.argv[1];
const a=JSON.parse(fs.readFileSync(`${B}/out/crawl-before/results.json`)),b=JSON.parse(fs.readFileSync(`${B}/out/crawl-after/results.json`));
let same=0,diff=[];for (const k of Object.keys(a)){const x=a[k],y=b[k]; if(y&&x.status===y.status&&x.text===y.text&&JSON.stringify(x.pageErrors)===JSON.stringify(y.pageErrors)&&JSON.stringify(x.consoleErrors)===JSON.stringify(y.consoleErrors)) same++; else diff.push(k);}
console.log(`crawl: routes ${Object.keys(a).length} same ${same} diff ${diff.length} ${diff.join(", ")}`);
for (const k of diff){const x=a[k],y=b[k]; console.log(" -",k,"status",x.status,y.status,"| text",x.text===y.text?"same":"DIFF","| pe",JSON.stringify(x.pageErrors),JSON.stringify(y.pageErrors),"| ce",JSON.stringify(x.consoleErrors).slice(0,200),JSON.stringify(y.consoleErrors).slice(0,200));}
console.log("after pageErrors:", Object.entries(b).filter(([,v])=>v.pageErrors.length).map(([k,v])=>`${k}: ${v.pageErrors[0]}`).join(" | ")||"none");
console.log("after non-200:", Object.entries(b).filter(([,v])=>v.status!==200).map(([k,v])=>`${k}=${v.status}`).join(", ")||"none");
const strip=(o)=>JSON.stringify(o,(k,v)=>["pageErrors"].includes(k)?undefined:v);
const fa=JSON.parse(fs.readFileSync(`${B}/out/forms-before/metrics.json`)),fb=JSON.parse(fs.readFileSync(`${B}/out/forms-after/metrics.json`));
for (const k of Object.keys(fa)) console.log(`forms ${k}: ${strip(fa[k])===strip(fb[k])?"IDENTICAL":"DIFFERENT"} pe=${JSON.stringify(fa[k].pageErrors)}/${JSON.stringify(fb[k].pageErrors)}`);
' $B
echo "== SCREENSHOTS (md5) =="
cd $B/out; same=0; diff=""; for f in crawl-before/shots/*.png; do n=$(basename $f); a=$(md5 -q $f); b=$(md5 -q crawl-after/shots/$n 2>/dev/null); if [ "$a" = "$b" ]; then same=$((same+1)); else diff="$diff $n"; fi; done; echo "screenshots same=$same diff:$diff"; cd /Users/shadracklilan/Workdir/institute/digitalhub-frontend
for k in sc-new-case-dob sc-new-session-date; do echo "pickers $k: $(cmp -s $B/out/pickers-before/$k.png $B/out/pickers-after/$k.png && echo IDENTICAL-PNG || echo DIFFERENT-PNG)"; done
kill $DEV; lsof -tiTCP:3001 -sTCP:LISTEN | xargs kill 2>/dev/null
echo "== SUITE COMPLETE $(date +%H:%M:%S) on $(git branch --show-current)"
