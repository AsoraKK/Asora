#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-${1:-}}"
FUNCTION_KEY="${FUNCTION_KEY:-anonymous}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: BASE_URL=https://<host> [FUNCTION_KEY=<key>] $0" >&2
  exit 2
fi

QP=""
if [[ "${FUNCTION_KEY}" != "anonymous" && -n "${FUNCTION_KEY}" ]]; then
  QP="?code=${FUNCTION_KEY}"
fi

tmp_feed="$(mktemp)"
tmp_resp="$(mktemp)"
cleanup() {
  rm -f "$tmp_feed" "$tmp_resp"
}
trap cleanup EXIT

echo "[trust-smoke] GET ${BASE_URL%/}/api/feed/discover${QP}"
feed_status="$(curl -sS -o "$tmp_feed" -w "%{http_code}" "${BASE_URL%/}/api/feed/discover${QP}")"
if [[ "$feed_status" != "200" ]]; then
  echo "[trust-smoke] FAIL: feed/discover returned $feed_status" >&2
  cat "$tmp_feed" >&2 || true
  exit 1
fi

post_id="$(jq -r '.items[0].id // empty' "$tmp_feed")"
if [[ -z "$post_id" ]]; then
  echo "[trust-smoke] FAIL: No post id found in discover feed payload" >&2
  cat "$tmp_feed" >&2 || true
  exit 1
fi

echo "[trust-smoke] GET ${BASE_URL%/}/api/posts/${post_id}/receipt${QP}"
receipt_status="$(curl -sS -o "$tmp_resp" -w "%{http_code}" "${BASE_URL%/}/api/posts/${post_id}/receipt${QP}")"
if [[ "$receipt_status" != "200" ]]; then
  echo "[trust-smoke] FAIL: receipt endpoint returned $receipt_status for post ${post_id}" >&2
  cat "$tmp_resp" >&2 || true
  exit 1
fi

jq -e '
  (.postId | type == "string") and
  (.events | type == "array") and
  (.issuedAt | type == "string") and
  (.signature | type == "string") and
  (.keyId | type == "string")
' "$tmp_resp" >/dev/null || {
  echo "[trust-smoke] FAIL: receipt payload missing required fields" >&2
  cat "$tmp_resp" >&2 || true
  exit 1
}

mapfile -t author_ids < <(jq -r '[.items[].authorId] | unique | .[]' "$tmp_feed")
if [[ "${#author_ids[@]}" -eq 0 ]]; then
  echo "[trust-smoke] FAIL: No author ids found in discover feed payload" >&2
  cat "$tmp_feed" >&2 || true
  exit 1
fi

passport_ok="false"
for author_id in "${author_ids[@]}"; do
  echo "[trust-smoke] GET ${BASE_URL%/}/api/users/${author_id}/trust-passport${QP}"
  passport_status="$(curl -sS -o "$tmp_resp" -w "%{http_code}" "${BASE_URL%/}/api/users/${author_id}/trust-passport${QP}")"
  if [[ "$passport_status" == "200" ]]; then
    jq -e '
      (.transparencyStreakCategory | type == "string") and
      (.jurorReliabilityTier | type == "string")
    ' "$tmp_resp" >/dev/null || {
      echo "[trust-smoke] FAIL: trust passport payload missing required fields for user ${author_id}" >&2
      cat "$tmp_resp" >&2 || true
      exit 1
    }
    passport_ok="true"
    break
  fi
done

if [[ "$passport_ok" != "true" ]]; then
  echo "[trust-smoke] FAIL: trust-passport endpoint did not return 200 for any sampled author" >&2
  cat "$tmp_resp" >&2 || true
  exit 1
fi

echo "[trust-smoke] PASS: receipt + trust-passport endpoints healthy"
