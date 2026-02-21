#!/usr/bin/env bash
set -euo pipefail

EVIDENCE_FILE="docs/runbooks/store-submission-evidence.md"

if [[ ! -f "$EVIDENCE_FILE" ]]; then
  echo "Missing store submission evidence file: $EVIDENCE_FILE" >&2
  exit 1
fi

required_checks=(
  "Play Console app record exists"
  "Play Data Safety form submitted"
  "Play content rating submitted"
  "Play internal testing release uploaded"
  "Play store listing assets uploaded"
  "App Store Connect app record exists"
  "TestFlight build uploaded"
  "App Privacy details completed"
  "App Store listing assets uploaded"
  "Review notes added for moderation/security"
)

for check in "${required_checks[@]}"; do
  if ! grep -Fq -- "- [x] ${check}" "$EVIDENCE_FILE"; then
    echo "Missing completion marker in ${EVIDENCE_FILE}: ${check}" >&2
    exit 1
  fi
done

echo "Store submission evidence validation passed."
