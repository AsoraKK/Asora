#!/usr/bin/env bash
set -euo pipefail

# Validate Key Vault references resolve before deployment
# Usage: validate-kv-refs.sh <rg> <func-app>

RG="${1:?Resource group required}"
FUNC_APP="${2:?Function app name required}"

echo "Validating Key Vault references for $FUNC_APP..."

# Get app settings
SETTINGS=$(az functionapp config appsettings list -g "$RG" -n "$FUNC_APP" -o json)

# Check EMAIL_HASH_SALT
EMAIL_VAL=$(echo "$SETTINGS" | jq -r '.[] | select(.name=="EMAIL_HASH_SALT") | .value')
if [[ "$EMAIL_VAL" =~ ^@Microsoft\.KeyVault ]]; then
  echo "✓ EMAIL_HASH_SALT is a Key Vault reference"
else
  echo "::error::EMAIL_HASH_SALT is not configured as a Key Vault reference" >&2
  exit 1
fi

# Check COSMOS_CONNECTION_STRING
COSMOS_VAL=$(echo "$SETTINGS" | jq -r '.[] | select(.name=="COSMOS_CONNECTION_STRING") | .value')
if [[ "$COSMOS_VAL" =~ ^@Microsoft\.KeyVault ]]; then
  echo "✓ COSMOS_CONNECTION_STRING is a Key Vault reference"
else
  echo "::error::COSMOS_CONNECTION_STRING is not configured as a Key Vault reference" >&2
  exit 1
fi

# Verify Function App has managed identity
PRINCIPAL_ID=$(az functionapp identity show -g "$RG" -n "$FUNC_APP" --query principalId -o tsv 2>/dev/null || true)
if [ -z "$PRINCIPAL_ID" ]; then
  echo "::error::Function App does not have a managed identity enabled" >&2
  exit 1
fi
echo "✓ Managed identity configured: $PRINCIPAL_ID"

echo "✅ All Key Vault references validated"
