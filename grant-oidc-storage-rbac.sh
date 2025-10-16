#!/bin/bash
set -euo pipefail

# This script grants the GitHub OIDC app the necessary RBAC permissions
# to upload blobs to the storage account. Run this ONCE manually.

RG="asora-psql-flex"
FUNC_APP="asora-function-dev"
AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"

if [ -z "$AZURE_CLIENT_ID" ]; then
  echo "Error: AZURE_CLIENT_ID environment variable not set"
  echo "Get it from: az ad app list --display-name 'GitHub-Asora-OIDC' --query '[0].appId' -o tsv"
  exit 1
fi

# Resolve storage account
SA=$(az functionapp config appsettings list -g "$RG" -n "$FUNC_APP" \
      --query "[?name=='AzureWebJobsStorage__accountName'].value|[0]" -o tsv)
if [ -z "${SA:-}" ] || [ "$SA" = "None" ]; then
  CS=$(az functionapp config appsettings list -g "$RG" -n "$FUNC_APP" \
        --query "[?name=='AzureWebJobsStorage'].value|[0]" -o tsv)
  SA=$(echo "$CS" | sed -n 's/.*AccountName=\([^;]*\).*/\1/p')
fi
[ -n "${SA:-}" ] || { echo "Could not resolve storage account"; exit 1; }

echo "Storage account: $SA"

# Get OIDC app object ID
APP_OBJ_ID=$(az ad sp show --id "$AZURE_CLIENT_ID" --query id -o tsv)
[ -n "${APP_OBJ_ID:-}" ] || { echo "Could not find service principal for $AZURE_CLIENT_ID"; exit 1; }

echo "OIDC App Object ID: $APP_OBJ_ID"

# Get storage account resource ID
SCOPE=$(az storage account show --name "$SA" --query id -o tsv)
echo "Scope: $SCOPE"

# Grant Storage Blob Data Contributor
echo "Granting Storage Blob Data Contributor..."
az role assignment create \
  --assignee-object-id "$APP_OBJ_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "$SCOPE"

echo "✅ RBAC granted successfully!"
echo "The GitHub Actions workflow can now upload blobs to $SA"
