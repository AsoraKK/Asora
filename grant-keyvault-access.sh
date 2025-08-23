#!/bin/bash

# Script to grant Key Vault access to Function App's managed identity
# Assigns Key Vault Secrets User role for accessing secrets

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"
VAULT_NAME="kv-asora-flex-dev"
SUBSCRIPTION_ID="99df7ef7-776a-4235-84a4-c77899b2bb04"

echo "=== Key Vault Access Configuration ==="
echo "Function App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Key Vault: $VAULT_NAME"
echo "Subscription: $SUBSCRIPTION_ID"
echo ""

# Get the Function App's managed identity
echo "Getting Function App's managed identity..."
MSI=$(az functionapp identity show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query principalId -o tsv)

if [ -z "$MSI" ]; then
    echo "❌ No managed identity found. Enabling system-assigned identity..."
    az functionapp identity assign -g "$RESOURCE_GROUP" -n "$APP_NAME"
    MSI=$(az functionapp identity show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query principalId -o tsv)
fi

echo "✅ Managed Identity Principal ID: $MSI"

# Set up the Key Vault scope
SCOPE="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$VAULT_NAME"
echo "Key Vault scope: $SCOPE"
echo ""

# Assign the role
echo "Assigning 'Key Vault Secrets User' role..."
az role assignment create --assignee "$MSI" --role "Key Vault Secrets User" --scope "$SCOPE"

echo ""
echo "=== Verification ==="
echo "Checking role assignments for the managed identity:"
az role assignment list --assignee "$MSI" --scope "$SCOPE" --output table

echo ""
echo "=== Configuration Complete ==="
echo "✅ Function App can now access secrets from $VAULT_NAME"
echo "✅ Use Key Vault references in app settings:"
echo "   @Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=SECRET_NAME)"
