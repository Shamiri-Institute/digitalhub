#!/usr/bin/env sh
# Prints step outputs: unit=all|changed|none e2e=all|<spec files>|none shards=<JSON list>
#   scripts/ci/affected.sh <event> <base sha> <e2e shards> [head]
set -eu
event=$1
base=$2
shards=$3
head=${4:-HEAD}

all_shards=$(seq -s, 1 "$shards")
everything() {
  echo "unit=all"
  echo "e2e=all"
  echo "shards=[$all_shards]"
  exit 0
}

[ "$event" = pull_request ] || everything
changed=$(git diff --name-only "$base"..."$head")

inert='^(.*\.md|LICENSE|\.agents/.*|\.claude/.*|\.github/copilot-instructions\.md)$'
# Reach unit tests without an import `vitest --changed` can follow.
unit_wide='^(drizzle/.*|db/seed/.*|package\.json|pnpm-lock\.yaml|vitest\.config\.ts|tests/unit/setup\.ts|tsconfig\.json|\.github/.*|scripts/ci/.*)$'
# Specs drive the app over HTTP, so no import graph links app code to them: any change other than a
# spec runs every spec.
spec='^tests/e2e/.*\.spec\.ts$'

reachable=$(printf '%s\n' "$changed" | grep -Ev "$inert" || true)
if [ -z "$reachable" ]; then
  echo "unit=none"
  echo "e2e=none"
  echo "shards=[]"
  exit 0
fi

if printf '%s\n' "$reachable" | grep -Eq "$unit_wide"; then
  echo "unit=all"
else
  echo "unit=changed"
fi

app=$(printf '%s\n' "$reachable" | grep -Ev "$spec" | grep -Ev '^tests/unit/' || true)
if [ -n "$app" ]; then
  echo "e2e=all"
  echo "shards=[$all_shards]"
else
  specs=$(printf '%s\n' "$reachable" | grep -E "$spec" || true)
  if [ -z "$specs" ]; then
    echo "e2e=none"
    echo "shards=[]"
  else
    existing=$(printf '%s\n' "$specs" | while read -r f; do if [ -f "$f" ]; then echo "$f"; fi; done)
    if [ -z "$existing" ]; then
      echo "e2e=none"
      echo "shards=[]"
    else
      echo "e2e=$(printf '%s\n' "$existing" | tr '\n' ' ')"
      count=$(printf '%s\n' "$existing" | wc -l)
      echo "shards=[$(seq -s, 1 $((count < shards ? count : shards)))]"
    fi
  fi
fi
