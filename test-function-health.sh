#!/bin/bash

# Script to list functions and test health endpoint
# Comprehensive Function App health check

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"

echo "=== Function App Health Check ==="
echo "Function App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

echo "=== 1. Function App Status ==="
echo "Checking Function App details..."
az functionapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "{name:name, state:state, kind:kind, enabled:enabled, httpsOnly:httpsOnly}" -o table

echo ""
echo "=== 2. Getting Function App URL ==="
FUNC_HOST=$(az functionapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "defaultHostName" -o tsv)

if [ -n "$FUNC_HOST" ] && [ "$FUNC_HOST" != "null" ]; then
    echo "✅ Function App Host: $FUNC_HOST"
    BASE_URL="https://$FUNC_HOST"
    echo "   Base URL: $BASE_URL"
else
    echo "❌ Could not retrieve Function App hostname"
    echo "   This may indicate the Function App is not properly deployed or configured"
fi

echo ""
echo "=== 3. Listing Functions ==="
echo "Functions deployed in $APP_NAME:"
FUNCTIONS=$(az functionapp function list -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "[].{Name:name, TriggerType:config.bindings[0].type}" -o table 2>/dev/null)

if [ -n "$FUNCTIONS" ]; then
    echo "$FUNCTIONS"
else
    echo "⚠️  No functions found or unable to list functions"
    echo "   This could mean:"
    echo "   - No functions have been deployed yet"
    echo "   - Function App is still starting up"
    echo "   - There are deployment issues"
fi

echo ""
echo "=== 4. Testing Health Endpoint ==="
if [ -n "$FUNC_HOST" ] && [ "$FUNC_HOST" != "null" ]; then
    HEALTH_URL="https://$FUNC_HOST/api/health"
    echo "Testing health endpoint: $HEALTH_URL"
    
    HTTP_STATUS=$(curl -sS -m 10 -w "%{http_code}" -o /tmp/health_response "$HEALTH_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Health endpoint responding (HTTP 200)"
        echo "Response:"
        cat /tmp/health_response 2>/dev/null || echo "No response body"
    elif [ "$HTTP_STATUS" = "404" ]; then
        echo "ℹ️  Health endpoint not implemented (HTTP 404) - this is normal if no health function exists"
    elif [ "$HTTP_STATUS" = "000" ]; then
        echo "⚠️  Could not connect to Function App"
        echo "   This could indicate:"
        echo "   - Function App is still starting up"
        echo "   - Network connectivity issues"
        echo "   - Function App is not running"
    else
        echo "⚠️  Health endpoint returned HTTP $HTTP_STATUS"
    fi
else
    echo "❌ Cannot test health endpoint - no valid hostname"
fi

echo ""
echo "=== 5. Basic Connectivity Test ==="
if [ -n "$FUNC_HOST" ] && [ "$FUNC_HOST" != "null" ]; then
    echo "Testing basic connectivity to Function App..."
    HTTP_STATUS=$(curl -sS -m 10 -w "%{http_code}" -o /dev/null "$BASE_URL" 2>/dev/null || echo "000")
    
    case "$HTTP_STATUS" in
        "200"|"202"|"204")
            echo "✅ Function App is responding (HTTP $HTTP_STATUS)"
            ;;
        "401"|"403")
            echo "🔒 Function App requires authentication (HTTP $HTTP_STATUS) - this is expected"
            ;;
        "404")
            echo "ℹ️  No default page (HTTP 404) - this is normal for Function Apps"
            ;;
        "500"|"502"|"503")
            echo "❌ Function App has server errors (HTTP $HTTP_STATUS)"
            ;;
        "000")
            echo "❌ Cannot connect to Function App"
            ;;
        *)
            echo "ℹ️  Function App responded with HTTP $HTTP_STATUS"
            ;;
    esac
fi

echo ""
echo "=== Summary ==="
if [ -n "$FUNC_HOST" ] && [ "$FUNC_HOST" != "null" ]; then
    echo "✅ Function App hostname resolved"
    echo "ℹ️  Use Azure Portal or Application Insights for detailed diagnostics"
    echo "ℹ️  Check logs if functions are not behaving as expected"
else
    echo "❌ Function App may not be properly deployed or configured"
    echo "🔧 Consider checking:"
    echo "   - Deployment status"
    echo "   - App settings configuration"
    echo "   - Resource provisioning"
fi

# Cleanup
rm -f /tmp/health_response 2>/dev/null
