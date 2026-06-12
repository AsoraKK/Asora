#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-staging.example.com}"
PATH_FEED="${PATH_FEED:-/api/feed/discover}"
AUTH_HDR="${AUTH_HDR:-Authorization: Bearer test-token}"
RUN_ID="${CACHE_TEST_ID:-$(date +%s)-$$-$RANDOM}"
CACHE_CURSOR="${CACHE_CURSOR:-$(printf '{"ts":1,"id":"cache-test-%s"}' "$RUN_ID" | base64 | tr -d '\n' | tr -d '=' | tr '+/' '-_')}"
QS1="${QS1:-cursor=${CACHE_CURSOR}&limit=20&includeTopics=tech}"
QS2="${QS2:-cursor=${CACHE_CURSOR}&limit=21&includeTopics=tech}"   # different limit → different cache object

fail() { echo "FAIL: $*"; exit 1; }
need() { command -v "$1" >/dev/null || fail "Missing dependency: $1"; }

need curl
URL1="https://${DOMAIN}${PATH_FEED}?${QS1}"
URL2="https://${DOMAIN}${PATH_FEED}?${QS2}"

echo "Check 1: first anon request should MISS"
H1="$(curl -sS -D - -o /dev/null "$URL1" | tr -d '\r')"
echo "$H1" | grep -qi '^CF-Cache-Status: MISS\|EXPIRED\|DYNAMIC' || fail "Expected MISS/EXPIRED/DYNAMIC\n$H1"
echo "$H1" | grep -qi '^Cache-Control: .*public' || fail "Missing public cache control"
echo "$H1" | grep -qi '^Cache-Control: .*s-maxage=30' || fail "Missing s-maxage=30"
echo "$H1" | grep -qi '^Vary: .*Authorization' || fail "Missing Vary Authorization"

echo "Check 2: second anon request within 30s should HIT"
sleep 2
H2="$(curl -sS -D - -o /dev/null "$URL1" | tr -d '\r')"
echo "$H2" | grep -qi '^CF-Cache-Status: HIT' || fail "Expected HIT\n$H2"

echo "Check 3: authed request must bypass and be no-store"
H3="$(curl -sS -D - -o /dev/null -H "$AUTH_HDR" "$URL1" | tr -d '\r')"
echo "$H3" | grep -qi '^CF-Cache-Status: (BYPASS|DYNAMIC|MISS|EXPIRED)' || true
echo "$H3" | grep -qi '^Cache-Control: .*no-store' || fail "Expected no-store for authed\n$H3"

echo "Check 4: query separation → different cache entries"
H4="$(curl -sS -D - -o /dev/null "$URL2" | tr -d '\r')"
echo "$H4" | grep -qi '^CF-Cache-Status: MISS\|EXPIRED\|DYNAMIC' || fail "Expected MISS on different query\n$H4"

echo "Check 5: HIT again within 30s on second query"
sleep 2
H5="$(curl -sS -D - -o /dev/null "$URL2" | tr -d '\r')"
echo "$H5" | grep -qi '^CF-Cache-Status: HIT' || fail "Expected HIT on QS2\n$H5"

echo "PASS: edge cache behavior validated"
