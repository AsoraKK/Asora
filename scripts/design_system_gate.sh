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
  local default_branch="${DESIGN_SYSTEM_GATE_DEFAULT_BRANCH:-main}"

  # workflow_dispatch does not populate github.event.before or a pull-request
  # base SHA. Resolve the repository default branch explicitly so the gate
  # still examines only the change under review rather than failing on legacy
  # code outside its scope.
  if [ -z "$base" ]; then
    local default_ref="origin/${default_branch}"
    if ! git cat-file -e "${default_ref}^{commit}" 2>/dev/null; then
      echo "Design system gate could not resolve ${default_ref}." >&2
      exit 2
    fi
    base="$(git merge-base "$default_ref" HEAD)" || {
      echo "Design system gate could not determine a merge base for ${default_ref}." >&2
      exit 2
    }
  fi

  if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
    echo "Design system gate base is not an available commit." >&2
    exit 2
  fi

  mapfile -t target_files < <(
    git diff --name-only --diff-filter=ACMR "$base"...HEAD -- 'lib/**/*.dart' \
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
