#!/usr/bin/env sh
# Runs the spec files one E2E shard was given (scripts/ci/e2e-shard-files.sh prints them).
#   scripts/ci/e2e-run.sh <spec files...>
# payout-run.spec.ts is its own project that depends on the chromium one, and Playwright does not
# filter a dependency by the files named: naming payout-run would run every chromium spec. So the
# shard runs its chromium specs, then payout-run with --no-deps, after them on the same database.
set -eu
others=$(printf '%s\n' "$@" | grep -v 'payout-run\.spec\.ts$' || true)
if [ -n "$others" ]; then
  # shellcheck disable=SC2086 # one spec file per word
  bunx playwright test --project=chromium $others
fi
if printf '%s\n' "$@" | grep -q 'payout-run\.spec\.ts$'; then
  bunx playwright test --project=payout-run --no-deps
fi
