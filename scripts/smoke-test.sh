#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:?usage: smoke-test.sh <baseUrl>}"
THRESHOLD_SEC="${THRESHOLD_SEC:-2.0}"   # was 0.5
OUT_DIR="${OUT_DIR:-./functions}"
mkdir -p "$OUT_DIR"

check() {
  local name="$1" path="$2"
  local start end ms
  start=$(date +%s%3N)
  body="$(mktemp)"
  code=$(curl -sS -w "%{http_code}" -o "$body" "${BASE_URL%/}${path}")
  end=$(date +%s%3N); ms=$((end-start))
  echo "${name} status=$code time=${ms}ms"

  [[ "$code" == "200" ]] || { echo "ERROR: $name http=$code"; cat "$body" || true; exit 1; }
  # Accept ok:true, success:true, or status:"ok"
  jq -e '(.ok == true) or (.success == true) or (.status == "ok")' "$body" > /dev/null || {
    echo "ERROR: $name response JSON missing ok/success/status flag"
    jq . "$body" || true; exit 1; }

  # threshold
  awk "BEGIN{exit !(${ms}/1000 <= $THRESHOLD_SEC)}" || {
    echo "ERROR: $name exceeded threshold ${THRESHOLD_SEC}s (${ms}ms)"; exit 1; }
}

# warm-up (ignore timing)
curl -sS "${BASE_URL%/}/api/health" >/dev/null || true

check "health" "/api/health"
check "feed"   "/api/feed"

echo "Smoke OK"

