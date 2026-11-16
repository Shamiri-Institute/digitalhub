#!/usr/bin/env sh
# Prints the spec files one E2E job runs: its share, by measured duration, of every spec or of the
# specs a pull request selected.
#   scripts/ci/e2e-shard-files.sh <shard> <shard count> <"all" | spec files>
set -eu
shard=$1
count=$2
selection=$3
if [ "$selection" != all ]; then
  export E2E_SPECS="$selection"
fi
files=$(pnpm exec tsx scripts/ci/e2e-shard.ts "$shard" "$count")
# With no files Playwright would run every spec, hiding a split that lost some.
if [ -z "$files" ]; then
  echo "shard $shard of $count has no spec files" >&2
  exit 1
fi
printf '%s\n' "$files"
