#!/usr/bin/env bash
set -euo pipefail

violations=0

report_matches() {
  local label="$1"
  local matches="$2"

  if [ -n "$matches" ]; then
    echo "Design system gate failed: ${label}"
    echo "$matches"
    violations=1
  fi
}

color_matches="$(rg -n "Color\\(0xFF" lib --glob '!lib/design_system/**' --glob '!lib/generated/**' --glob '!lib/**/*.md' || true)"
textstyle_matches="$(rg -n "TextStyle\\(" lib --glob '!lib/design_system/**' --glob '!lib/generated/**' --glob '!lib/**/*.md' || true)"

report_matches "hardcoded Color(0xFF...) outside design_system" "$color_matches"
report_matches "TextStyle(...) outside design_system" "$textstyle_matches"

if [ "$violations" -ne 0 ]; then
  exit 1
fi

echo "Design system gate passed."
