#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .fvmrc ]]; then
  echo "Missing .fvmrc Flutter toolchain pin file." >&2
  exit 1
fi

hardcoded="$(rg -n "^[[:space:]]*flutter-version:[[:space:]]" .github/workflows -S || true)"
if [[ -n "$hardcoded" ]]; then
  echo "Hardcoded flutter-version keys are not allowed. Use flutter-version-file: .fvmrc" >&2
  echo "$hardcoded" >&2
  exit 1
fi

missing_pin_file=""
while IFS= read -r workflow_file; do
  if ! rg -q "flutter-version-file:[[:space:]]*\\.fvmrc" "$workflow_file"; then
    missing_pin_file+="${workflow_file}"$'\n'
  fi
done < <(rg -l "subosito/flutter-action@v2" .github/workflows)

if [[ -n "$missing_pin_file" ]]; then
  echo "Found flutter-action workflow(s) not pinned to .fvmrc:" >&2
  echo "$missing_pin_file" >&2
  exit 1
fi

echo "Flutter toolchain pinning validation passed."
