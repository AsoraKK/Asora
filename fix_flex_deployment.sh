#!/bin/bash
# CodeX CLI — Fix Azure Functions (Flex) deployment + health probe
# Requirements: Azure CLI logged in with access; bash; zip

set -euo pipefail

# === CONFIG ===
RG="asora-psql-flex"
APP="asora-function-dev"
SA="asoraflexdev1404"
CONT="deployments"
BLOB="probe-flex.zip"

echo "=== Building probe ZIP ==="
# === 0) Build a tiny classic (function.json) probe ZIP ===
TMP="$(mktemp -d)"; pushd "$TMP" >/dev/null
mkdir -p health
cat > host.json <<'JSON'
{ "version": "2.0" }
JSON
cat > health/function.json <<'JSON'
{
  "bindings": [
    { "authLevel": "anonymous", "type": "httpTrigger", "direction": "in", "name": "req", "methods": ["get"], "route": "health" },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
JSON
cat > health/index.js <<'JS'
module.exports = async function (context, req) {
  context.res = { status: 200, body: "OK" };
};
JS
zip -rq "$BLOB" .
popd >/dev/null
echo "Probe ZIP created at $TMP/$BLOB"

echo "=== Uploading to storage ==="
# === 1) Upload probe ZIP to Storage ===
KEY="$(az storage account keys list -g "$RG" -n "$SA" --query "[0].value" -o tsv)"
az storage blob upload \
  --account-name "$SA" \
  --container-name "$CONT" \
  --name "$BLOB" \
  --file "$TMP/$BLOB" \
  --account-key "$KEY" \
  --overwrite
echo "Blob uploaded successfully"

echo "=== Setting up identity permissions ==="
# === 2) Ensure the app's system-assigned identity can read the blob ===
PRINCIPAL_ID="$(az functionapp identity show -g "$RG" -n "$APP" -o tsv --query principalId)"
echo "Principal ID: $PRINCIPAL_ID"
SCOPE="$(az storage account show -n "$SA" -g "$RG" -o tsv --query id)/blobServices/default/containers/$CONT"
echo "Scope: $SCOPE"
az role assignment create --assignee "$PRINCIPAL_ID" --role "Storage Blob Data Reader" --scope "$SCOPE" >/dev/null 2>&1 && echo "Role assigned" || echo "Role already exists or assignment failed"

echo "=== Configuring functionAppConfig ==="
# === 3) Point Flex to the package via functionAppConfig.deployment (no Kudu, no WEBSITE_RUN_FROM_PACKAGE) ===
SUB="$(az account show -o tsv --query id)"
SITE_URI="https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Web/sites/$APP?api-version=2023-12-01"

JSON_BODY=$(cat <<EOF
{
  "properties": {
    "functionAppConfig": {
      "runtime": { "name": "node", "version": "20" },
      "deployment": {
        "storage": {
          "type": "blobContainer",
          "value": "https://$SA.blob.core.windows.net/$CONT",
          "authentication": { "type": "SystemAssignedIdentity" }
        }
      }
    }
  }
}
