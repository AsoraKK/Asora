#!/usr/bin/env bash
#
# grant-dsr-storage-access.sh - Grant Function App managed identity access to DSR storage
#
# Usage: grant-dsr-storage-access.sh <storage-account> <resource-group> <principal-id>
#
# Example:
#   grant-dsr-storage-access.sh stasoradsr asora-psql-flex 00000000-0000-0000-0000-000000000000

set -euo pipefail

SA="${1:-}"
RG="${2:-}"
PRINCIPAL_ID="${3:-}"

if [ -z "$SA" ] || [ -z "$RG" ] || [ -z "$PRINCIPAL_ID" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <storage-account> <resource-group> <principal-id>"
  exit 1
fi

echo "🔐 Granting DSR storage access to Function App managed identity..."
echo "   Storage Account: $SA"
echo "   Resource Group: $RG"
echo "   Principal ID: $PRINCIPAL_ID"
echo ""

# Get storage account resource ID
STORAGE_ID=$(az storage account show -n "$SA" -g "$RG" --query id -o tsv)

# Required roles for DSR operations
ROLES=(
  "Storage Blob Data Contributor"    # Read/write/delete blobs, generate SAS
  "Storage Queue Data Contributor"   # Read/write/delete queue messages
  "Storage Account Contributor"      # Generate user delegation keys
)

for ROLE in "${ROLES[@]}"; do
  echo "📝 Assigning role: $ROLE"
  
  # Check if assignment already exists
  EXISTING=$(az role assignment list \
    --assignee "$PRINCIPAL_ID" \
    --role "$ROLE" \
    --scope "$STORAGE_ID" \
    --query "[].id" -o tsv || echo "")
  
  if [ -n "$EXISTING" ]; then
    echo "   ✅ Role already assigned, skipping"
  else
    az role assignment create \
      --assignee "$PRINCIPAL_ID" \
      --role "$ROLE" \
      --scope "$STORAGE_ID" \
      --output none
    echo "   ✅ Role assigned"
  fi
done

echo ""
echo "🎉 Access granted successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify access:"
echo "     bash infra/scripts/verify-dsr-storage.sh $SA $RG $PRINCIPAL_ID"
echo ""
