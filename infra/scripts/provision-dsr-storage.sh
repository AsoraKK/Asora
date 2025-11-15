#!/usr/bin/env bash
#
# provision-dsr-storage.sh - Create DSR export storage account with required configuration
#
# Usage: provision-dsr-storage.sh <resource-group> <location> [storage-account-name]
#
# Example:
#   provision-dsr-storage.sh asora-psql-flex eastus stasoradsr

set -euo pipefail

RG="${1:-}"
LOCATION="${2:-eastus}"
SA_NAME="${3:-stasoradsr$(date +%s)}"

if [ -z "$RG" ]; then
  echo "Error: Resource group is required"
  echo "Usage: $0 <resource-group> <location> [storage-account-name]"
  exit 1
fi

echo "🚀 Provisioning DSR storage infrastructure..."
echo "   Resource Group: $RG"
echo "   Location: $LOCATION"
echo "   Storage Account: $SA_NAME"
echo ""

# Check if storage account already exists
EXISTING_SA=$(az storage account list -g "$RG" --query "[?tags.purpose=='dsr-storage'].name | [0]" -o tsv || echo "")

if [ -n "$EXISTING_SA" ]; then
  echo "✅ DSR storage account already exists: $EXISTING_SA"
  echo "   Skipping creation"
  exit 0
fi

# Create storage account with DSR configuration
echo "📦 Creating storage account $SA_NAME..."
az storage account create \
  --name "$SA_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --public-network-access Disabled \
  --tags purpose=dsr-storage environment=dev \
  --output none

echo "✅ Storage account created"

# Create dsr-exports container
echo "📦 Creating dsr-exports container..."
az storage container create \
  --name dsr-exports \
  --account-name "$SA_NAME" \
  --auth-mode login \
  --output none

echo "✅ Container created"

# Create dsr-requests queue
echo "📦 Creating dsr-requests queue..."
az storage queue create \
  --name dsr-requests \
  --account-name "$SA_NAME" \
  --auth-mode login \
  --output none

echo "✅ Queue created"

# Enable versioning for audit trail
echo "🔒 Enabling blob versioning..."
az storage account blob-service-properties update \
  --account-name "$SA_NAME" \
  --resource-group "$RG" \
  --enable-versioning true \
  --output none

echo "✅ Versioning enabled"

# Configure lifecycle management for automatic cleanup
echo "📜 Configuring lifecycle policy..."
cat > /tmp/dsr-lifecycle-policy.json <<EOF
{
  "rules": [
    {
      "enabled": true,
      "name": "delete-old-exports",
      "type": "Lifecycle",
      "definition": {
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 30
            }
          },
          "snapshot": {
            "delete": {
              "daysAfterCreationGreaterThan": 30
            }
          }
        },
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["dsr-exports/"]
        }
      }
    }
  ]
}
EOF

az storage account management-policy create \
  --account-name "$SA_NAME" \
  --resource-group "$RG" \
  --policy @/tmp/dsr-lifecycle-policy.json \
  --output none

rm -f /tmp/dsr-lifecycle-policy.json

echo "✅ Lifecycle policy configured"

echo ""
echo "🎉 DSR storage infrastructure provisioned successfully!"
echo ""
echo "Next steps:"
echo "  1. Grant Function App managed identity access:"
echo "     PRINCIPAL_ID=\$(az functionapp identity show -g $RG -n <function-app-name> --query principalId -o tsv)"
echo "     bash infra/scripts/grant-dsr-storage-access.sh $SA_NAME $RG \$PRINCIPAL_ID"
echo ""
echo "  2. Configure Function App environment variables:"
echo "     az functionapp config appsettings set -g $RG -n <function-app-name> --settings DSR_EXPORT_STORAGE_ACCOUNT=$SA_NAME"
echo ""
