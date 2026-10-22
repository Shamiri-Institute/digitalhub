#!/bin/bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
jar="$root/.cache/tla2tools.jar"
expected="936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"
url="https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar"
config="AttendancePayout.cfg"

if [[ "${1:-}" == "--bug" ]]; then
  config="AttendancePayoutBug.cfg"
elif [[ "${1:-}" != "" ]]; then
  echo "usage: check.sh [--bug]" >&2
  exit 2
fi

mkdir -p "$root/.cache"
if [[ ! -f "$jar" ]] || [[ "$(shasum -a 256 "$jar" | awk '{print $1}')" != "$expected" ]]; then
  curl -fsSL -o "$jar" "$url"
  actual="$(shasum -a 256 "$jar" | awk '{print $1}')"
  if [[ "$actual" != "$expected" ]]; then
    echo "tla2tools.jar checksum mismatch" >&2
    exit 1
  fi
fi

meta="$(mktemp -d)"
trap 'rm -rf "$meta"' EXIT

cd "$root"
java -XX:+UseParallelGC -jar "$jar" -workers 1 -nowarning -cleanup -metadir "$meta" -config "$config" AttendancePayout.tla
