#!/usr/bin/env bash
set -euo pipefail

# ===== CONFIG: set your app and group =====
RG="asora-psql-flex"
APP="asora-function-dev"

echo "[*] Resolve subscription & storage used by Flex deployment"
SUB="$(az account show --query id -o tsv)"
DEP_URL="$(az functionapp show -g "$RG" -n "$APP" --query "properties.functionAppConfig.deployment.storage.value" -o tsv)"
# Fallback if that property isn't present:
if [[ -z "${DEP_URL:-}" ]]; then
  echo "Could not read Flex deployment container from functionAppConfig. Ensure this is a Flex app."
  exit 1
fi
# Extract account from https://<acct>.blob.core.windows.net/<container>...
SA="$(echo "$DEP_URL" | sed -n 's#https://\([^\.]*\)\.blob\.core\.windows\.net/.*#\1#p')"

echo "[*] Create temp working dir"
WK="$(mktemp -d)"; trap 'rm -rf "$WK"' EXIT
pushd "$WK" >/dev/null

echo "[*] Scaffold minimal Node v4 programmatic health function"
cat > package.json <<'JSON'
{
  "name": "flex-probe",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@azure/functions": "^4.4.0" }
}
JSON

cat > host.json <<'JSON'
{ "version": "2.0" }
JSON

cat > index.mjs <<'JS'
import { app } from "@azure/functions";
app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async () => ({ status: 200, jsonBody: { ok: true, plan: "Flex" }})
});
JS

echo "[*] Install deps (prod only)"; npm i --omit=dev >/dev/null
echo "[*] Package as released-package.zip (Flex expects this name)"
zip -qr released-package.zip host.json package.json index.mjs node_modules

echo "[*] Prepare staging container and upload"
KEY="$(az storage account keys list -n "$SA" -g "$RG" --query "[0].value" -o tsv)"
CONTAINER="onedeploy"
az storage container create --name "$CONTAINER" --account-name "$SA" --account-key "$KEY" -o none
az storage blob upload --account-name "$SA" --account-key "$KEY" \
  --container-name "$CONTAINER" --name released-package.zip \
  --file released-package.zip --overwrite -o none

echo "[*] Generate short-lived SAS for OneDeploy pull"
EXP="$(date -u -d '+1 hour' +'%Y-%m-%dT%H:%MZ')"
SAS="$(az storage blob generate-sas --account-name "$SA" --account-key "$KEY" \
  --container-name "$CONTAINER" --name released-package.zip \
  --permissions r --expiry "$EXP" --https-only -o tsv)"
PKG_URI="https://${SA}.blob.core.windows.net/${CONTAINER}/released-package.zip?${SAS}"

echo "[*] Publish via OneDeploy (required on Flex)"
ONEDEPLOY_URI="https://management.azure.com/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}/extensions/onedeploy?api-version=2024-04-01"
az rest --method PUT --uri "$ONEDEPLOY_URI" \
  --body "{\"properties\":{\"packageUri\":\"$PKG_URI\"}}"

echo "[*] Restart app and verify"
az functionapp restart -g "$RG" -n "$APP" -o none
sleep 30
curl -i "https://${APP}.azurewebsites.net/api/health" | sed -n '1,20p'
