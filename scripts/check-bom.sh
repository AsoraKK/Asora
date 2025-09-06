#!/usr/bin/env bash
set -euo pipefail

# Find files containing UTF-8 BOM (EF BB BF)
bad=$(git grep -Il $'\xEF\xBB\xBF' || true)

if [[ -n "${bad:-}" ]]; then
  echo "BOM found in:"
  printf '%s\n' "$bad"
  exit 1
fi

