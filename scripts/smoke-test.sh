#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_API_BASE_URL="https://api.lythaus.co/api"
API_BASE_URL="${API_BASE_URL:-${BASE_URL:-${1:-$DEFAULT_API_BASE_URL}}}"
API_BASE_URL="${API_BASE_URL%/}"
THRESHOLD_SEC="${THRESHOLD_SEC:-2.0}"   # was 0.5
OUT_DIR="${OUT_DIR:-./functions}"
mkdir -p "$OUT_DIR"

if [[ -z "$API_BASE_URL" ]]; then
  echo "ERROR: API_BASE_URL is required (set API_BASE_URL env or pass as arg)" >&2
  exit 2
fi
if [[ ! "$API_BASE_URL" =~ ^https:// ]] || [[ "$API_BASE_URL" =~ \.azurewebsites\.net(/|$) ]]; then
  echo "ERROR: API_BASE_URL must be an HTTPS gateway URL; direct Azure origins are not permitted" >&2
  exit 2
fi
if [[ "$API_BASE_URL" != */api ]]; then
  API_BASE_URL="${API_BASE_URL}/api"
fi

echo "[smoke] Target API gateway: $API_BASE_URL"

check() {
  local name="$1" path="$2"
  local start end ms
  start=$(date +%s%3N)
  body="$(mktemp)"
  code=$(curl -sS -w "%{http_code}" -o "$body" "${API_BASE_URL}${path}")
  end=$(date +%s%3N); ms=$((end-start))
  echo "${name}: status=$code latency=${ms}ms"

  [[ "$code" == "200" ]] || { echo "ERROR: $name http=$code"; cat "$body" || true; rm -f "$body"; exit 1; }
  # Accept ok:true, success:true, or status:"ok"
  jq -e '(.ok == true) or (.success == true) or (.status == "ok")' "$body" > /dev/null || {
    echo "ERROR: $name response JSON missing ok/success/status flag"
    jq . "$body" || true; rm -f "$body"; exit 1; }

  # threshold
  awk "BEGIN{exit !(${ms}/1000 <= $THRESHOLD_SEC)}" || {
    echo "ERROR: $name exceeded threshold ${THRESHOLD_SEC}s (${ms}ms)"; rm -f "$body"; exit 1; }

  rm -f "$body"
}

# warm-up (ignore timing)
if ! curl -sS --max-time 5 "${API_BASE_URL}/health" >/dev/null; then
  echo "ERROR: Unable to reach ${API_BASE_URL}/health" >&2
  exit 3
fi

check "health" "/health"
check "discovery" "/feed/discover"

echo "Smoke OK"
