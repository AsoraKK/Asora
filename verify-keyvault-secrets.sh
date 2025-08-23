#!/bin/bash

# Script to standardize Key Vault references and verify secrets
# Switch from kv-asora-dev to kv-asora-dev (kv-asora-flex-dev is empty/unused)

OLD_VAULT="kv-asora-dev"
NEW_VAULT="kv-asora-flex-dev"

echo "=== Key Vault Standardization Script ==="
echo "Old vault: $OLD_VAULT"
echo "New vault: $NEW_VAULT"
echo ""

# List of required secrets
SECRETS=(
    "edge-telemetry-secret"
    "email-hash-salt"
    "hive-image-key"
    "hive-text-key"
    "jwt-secret"
    "hive-deepfake-key"
)

echo "=== Verifying secrets exist in $NEW_VAULT ==="
ALL_SECRETS_EXIST=true

for secret in "${SECRETS[@]}"; do
    echo "Checking secret: $secret"
    
    # Check if secret exists and get its ID
    SECRET_ID=$(az keyvault secret show --vault-name "$NEW_VAULT" --name "$secret" --query "id" -o tsv 2>/dev/null)
    
    if [ -n "$SECRET_ID" ]; then
        echo "  ✅ Found: $SECRET_ID"
        
        # Also show the version info
        VERSION_INFO=$(az keyvault secret show --vault-name "$NEW_VAULT" --name "$secret" --query "{version: properties.version, created: properties.created, updated: properties.updated}" -o json)
        echo "  📝 Version info: $VERSION_INFO"
    else
        echo "  ❌ MISSING: $secret not found in $NEW_VAULT"
        ALL_SECRETS_EXIST=false
    fi
    echo ""
done

echo "=== Summary ==="
if [ "$ALL_SECRETS_EXIST" = true ]; then
    echo "✅ All secrets verified in $NEW_VAULT"
    echo "Ready to update function app settings to reference $NEW_VAULT"
else
    echo "❌ Some secrets are missing from $NEW_VAULT"
    echo "Please ensure all secrets are created before proceeding"
fi

echo ""
echo "=== Key Vault Reference Format ==="
echo "Use this format in function app settings:"
echo "@Microsoft.KeyVault(VaultName=$NEW_VAULT;SecretName=SECRET_NAME)"
echo ""
echo "Example commands to update function app settings:"
echo "az functionapp config appsettings set -g asora-psql-flex -n asora-function-dev \\"
echo "  --settings EDGE_TELEMETRY_SECRET='@Microsoft.KeyVault(VaultName=$NEW_VAULT;SecretName=edge-telemetry-secret)'"
