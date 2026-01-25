#!/usr/bin/env bash
# scripts/check_api_health.sh
#
# Smoke test to verify that /api/health is reachable and not redirecting to Cloudflare Access.
# Exits with code 0 if healthy, non-zero otherwise.
#
# Usage:
#   ./scripts/check_api_health.sh [BASE_URL]
#
# Examples:
#   ./scripts/check_api_health.sh                                    # Uses default
#   ./scripts/check_api_health.sh https://control.asora.co.za        # Custom URL
#   BASE_URL=https://staging.asora.co.za ./scripts/check_api_health.sh

set -euo pipefail

# Default to production control panel URL
BASE_URL="${1:-${BASE_URL:-https://control.asora.co.za}}"
HEALTH_ENDPOINT="${BASE_URL}/api/health"

echo "=================================================="
echo "API Health Check"
echo "=================================================="
echo "Target: ${HEALTH_ENDPOINT}"
echo "Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""

# Fetch with verbose headers, following redirects but capturing the final URL
RESPONSE=$(curl -sSL -w '\n__STATUS_CODE__:%{http_code}\n__REDIRECT_URL__:%{url_effective}\n__CONTENT_TYPE__:%{content_type}' \
  -H "Accept: application/json" \
  -H "User-Agent: asora-health-check/1.0" \
  --connect-timeout 10 \
  --max-time 30 \
  "${HEALTH_ENDPOINT}" 2>&1) || {
    echo "❌ FAIL: curl request failed"
    echo "Error: ${RESPONSE}"
    exit 1
  }

# Extract metadata from response
BODY=$(echo "${RESPONSE}" | sed -n '1,/__STATUS_CODE__/p' | sed '$d')
STATUS_CODE=$(echo "${RESPONSE}" | grep '__STATUS_CODE__:' | cut -d':' -f2)
FINAL_URL=$(echo "${RESPONSE}" | grep '__REDIRECT_URL__:' | cut -d':' -f2-)
CONTENT_TYPE=$(echo "${RESPONSE}" | grep '__CONTENT_TYPE__:' | cut -d':' -f2-)

echo "Status Code: ${STATUS_CODE}"
echo "Final URL: ${FINAL_URL}"
echo "Content-Type: ${CONTENT_TYPE}"
echo ""

# Check 1: Was there a redirect to Cloudflare Access?
if echo "${FINAL_URL}" | grep -qi 'cloudflareaccess.com'; then
  echo "❌ FAIL: Redirected to Cloudflare Access"
  echo ""
  echo "This means /api/* routes are protected by Cloudflare Access."
  echo "You need to either:"
  echo "  1. Exclude /api/* from the Access application"
  echo "  2. Create a separate Access app for /api/* with a bypass policy"
  echo "  3. Use a service token for machine-to-machine auth"
  echo ""
  exit 1
fi

# Check 2: Did we get a success status code?
if [[ "${STATUS_CODE}" -lt 200 || "${STATUS_CODE}" -ge 400 ]]; then
  echo "❌ FAIL: Unexpected status code ${STATUS_CODE}"
  echo ""
  echo "Response body:"
  echo "${BODY}"
  echo ""
  
  case "${STATUS_CODE}" in
    401|403)
      echo "Hint: Authentication/authorization failure. Check CF Access service tokens."
      ;;
    404)
      echo "Hint: /api/health endpoint not found. Ensure Azure Functions has this route."
      ;;
    500|502|503)
      echo "Hint: Server error. Check Azure Functions logs."
      ;;
    *)
      echo "Hint: Unexpected error. Investigate Azure Functions and Cloudflare config."
      ;;
  esac
  exit 1
fi

# Check 3: Is the response JSON with expected shape?
if ! echo "${CONTENT_TYPE}" | grep -qi 'application/json'; then
  echo "⚠️  WARNING: Response is not JSON (Content-Type: ${CONTENT_TYPE})"
  echo "This might indicate the request was intercepted or proxied incorrectly."
  echo ""
  echo "Response body:"
  echo "${BODY}"
  echo ""
  # Don't fail for this, just warn
fi

# Check 4: Parse JSON response if possible
if command -v jq &> /dev/null; then
  echo "Response:"
  echo "${BODY}" | jq . 2>/dev/null || echo "${BODY}"
  echo ""
  
  # Check for expected fields
  STATUS=$(echo "${BODY}" | jq -r '.status // empty' 2>/dev/null)
  if [[ -n "${STATUS}" ]]; then
    if [[ "${STATUS}" == "healthy" || "${STATUS}" == "ok" || "${STATUS}" == "ready" ]]; then
      echo "✅ Health status: ${STATUS}"
    else
      echo "⚠️  Unexpected health status: ${STATUS}"
    fi
  fi
else
  echo "Response (install jq for pretty printing):"
  echo "${BODY}"
  echo ""
fi

echo ""
echo "✅ PASS: API health check successful"
echo ""
echo "Summary:"
echo "  - No redirect to Cloudflare Access"
echo "  - HTTP ${STATUS_CODE} response"
echo "  - Endpoint is reachable"
exit 0
