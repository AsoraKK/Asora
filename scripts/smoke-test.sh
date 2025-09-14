#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${FUNCTION_BASE_URL:-https://asora-function-dev.azurewebsites.net}"
OUT_DIR="smoke"
THRESHOLD_SEC="0.5"

mkdir -p "$OUT_DIR"

run_check() {
  local name="$1" path="$2"
  local headers="$OUT_DIR/${name}.headers" body="$OUT_DIR/${name}.json"
  echo "Testing ${name}: ${BASE_URL}${path}"
  local out
  out=$(curl -sS -D "$headers" -o "$body" -w "%{http_code} %{time_total}" "${BASE_URL}${path}")
  local code time
  code=$(echo "$out" | awk '{print $1}')
  time=$(echo "$out" | awk '{print $2}')

  echo "status=${code} time_total=${time}s" | tee -a "$OUT_DIR/report.txt"

  if [[ "$code" != "200" ]]; then
    echo "ERROR: ${name} returned HTTP ${code}" | tee -a "$OUT_DIR/report.txt"
    exit 1
  fi

  # Validate JSON and common shape (either ok==true or success==true)
  if ! jq -e '(.ok == true) or (.success == true)' "$body" > /dev/null; then
    echo "ERROR: ${name} response JSON missing ok/success flag" | tee -a "$OUT_DIR/report.txt"
    jq . "$body" || true
    exit 1
  fi

  # Enforce latency threshold
  awk -v t="$time" -v thr="$THRESHOLD_SEC" 'BEGIN{exit (t<thr)?0:1}' || {
    echo "ERROR: ${name} latency ${time}s exceeds ${THRESHOLD_SEC}s" | tee -a "$OUT_DIR/report.txt"
    exit 1
  }

  echo "OK: ${name} passed (<${THRESHOLD_SEC}s)" | tee -a "$OUT_DIR/report.txt"
}

run_check health "/api/health"
run_check feed "/api/feed?page=1"

echo "Smoke tests completed successfully" | tee -a "$OUT_DIR/report.txt"

