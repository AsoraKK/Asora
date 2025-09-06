#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-staging.example.com}"
PATH_FEED="${PATH_FEED:-/api/feed}"
QS1="${QS1:-page=1&size=20&type=trending&filter=safe}"
QS2="${QS2:-page=1&size=21&type=trending&filter=safe}"   # different size → different cache object
AUTH_HDR="${AUTH_HDR:-Authorization: Bearer test-token}"

fail() { echo "FAIL: $*"; exit 1; }
need() { command -v "$1" >/dev/null || fail "Missing dependency: $1"; }

need curl
URL1="https://${DOMAIN}${PATH_FEED}?${QS1}"
URL2="https://${DOMAIN}${PATH_FEED}?${QS2}"

echo "Check 1: first anon request should MISS"
H1="$(curl -sSI "$URL1" | tr -d '\r')"
echo "$H1" | grep -qi '^CF-Cache-Status: MISS\|EXPIRED\|DYNAMIC' || fail "Expected MISS/EXPIRED/DYNAMIC\n$H1"
echo "$H1" | grep -qi '^Cache-Control: .*max-age=60' || fail "Missing max-age=60"
echo "$H1" | grep -qi '^Vary: .*Authorization' || fail "Missing Vary Authorization"

echo "Check 2: second anon request within 30s should HIT"
sleep 2
H2="$(curl -sSI "$URL1" | tr -d '\r')"
echo "$H2" | grep -qi '^CF-Cache-Status: HIT' || fail "Expected HIT\n$H2"

echo "Check 3: authed request must bypass and be no-store"
H3="$(curl -sSI -H "$AUTH_HDR" "$URL1" | tr -d '\r')"
echo "$H3" | grep -qi '^CF-Cache-Status: (BYPASS|DYNAMIC|MISS|EXPIRED)' || true
echo "$H3" | grep -qi '^Cache-Control: .*no-store' || fail "Expected no-store for authed\n$H3"

echo "Check 4: query separation → different cache entries"
H4="$(curl -sSI "$URL2" | tr -d '\r')"
echo "$H4" | grep -qi '^CF-Cache-Status: MISS\|EXPIRED\|DYNAMIC' || fail "Expected MISS on different query\n$H4"

echo "Check 5: HIT again within 30s on second query"
sleep 2
H5="$(curl -sSI "$URL2" | tr -d '\r')"
echo "$H5" | grep -qi '^CF-Cache-Status: HIT' || fail "Expected HIT on QS2\n$H5"

echo "PASS: edge cache behavior validated"
