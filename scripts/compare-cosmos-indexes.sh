#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: $0 <resource-group> <account-name> <database-name>" >&2
  exit 2
fi

RG=$1
ACCOUNT=$2
DATABASE=$3

if ! command -v az >/dev/null 2>&1; then
  echo "error: az CLI not found. Install Azure CLI and login before running." >&2
  exit 3
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required for JSON normalization." >&2
  exit 4
fi

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SPEC_FILE="$ROOT_DIR/database/cosmos-target-indexing-policies.json"
if [[ ! -f $SPEC_FILE ]]; then
  echo "error: expected spec at $SPEC_FILE" >&2
  exit 5
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

containers=$(jq -r 'keys[]' "$SPEC_FILE")
status=0

for name in $containers; do
  echo "===> Checking container: $name"
  expected_file="$TMP_DIR/${name}-expected.json"
  jq -S ".[\"$name\"]" "$SPEC_FILE" >"$expected_file"

  if [[ ! -s $expected_file || $(cat "$expected_file") == "null" ]]; then
    echo "warning: no expected policy defined for $name" >&2
    status=1
    continue
  fi

  live_file="$TMP_DIR/${name}-live.json"
  if ! az cosmosdb sql container show -g "$RG" -a "$ACCOUNT" -d "$DATABASE" -n "$name" \
    --query resource.indexingPolicy -o json >"$live_file"; then
    echo "error: failed to fetch container $name" >&2
    status=1
    continue
  fi

  jq -S '.' "$live_file" >"$TMP_DIR/${name}-live.sorted.json"

  if ! diff -u "$expected_file" "$TMP_DIR/${name}-live.sorted.json"; then
    echo "::error::Indexing policy drift detected for $name" >&2
    status=1
  else
    echo "OK"
  fi
  echo
done

exit $status