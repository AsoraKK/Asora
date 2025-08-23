#!/bin/bash

# Script to update Function App settings with Key Vault references
# All environment variables now reference secrets in kv-asora-dev

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"
VAULT_NAME="kv-asora-dev"

echo "=== Function App Key Vault Reference Update ==="
echo "App: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Key Vault: $VAULT_NAME"
echo ""

echo "=== Setting Key Vault References ==="
az functionapp config appsettings set -g "$RESOURCE_GROUP" -n "$APP_NAME" --settings \
  HIVE_TEXT_KEY="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=hive-text-key)" \
  HIVE_IMAGE_KEY="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=hive-image-key)" \
  HIVE_DEEPFAKE_KEY="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=hive-deepfake-key)" \
  EMAIL_HASH_SALT="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=email-hash-salt)" \
  EDGE_TELEMETRY_SECRET="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=edge-telemetry-secret)" \
  JWT_SECRET="@Microsoft.KeyVault(VaultName=$VAULT_NAME;SecretName=jwt-secret)"

echo ""
echo "=== Verification ==="
echo "Key Vault references in app settings:"
az functionapp config appsettings list -g "$RESOURCE_GROUP" -n "$APP_NAME" --query "[?contains(value, 'KeyVault')].{Name:name, Value:value}" -o table

echo ""
echo "=== Secret Status in Key Vault ==="
SECRETS=("hive-text-key" "hive-image-key" "hive-deepfake-key" "email-hash-salt" "edge-telemetry-secret" "jwt-secret")

for secret in "${SECRETS[@]}"; do
    echo -n "Checking $secret: "
    if az keyvault secret show --vault-name "$VAULT_NAME" --name "$secret" --query "id" -o tsv >/dev/null 2>&1; then
        echo "✅ EXISTS"
    else
        echo "❌ MISSING - needs to be created"
    fi
done

echo ""
echo "=== Next Steps ==="
echo "1. Create any missing secrets in Key Vault"
echo "2. Restart Function App if needed: az functionapp restart -g $RESOURCE_GROUP -n $APP_NAME"
echo "3. Monitor Function App logs to ensure secrets are resolved correctly"
