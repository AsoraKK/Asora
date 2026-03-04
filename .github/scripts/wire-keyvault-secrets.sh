#!/usr/bin/env bash
set -euo pipefail

# Wire EMAIL_HASH_SALT and COSMOS_CONNECTION_STRING as Key Vault references
# Usage: wire-keyvault-secrets.sh <rg> <func-app> <kv-name>

RG="${1:?Resource group required}"
FUNC_APP="${2:?Function app name required}"
KV_NAME="${3:?Key Vault name required}"

echo "Wiring Key Vault references for $FUNC_APP..."

# Get Key Vault URI
KV_URI=$(az keyvault show -n "$KV_NAME" -g "$RG" --query properties.vaultUri -o tsv)
echo "Key Vault URI: $KV_URI"

# Wire EMAIL_HASH_SALT
EMAIL_HASH_REF="@Microsoft.KeyVault(SecretUri=${KV_URI}secrets/email-hash-salt/)"
echo "Setting EMAIL_HASH_SALT -> $EMAIL_HASH_REF"

# Wire COSMOS_CONNECTION_STRING
COSMOS_REF="@Microsoft.KeyVault(SecretUri=${KV_URI}secrets/COSMOS-CONN/)"
echo "Setting COSMOS_CONNECTION_STRING -> $COSMOS_REF"

# Apply settings
az functionapp config appsettings set \
  -g "$RG" \
  -n "$FUNC_APP" \
  --settings \
    "EMAIL_HASH_SALT=$EMAIL_HASH_REF" \
    "COSMOS_CONNECTION_STRING=$COSMOS_REF" \
  >/dev/null

echo "✅ Key Vault references configured"
