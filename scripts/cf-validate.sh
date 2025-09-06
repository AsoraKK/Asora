#!/usr/bin/env bash
set -euo pipefail

CF_URL="${CF_URL:-https://api.your-domain.com}" # base URL in front of Cloudflare

echo "Testing Cloudflare feed cache at ${CF_URL}/api/feed?page=1"

hdr1=$(mktemp)
curl -sS -D "$hdr1" -o /dev/null "$CF_URL/api/feed?page=1"
grep -qi "X-Cache: MISS" "$hdr1" || { echo "Expected MISS on first request"; cat "$hdr1"; exit 1; }

sleep 1

hdr2=$(mktemp)
curl -sS -D "$hdr2" -o /dev/null "$CF_URL/api/feed?page=1"
grep -qi "X-Cache: HIT" "$hdr2" || { echo "Expected HIT on second request"; cat "$hdr2"; exit 1; }

hdr3=$(mktemp)
curl -sS -H "Authorization: Bearer test" -D "$hdr3" -o /dev/null "$CF_URL/api/feed?page=1"
grep -qi "X-Cache: BYPASS" "$hdr3" || { echo "Expected BYPASS when Authorization present"; cat "$hdr3"; exit 1; }

echo "Cloudflare feed cache validation passed"

