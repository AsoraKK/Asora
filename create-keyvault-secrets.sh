#!/bin/bash

# Script to create/standardize all required secrets in kv-asora-dev (kv-asora-flex-dev is empty/unused)
# This script contains the real values for production secrets

VAULT_NAME="kv-asora-flex-dev"

echo "=== Creating/Standardizing Secrets in $VAULT_NAME ==="
echo ""

# Create the secrets with real values
echo "✅ Creating edge-telemetry-secret..."
az keyvault secret set -n edge-telemetry-secret -v "d824b6be-c307-4d64-89b8-6fe37b2e2f7c" --vault-name "$VAULT_NAME"

echo "✅ Creating email-hash-salt..."
az keyvault secret set -n email-hash-salt -v "c8468f32-6e3a-4440-87a5-1a1dc1504846" --vault-name "$VAULT_NAME"

echo "✅ Creating hive-image-key..."
az keyvault secret set -n hive-image-key -v "vWv55QJndt4RYIW4qlXqRPvptjSOxzdQ" --vault-name "$VAULT_NAME"

echo "✅ Creating hive-deepfake-key..."
az keyvault secret set -n hive-deepfake-key -v "fnknIOa1F3OLPnRmM4vQECSXyzbQ2rkg" --vault-name "$VAULT_NAME"

# Note: These secrets may need to be created separately with their actual values
echo ""
echo "⚠️  ADDITIONAL SECRETS THAT MAY BE NEEDED:"
echo "   - hive-text-key (please provide the actual value)"
echo "   - jwt-secret (please provide the actual JWT signing key)"

echo ""
echo "=== Verification ==="
echo "All secrets in $VAULT_NAME:"
az keyvault secret list --vault-name "$VAULT_NAME" --query "[].{Name:name, Created:attributes.created, Updated:attributes.updated}" -o table

echo ""
echo "=== Next Steps ==="
echo "1. Update Function App settings to use Key Vault references"
echo "2. Add any missing secrets (hive-text-key, jwt-secret) with actual values"
echo "3. Test Function App can access secrets using managed identity"
