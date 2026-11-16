#!/usr/bin/env sh
# Runs a command to completion and fails when it took longer than its budget, so CI stays fast:
# a check that creeps past its budget fails like a broken one, with its own output still shown.
# Budgets are set for the runners in CI_RUNNER_8; until those exist (CI_ENFORCE_BUDGETS unset), an
# overrun is reported as a warning.
#   scripts/ci/budget.sh <seconds> <command> [args...]
set -u
budget=$1
shift
start=$(date +%s%N)
"$@"
status=$?
elapsed_ms=$((($(date +%s%N) - start) / 1000000))
echo "budget: $* took ${elapsed_ms}ms of ${budget}s"
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
if [ "$elapsed_ms" -gt $((budget * 1000)) ]; then
  if [ "${CI_ENFORCE_BUDGETS:-}" = true ]; then
    echo "::error::$* took ${elapsed_ms}ms, over its ${budget}s budget"
    exit 1
  fi
  echo "::warning::$* took ${elapsed_ms}ms, over its ${budget}s budget (not enforced on this runner)"
fi
