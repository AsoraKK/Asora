#!/usr/bin/env bash
set -euo pipefail

THRESHOLD=${1:-85}
LCOV_FILE=${2:-coverage/lcov.info}

if [ ! -f "$LCOV_FILE" ]; then
  echo "Flutter coverage file missing: $LCOV_FILE" >&2
  exit 1
fi

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

