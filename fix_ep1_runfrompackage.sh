#!/usr/bin/env bash
# fix_ep1_runfrompackage.sh
# Deploy a minimal v4 Node probe to EP1 via WEBSITE_RUN_FROM_PACKAGE using SAS (no MI/RBAC)

set -euo pipefail

# ==== CONFIG (edit if you used different names) ====
RG="asora-flex-weu"
APP="asora-function-dev-weu"
CONT="deployments"

# Resolve storage account in the RG
SA="$(az storage account list -g "$RG" --query '[0].name' -o tsv)"
[ -n "${SA:-}" ] || { echo "No storage account found in RG $RG"; exit 1; }

# Build tiny v4 probe (bundled node_modules)
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pushd "$TMP" >/dev/null
cat > host.json <<'JSON'
{ "version": "2.0" }
JSON

cat > package.json <<'JSON'
{
  "name": "ep1-probe",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "engines": { "node": ">=20 <21" },
  "dependencies": { "@azure/functions": "^4.7.2" }
}
JSON

mkdir health
cat > health/function.json <<'JSON'
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "health"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
JSON

cat > health/index.js <<'JS'
import { app } from "@azure/functions";

export async function health(req, context) {
    return { status: 200, jsonBody: { ok: true, plan: "EP1", ts: new Date().toISOString() } };
}

app.http("health", {
    route: "health",
    methods: ["GET"],
    authLevel: "anonymous",
    handler: health,
});
JS

npm i --omit=dev >/dev/null
zip -qry functionapp.zip host.json package.json health/ node_modules
popd >/dev/null

# Upload package
KEY="$(az storage account keys list -g "$RG" -n "$SA" --query '[0].value' -o tsv)"
az storage container create --account-name "$SA" --name "$CONT" --account-key "$KEY" --public-access blob >/dev/null || true
az storage blob upload --account-name "$SA" --container-name "$CONT" --name functionapp.zip \
  --file "$TMP/functionapp.zip" --account-key "$KEY" --overwrite >/dev/null

PKG_URL="https://$SA.blob.core.windows.net/$CONT/functionapp.zip"

# Ensure baseline app settings for EP1 + Node v4
CONN="$(az storage account show-connection-string -g "$RG" -n "$SA" -o tsv)"
az functionapp config appsettings set -g "$RG" -n "$APP" --settings FUNCTIONS_WORKER_RUNTIME=node >/dev/null
az functionapp config appsettings set -g "$RG" -n "$APP" --settings AzureWebJobsStorage="$CONN" >/dev/null
az functionapp config appsettings set -g "$RG" -n "$APP" --settings WEBSITE_RUN_FROM_PACKAGE="$PKG_URL" >/dev/null

# Restart and verify
az functionapp restart -g "$RG" -n "$APP" >/dev/null
sleep 40
curl -is "https://$APP.azurewebsites.net/api/health" | sed -n '1,12p'