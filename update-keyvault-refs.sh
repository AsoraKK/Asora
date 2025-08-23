#!/bin/bash

# Script to update function app settings to use the correct Key Vault
# Updates references from kv-asora-dev to kv-asora-dev (kv-asora-flex-dev is empty/unused)

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"
OLD_VAULT="kv-asora-dev"
NEW_VAULT="kv-asora-flex-dev"

echo "=== Updating Function App Key Vault References ==="
echo "App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Switching from: $OLD_VAULT to: $NEW_VAULT"
echo ""

# Get current app settings
echo "=== Current App Settings ==="
az functionapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "[?contains(value, '$OLD_VAULT')]" -o table

echo ""
echo "=== Recommended Key Vault References ==="
echo "Use these commands to set Key Vault references for your secrets:"
echo ""

# Define the mapping of environment variables to Key Vault secrets
declare -A SECRET_MAPPINGS=(
    ["EDGE_TELEMETRY_SECRET"]="edge-telemetry-secret"
    ["EMAIL_HASH_SALT"]="email-hash-salt"
    ["HIVE_IMAGE_KEY"]="hive-image-key"
    ["HIVE_TEXT_KEY"]="hive-text-key"
    ["JWT_SECRET"]="jwt-secret"
    ["HIVE_DEEPFAKE_KEY"]="hive-deepfake-key"
)

for env_var in "${!SECRET_MAPPINGS[@]}"; do
    secret_name="${SECRET_MAPPINGS[$env_var]}"
    kv_reference="@Microsoft.KeyVault(VaultName=$NEW_VAULT;SecretName=$secret_name)"
    
    echo "# Set $env_var to reference $secret_name from $NEW_VAULT"
    echo "az functionapp config appsettings set -g '$RESOURCE_GROUP' -n '$APP_NAME' \\"
    echo "  --settings $env_var='$kv_reference'"
    echo ""
done

echo "=== Manual Verification ==="
echo "After running the above commands, verify with:"
echo "az functionapp config appsettings list -g '$RESOURCE_GROUP' -n '$APP_NAME' \\"
echo "  --query \"[?contains(value, 'KeyVault')]\" -o table"
