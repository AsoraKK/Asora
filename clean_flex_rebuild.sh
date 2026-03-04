#!/usr/bin/env bash
# clean_flex_rebuild.sh
# Prereqs: az login; bash; jq; npm; zip
set -euo pipefail

# ===== CONFIG =====
REGION="westeurope"                 # pick a healthy region different from North Europe
RG="asora-flex-weu"
PLAN="asora-flex-plan-weu"
APP="asora-function-dev-weu"
SA="asoraflexweu$RANDOM"            # new SA to avoid old perms/state
CONT="deployments"
BLOB="functionapp.zip"

ts(){ date -u +'%Y-%m-%dT%H:%M:%SZ'; }

echo "[$(ts)] Create RG/Plan/Storage"
az group create -n "$RG" -l "$REGION" -o none
az functionapp plan create -g "$RG" -n "$PLAN" -l "$REGION" --sku EP1 --is-linux true -o none
az storage account create -g "$RG" -n "$SA" -l "$REGION" --sku Standard_LRS -o none
KEY="$(az storage account keys list -g "$RG" -n "$SA" -o tsv --query '[0].value')"
az storage container create --account-name "$SA" --name "$CONT" --account-key "$KEY" -o none

echo "[$(ts)] Create Flex Function App (Node 20, system MI)"
az functionapp create -g "$RG" -n "$APP" --plan "$PLAN" --runtime node --runtime-version 20 \
  --functions-version 4 --storage-account "$SA" --assign-identity -o none

echo "[$(ts)] Grant MI read on container (wait for propagation)"
sleep 10
PRINCIPAL_ID="$(az functionapp identity show -g "$RG" -n "$APP" -o tsv --query principalId)"
SCOPE="$(az storage account show -n "$SA" -g "$RG" -o tsv --query id)/blobServices/default/containers/$CONT"
az role assignment create --assignee "$PRINCIPAL_ID" --role "Storage Blob Data Reader" --scope "$SCOPE" -o none 2>/dev/null || sleep 15 && az role assignment create --assignee "$PRINCIPAL_ID" --role "Storage Blob Data Reader" --scope "$SCOPE" -o none || true

echo "[$(ts)] Build tiny v4 probe (bundled node_modules)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
APPDIR="$TMP/probe"; mkdir -p "$APPDIR"
cat > "$APPDIR/host.json" <<'JSON'
{ "version": "2.0" }
JSON
cat > "$APPDIR/package.json" <<'JSON'
{
  "name": "flex-probe",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "engines": { "node": ">=20 <21" },
  "dependencies": { "@azure/functions": "^4.7.2" }
}
JSON
cat > "$APPDIR/index.js" <<'JS'
import { app } from "@azure/functions";
export async function health(_req, _ctx) {
  return { status: 200, jsonBody: { ok: true, plan: "Flex", ts: new Date().toISOString() } };
}
app.http("health", { route: "health", methods: ["GET"], authLevel: "anonymous", handler: health });
JS
pushd "$APPDIR" >/dev/null
npm i --omit=dev >/dev/null
zip -qry "$TMP/$BLOB" host.json package.json index.js node_modules
popd >/dev/null
echo "[$(ts)] Package size: $(du -h "$TMP/$BLOB" | awk '{print $1}')"

echo "[$(ts)] Upload $BLOB to $SA/$CONT"
az storage blob upload --account-name "$SA" --container-name "$CONT" \
  --name "$BLOB" --file "$TMP/$BLOB" --account-key "$KEY" --overwrite -o none

echo "[$(ts)] Point deployment to blob (via app setting)"
az functionapp config appsettings set -g "$RG" -n "$APP" --settings \
  "WEBSITE_RUN_FROM_PACKAGE=https://$SA.blob.core.windows.net/$CONT/$BLOB" -o none

echo "[$(ts)] Restart & verify"
az functionapp restart -g "$RG" -n "$APP" -o none
sleep 40
curl -is "https://$APP.azurewebsites.net/api/health" | sed -n '1,12p'
echo "[$(ts)] Done. App: https://$APP.azurewebsites.net"
