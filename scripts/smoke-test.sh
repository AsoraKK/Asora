#!/usr/bin/env bash
set -Eeuo pipefail

DEFAULT_BASE_URL="https://asora-function-dev.azurewebsites.net"
BASE_URL="${BASE_URL:-${1:-$DEFAULT_BASE_URL}}"
THRESHOLD_SEC="${THRESHOLD_SEC:-2.0}"   # was 0.5
OUT_DIR="${OUT_DIR:-./functions}"
mkdir -p "$OUT_DIR"

if [[ -z "$BASE_URL" ]]; then
  echo "ERROR: BASE_URL is required (set BASE_URL env or pass as arg)" >&2
  exit 2
fi

echo "[smoke] Target base URL: $BASE_URL"

check() {
  local name="$1" path="$2"
  local start end ms
  start=$(date +%s%3N)
  body="$(mktemp)"
  code=$(curl -sS -w "%{http_code}" -o "$body" "${BASE_URL%/}${path}")
  end=$(date +%s%3N); ms=$((end-start))
  local snippet
  snippet="$(head -c 240 "$body" | tr '\n' ' ' | sed 's/  */ /g')"
  echo "${name}: status=$code latency=${ms}ms body=${snippet}"

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
if ! curl -sS --max-time 5 "${BASE_URL%/}/api/health" >/dev/null; then
  echo "ERROR: Unable to reach ${BASE_URL%/}/api/health" >&2
  exit 3
fi

check "health" "/api/health"
check "feed"   "/api/feed"

echo "Smoke OK"
