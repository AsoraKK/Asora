#!/usr/bin/env bash
set -Eeuo pipefail

PLAN_FILE="${1:-tfplan}"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not found in PATH" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found in PATH" >&2
  exit 2
fi

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "plan file not found: $PLAN_FILE" >&2
  exit 2
fi

echo "[tf-safety] inspecting plan: $PLAN_FILE"

DESTROY_COUNT="$(
  terraform show -json "$PLAN_FILE" | jq '
    [.resource_changes[]?
      | select(
          (.change.actions | index("delete")) or
          (.change.actions | index("delete_then_create"))
        )
    ] | length
  '
)"

if [[ "${DESTROY_COUNT}" != "0" ]]; then
  echo "[tf-safety] FAIL: plan contains ${DESTROY_COUNT} destructive changes" >&2
  terraform show -json "$PLAN_FILE" | jq -r '
    .resource_changes[]?
    | select(
        (.change.actions | index("delete")) or
        (.change.actions | index("delete_then_create"))
      )
    | "- \(.address): \(.change.actions | join(","))"
  ' >&2
  exit 1
fi

echo "[tf-safety] PASS: no destructive actions in plan"
