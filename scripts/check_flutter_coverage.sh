#!/usr/bin/env bash
set -euo pipefail

THRESHOLD=${1:-80}
LCOV_FILE=${2:-coverage/lcov.info}

if [ ! -f "$LCOV_FILE" ]; then
  echo "Flutter coverage file missing: $LCOV_FILE" >&2
  exit 2
fi

PY=./parse_coverage.py
if [ ! -f "$PY" ]; then
  echo "Helper parser $PY not found; falling back to awk parser" >&2
  # Fallback to original awk-based check
  awk -F, -v threshold="$THRESHOLD" '
    /^DA:/ { total++; if ($2>0) hit++ }
    END {
      if (total==0) { print "No coverage data (DA lines) found"; exit 1 }
      cov=100*hit/total;
      printf "Flutter line coverage: %.2f%%\n", cov;
      if (cov < threshold) {
        printf "Coverage below %d%% threshold\n", threshold;
        exit 1;
      }
    }
  ' "$LCOV_FILE"
  exit $?
fi

python3 "$PY" "$LCOV_FILE" "$THRESHOLD"
exit $?

