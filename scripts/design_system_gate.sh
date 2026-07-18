#!/usr/bin/env bash
set -euo pipefail

rg --version >/dev/null 2>&1 || {
  echo "Design system gate requires ripgrep (rg)." >&2
  exit 2
}

violations=0

search() {
  local pattern="$1"
  shift
  local output
  local status

  set +e
  output="$(rg -n "$pattern" "$@" 2>&1)"
  status=$?
  set -e

  if [ "$status" -gt 1 ]; then
    printf '%s\n' "$output" >&2
    exit "$status"
  fi

  printf '%s' "$output"
}

resolve_target_files() {
  local base="${DESIGN_SYSTEM_GATE_BASE:-}"

  if [ -n "$base" ] && git cat-file -e "${base}^{commit}" 2>/dev/null; then
    mapfile -t target_files < <(
      git diff --name-only --diff-filter=ACMR "$base"...HEAD -- 'lib/**/*.dart' \
        | awk '!/^lib\/(design_system|generated)\//'
    )
    return
  fi

  mapfile -t target_files < <(
    git ls-files 'lib/**/*.dart' \
      | awk '!/^lib\/(design_system|generated)\//'
  )
}

declare -a target_files
resolve_target_files

if [ "${#target_files[@]}" -eq 0 ]; then
  echo "Design system gate passed: no production Dart files changed."
  exit 0
fi

report_matches() {
  local label="$1"
  local matches="$2"

  if [ -n "$matches" ]; then
    echo "Design system gate failed: ${label}"
    echo "$matches"
    violations=1
  fi
}

color_matches="$(search "Color\\(0xFF" -- "${target_files[@]}")"
textstyle_matches="$(search "TextStyle\\(" -- "${target_files[@]}")"

report_matches "hardcoded Color(0xFF...) outside design_system" "$color_matches"
report_matches "TextStyle(...) outside design_system" "$textstyle_matches"

if [ "$violations" -ne 0 ]; then
  exit 1
fi

echo "Design system gate passed."
