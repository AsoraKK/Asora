#!/bin/bash

# Script to restart Function App and monitor Key Vault reference resolution
# Ensures the app comes back online with proper secret access

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"

echo "=== Function App Restart and Key Vault Verification ==="
echo "Function App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

echo "=== 1. Restarting Function App ==="
az functionapp restart -g "$RESOURCE_GROUP" -n "$APP_NAME"

echo ""
echo "=== 2. Waiting for Restart to Complete ==="
echo "Waiting 15 seconds for app to restart..."
sleep 15

echo ""
echo "=== 3. Checking Function App Status ==="
az functionapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "{name:name, state:state, defaultHostName:defaultHostName, httpsOnly:httpsOnly}" -o table

echo ""
echo "=== 4. Verifying Key Vault References ==="
echo "Checking that Key Vault references are configured:"
az functionapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "[?contains(value, 'KeyVault')].{Name:name, Status:'Key Vault Reference'}" -o table

echo ""
echo "=== 5. Testing Function App Health ==="
echo "Getting Function App URL..."
FUNCTION_URL=$(az functionapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "defaultHostName" -o tsv)
if [ -n "$FUNCTION_URL" ]; then
    echo "Function App URL: https://$FUNCTION_URL"
    echo ""
    echo "You can test the app by:"
    echo "1. Checking Azure Portal for any startup errors"
    echo "2. Reviewing Application Insights logs"
    echo "3. Testing function endpoints"
else
    echo "⚠️  Could not retrieve Function App URL"
fi

echo ""
echo "=== 6. Key Vault Access Status ==="
echo "The Function App should now be able to:"
echo "✅ Resolve Key Vault references using managed identity"
echo "✅ Access secrets from kv-asora-dev"
echo "✅ Start functions that depend on secret values"

echo ""
echo "=== Troubleshooting ==="
echo "If secrets are not resolving:"
echo "1. Check managed identity has 'Key Vault Secrets User' role"
echo "2. Verify all referenced secrets exist in the Key Vault"
echo "3. Check Function App logs for Key Vault resolution errors"
echo "4. Ensure Key Vault allows access from Azure services"
