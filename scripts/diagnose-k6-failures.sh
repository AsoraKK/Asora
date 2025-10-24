#!/bin/bash
# Diagnose k6 smoke test failures
# This script checks if the Azure Function App is properly deployed and routes are registered

set -e

BASE_URL="${K6_BASE_URL:-https://asora-function-dev.azurewebsites.net}"
FUNCTION_APP="${FUNC_APP:-asora-function-dev}"
RESOURCE_GROUP="${RG:-asora-psql-flex}"

echo "🔍 Diagnosing k6 smoke test failures"
echo "===================================="
echo ""

# Check 1: Basic HTTP connectivity
echo "📡 Check 1: HTTP Connectivity"
echo "Testing: GET $BASE_URL/api/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

echo "Status Code: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Check 2: Function App state
echo "🔧 Check 2: Azure Function App State"
if command -v az &> /dev/null; then
  az functionapp show \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --query "{State: state, Runtime: properties.functionAppConfig.runtime, SourceControl: sourceControl.repoUrl}" \
    -o json || echo "⚠️  Could not retrieve function app state (not logged in?)"
else
  echo "⚠️  Azure CLI not available, skipping function app state check"
fi
echo ""

# Check 3: Deployment information
echo "🚀 Check 3: Deployment Information"
echo "Compiled dist folder exists: $([ -d functions/dist ] && echo '✅ Yes' || echo '❌ No')"
echo "Index.js exists: $([ -f functions/dist/src/index.js ] && echo '✅ Yes' || echo '❌ No')"
echo "Health route exists: $([ -f functions/dist/src/shared/routes/health.js ] && echo '✅ Yes' || echo '❌ No')"
echo ""

# Check 4: Recommendations
echo "💡 Troubleshooting Steps:"
if [ "$HTTP_CODE" = "404" ]; then
  echo "❌ Health endpoint returning 404. This suggests:"
  echo "   1. Functions haven't been deployed to Azure yet"
  echo "   2. The route registration is misconfigured"
  echo ""
  echo "   ✅ Solution: Deploy functions using:"
  echo "      ./deploy-functions-manual.sh"
  echo "      OR"
  echo "      Trigger the GitHub workflow: .github/workflows/deploy-asora-function-dev.yml"
elif [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health endpoint is responding correctly"
  echo "   The k6 test failure may be due to:"
  echo "   1. Other routes being unavailable"
  echo "   2. Rate limiting"
  echo "   3. Cold start timeouts"
else
  echo "⚠️  Unexpected status code: $HTTP_CODE"
fi
