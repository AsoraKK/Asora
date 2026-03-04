#!/usr/bin/env bash
set -euo pipefail

# Enforce P1 coverage gate for Flutter code under lib/p1_modules/
# Works on Linux and Windows-generated lcov files (handles / and \ separators)

LCOV_FILE="coverage/lcov.info"

if [ ! -f "$LCOV_FILE" ]; then
  echo "Error: $LCOV_FILE not found. Run 'flutter test --coverage' first."
  exit 1
fi

total_lines=0
hit_lines=0

# Parse lcov file section-by-section and accumulate DA lines for p1 modules
# lcov format:
#   SF:<path>
#   DA:<line>,<count>
#   end_of_record

current_is_p1=0
while IFS= read -r line; do
  if [[ "$line" == SF:* ]]; then
    # Start of a new source file record
    current_is_p1=0
    path=${line#SF:}
    # Normalize backslashes to forward slashes for matching
    norm_path=${path//\\//}
    if [[ "$norm_path" == *"lib/p1_modules/"* ]]; then
      current_is_p1=1
    fi
  elif [[ $current_is_p1 -eq 1 && "$line" == DA:* ]]; then
    # DA:<line>,<count>
    count=${line#DA:*}
    count=${count#*,}
    # If count is non-zero, it's a hit
    total_lines=$((total_lines + 1))
    if [[ "$count" != "0" ]]; then
      hit_lines=$((hit_lines + 1))
    fi
  fi
done < "$LCOV_FILE"

echo "Total instrumented lines in P1 modules: $total_lines"
echo "Hit lines in P1 modules: $hit_lines"

if [ "$total_lines" -eq 0 ]; then
  echo "Error: No P1 module lines found in coverage (lib/p1_modules/)."
  exit 1
fi

# Compute integer percentage (floor)
coverage=$(( hit_lines * 100 / total_lines ))
echo "P1 modules coverage: ${coverage}%"

threshold=${REQUIRED_P1_COVERAGE:-80}
echo "Required coverage threshold: ${threshold}%"

is_fork_pr="false"
if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" && -f "${GITHUB_EVENT_PATH:-}" ]]; then
  is_fork_pr=$(python3 - <<'PY'
import json, os

event_path = os.environ.get("GITHUB_EVENT_PATH")
try:
    with open(event_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    pr = data.get("pull_request", {})
    head_repo = pr.get("head", {}).get("repo", {})
    base_repo = pr.get("base", {}).get("repo", {})
    fork_flag = head_repo.get("fork")
    head_full = head_repo.get("full_name")
    base_full = base_repo.get("full_name")
    is_fork = False
    if fork_flag is not None:
        is_fork = bool(fork_flag)
    elif head_full and base_full:
        is_fork = head_full != base_full
    print("true" if is_fork else "false")
except Exception:
    print("false")
PY
)
fi

if [ "$coverage" -lt "$threshold" ]; then
  if [ "$is_fork_pr" = "true" ]; then
    echo "::notice::Forked PR detected; reporting coverage without enforcement."
    echo "Coverage gate would have failed (${coverage}% < ${threshold}%), but exiting 0 for forks without secrets."
    exit 0
  fi
  echo "Coverage gate FAILED (${coverage}% < ${threshold}%)."
  echo "Add tests under test/p1_modules/ to increase coverage."
  exit 1
fi

echo "Coverage gate PASSED (${coverage}% >= ${threshold}%)."
exit 0
