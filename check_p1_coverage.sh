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

threshold=80
if [ "$coverage" -lt "$threshold" ]; then
  echo "Coverage gate FAILED (${coverage}% < ${threshold}%)."
  echo "Add tests under test/p1_modules/ to increase coverage."
  exit 1
fi

echo "Coverage gate PASSED (${coverage}% >= ${threshold}%)."
exit 0

