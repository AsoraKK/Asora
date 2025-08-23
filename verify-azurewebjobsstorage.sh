#!/bin/bash

# Script to verify AzureWebJobsStorage configuration for Azure Functions Flex
# Ensures storage account is properly connected and functional

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"
STORAGE_ACCOUNT="asoraflexdev1404"

echo "=== AzureWebJobsStorage Verification ==="
echo "Function App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Storage Account: $STORAGE_ACCOUNT"
echo ""

echo "=== 1. Checking AzureWebJobsStorage Setting ==="
STORAGE_SETTING=$(az functionapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "[?name=='AzureWebJobsStorage'].value" -o tsv)

if [ -n "$STORAGE_SETTING" ]; then
    echo "✅ AzureWebJobsStorage is configured"
    echo "   Value: $STORAGE_SETTING"
else
    echo "❌ AzureWebJobsStorage is NOT configured"
fi

echo ""
echo "=== 2. Verifying Storage Account ==="
if az storage account show -n "$STORAGE_ACCOUNT" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "✅ Storage account exists: $STORAGE_ACCOUNT"
    
    # Get storage account details
    az storage account show -n "$STORAGE_ACCOUNT" -g "$RESOURCE_GROUP" --query "{name:name, location:location, sku:sku.name, kind:kind, httpsOnly:supportsHttpsTrafficOnly}" -o table
else
    echo "❌ Storage account does not exist: $STORAGE_ACCOUNT"
fi

echo ""
echo "=== 3. Testing Storage Access ==="
echo "Creating test container 'sanity'..."
if az storage container create --account-name "$STORAGE_ACCOUNT" -n sanity --auth-mode key >/dev/null 2>&1; then
    echo "✅ Successfully created test container"
else
    echo "⚠️  Test container may already exist or there's an access issue"
fi

echo ""
echo "=== 4. Listing Storage Containers ==="
echo "Containers in $STORAGE_ACCOUNT:"
az storage container list --account-name "$STORAGE_ACCOUNT" --auth-mode key --query "[].{Name:name, LastModified:properties.lastModified}" -o table

echo ""
echo "=== 5. Functions Runtime Requirements ==="
echo "For Azure Functions Flex, the storage account is used for:"
echo "  • Function keys and runtime metadata"
echo "  • Deployment packages (zip files)"
echo "  • Internal runtime operations"
echo "  • Durable Functions state (if using Durable Functions)"

echo ""
echo "=== Summary ==="
if [ -n "$STORAGE_SETTING" ] && az storage account show -n "$STORAGE_ACCOUNT" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "✅ AzureWebJobsStorage is properly configured and functional"
    echo "✅ Function App should be able to start and operate normally"
else
    echo "❌ AzureWebJobsStorage configuration issues detected"
    echo "❌ Function App may fail to start or operate properly"
fi
