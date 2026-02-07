#!/usr/bin/env bash
# scripts/setup-media-storage.sh
#
# Creates the Azure Blob Storage account and container for user media uploads.
# Also assigns "Storage Blob Data Contributor" to the Function App managed identity.
#
# Prerequisites:
#   - az CLI logged in with sufficient permissions
#   - Function App must have system-assigned managed identity enabled
#
# Usage:
#   bash scripts/setup-media-storage.sh
#
# Override defaults via environment variables:
#   MEDIA_STORAGE_ACCOUNT  (default: asoramediadev)
#   MEDIA_CONTAINER        (default: user-media)
#   RESOURCE_GROUP         (default: asora-rg-dev)
#   LOCATION               (default: southafricanorth)
#   FUNC_APP               (default: asora-function-dev)

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────────────────
MEDIA_SA="${MEDIA_STORAGE_ACCOUNT:-asoramediadev}"
CONTAINER="${MEDIA_CONTAINER:-user-media}"
RG="${RESOURCE_GROUP:-asora-rg-dev}"
LOCATION="${LOCATION:-southafricanorth}"
FUNC_APP="${FUNC_APP:-asora-function-dev}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Lythaus Media Storage Setup                                ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Storage Account : $MEDIA_SA"
echo "║  Container       : $CONTAINER"
echo "║  Resource Group  : $RG"
echo "║  Location        : $LOCATION"
echo "║  Function App    : $FUNC_APP"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Create Storage Account ───────────────────────────────────────────
echo "→ Step 1: Creating storage account '$MEDIA_SA'..."
if az storage account show -n "$MEDIA_SA" -g "$RG" --query "name" -o tsv 2>/dev/null; then
  echo "  ✅ Storage account already exists"
else
  az storage account create \
    -n "$MEDIA_SA" \
    -g "$RG" \
    -l "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --https-only true \
    --tags purpose=media-storage environment=dev product=lythaus \
    --output none
  echo "  ✅ Storage account created"
fi

# ─── Step 2: Create Container ─────────────────────────────────────────────────
echo "→ Step 2: Creating container '$CONTAINER'..."
if az storage container show -n "$CONTAINER" --account-name "$MEDIA_SA" --auth-mode login --query "name" -o tsv 2>/dev/null; then
  echo "  ✅ Container already exists"
else
  az storage container create \
    -n "$CONTAINER" \
    --account-name "$MEDIA_SA" \
    --auth-mode login \
    --public-access off \
    --output none
  echo "  ✅ Container created"
fi

# ─── Step 3: Assign IAM role to Function App identity ─────────────────────────
echo "→ Step 3: Assigning 'Storage Blob Data Contributor' to Function App identity..."

PRINCIPAL_ID=$(az functionapp identity show -g "$RG" -n "$FUNC_APP" --query "principalId" -o tsv 2>/dev/null)
if [ -z "$PRINCIPAL_ID" ]; then
  echo "  ⚠️  Function App '$FUNC_APP' has no system-assigned identity."
  echo "     Enable it with: az functionapp identity assign -g $RG -n $FUNC_APP"
  echo "     Then re-run this script."
  exit 1
fi

STORAGE_ID=$(az storage account show -n "$MEDIA_SA" -g "$RG" --query "id" -o tsv)

# Check if role is already assigned
EXISTING=$(az role assignment list \
  --assignee "$PRINCIPAL_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_ID" \
  --query "length(@)" -o tsv)

if [ "$EXISTING" -gt 0 ] 2>/dev/null; then
  echo "  ✅ Role already assigned"
else
  az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "Storage Blob Data Contributor" \
    --scope "$STORAGE_ID" \
    --output none
  echo "  ✅ Role assigned (principalId: ${PRINCIPAL_ID:0:8}...)"
fi

# ─── Step 4: Set Function App environment variables ───────────────────────────
echo "→ Step 4: Setting app settings on Function App..."
az functionapp config appsettings set \
  -g "$RG" -n "$FUNC_APP" \
  --setting \
    MEDIA_STORAGE_ACCOUNT="$MEDIA_SA" \
    MEDIA_CONTAINER="$CONTAINER" \
  --output none
echo "  ✅ App settings configured"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Media storage setup complete                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Storage Account : $MEDIA_SA"
echo "║  Container       : $CONTAINER"
echo "║  Principal ID    : ${PRINCIPAL_ID:0:12}..."
echo "║  IAM Role        : Storage Blob Data Contributor"
echo "║                                                            ║"
echo "║  Test:                                                     ║"
echo "║    POST /api/media/upload-url                              ║"
echo "║    { \"fileName\": \"test.jpg\", \"contentType\": \"image/jpeg\" } ║"
echo "╚══════════════════════════════════════════════════════════════╝"
