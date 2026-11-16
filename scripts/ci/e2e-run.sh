#!/usr/bin/env sh
# scripts/ci/e2e-run.sh <shard> <total> [spec files]
# payout-run depends on the chromium project, and Playwright runs a dependency unsharded, so the
# last shard runs payout-run after its share of chromium.
set -eu
shard=$1
total=$2
shift 2
specs=$(printf '%s\n' "$@" | grep -v 'payout-run\.spec\.ts$' || true)
# Named no files, Playwright runs every spec.
if [ $# -eq 0 ] || [ -n "$specs" ]; then
  # shellcheck disable=SC2086 # one spec file per word
  pnpm exec playwright test --project=chromium --shard="$shard/$total" --pass-with-no-tests $specs
fi
if [ "$shard" = "$total" ] && { [ $# -eq 0 ] || printf '%s\n' "$@" | grep -q 'payout-run\.spec\.ts$'; }; then
  pnpm exec playwright test --project=payout-run --no-deps
fi
