#!/usr/bin/env bash
# Heal Azure Functions Flex app and deploy a v4 programmatic probe.
# Prereqs: Azure CLI (logged in), jq, npm, zip

set -euo pipefail

# === CONFIG ===
RG="asora-psql-flex"
APP="asora-function-dev"
SA="asoraflexdev1404"
CONT="deployments"
BLOB="functionapp-$(date +%s).zip"

ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }

printf '[%s] Resolve subscription\n' "$(ts)"
SUB="$(az account show -o tsv --query id)"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

SITE_URI="https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Web/sites/$APP?api-version=2022-03-01"

printf '[%s] Build v3 probe (with node_modules)\n' "$(ts)"
APPDIR="$TMP/probe"; mkdir -p "$APPDIR/health"
cat >"$APPDIR/host.json" <<'JSON'
{ "version": "2.0" }
JSON
cat >"$APPDIR/package.json" <<'JSON'
{
  "name": "flex-probe",
  "version": "1.0.0",
  "engines": { "node": ">=20 <21" },
  "dependencies": { "@azure/functions": "^3.5.1" }
}
JSON
cat >"$APPDIR/health/function.json" <<'JSON'
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
cat >"$APPDIR/health/index.js" <<'JS'
module.exports = async function (context, req) {
    context.res = {
        status: 200,
        body: { ok: true, plan: "Flex", ts: new Date().toISOString() }
    };
};
JS

pushd "$APPDIR" >/dev/null
npm i --omit=dev >/dev/null
zip -qry "$TMP/$BLOB" host.json package.json health/ node_modules
popd >/dev/null
printf '[%s] Package size: %s\n' "$(ts)" "$(du -h "$TMP/$BLOB" | awk '{print $1}')"

printf '[%s] Upload %s to %s/%s\n' "$(ts)" "$BLOB" "$SA" "$CONT"
KEY="$(az storage account keys list -g "$RG" -n "$SA" --query "[0].value" -o tsv)"
az storage blob upload --account-name "$SA" --container-name "$CONT" \
  --name "$BLOB" --file "$TMP/$BLOB" --account-key "$KEY" --overwrite >/dev/null

printf '[%s] Ensure system-assigned identity can read the container\n' "$(ts)"
PRINCIPAL_ID="$(az functionapp identity show -g "$RG" -n "$APP" -o tsv --query principalId)"
SCOPE="$(az storage account show -n "$SA" -g "$RG" -o tsv --query id)/blobServices/default/containers/$CONT"
az role assignment create --assignee "$PRINCIPAL_ID" --role "Storage Blob Data Contributor" --scope "$SCOPE" >/dev/null 2>&1 || true

printf '[%s] Update deployment pointer to new blob\n' "$(ts)"
az rest --method GET --uri "$SITE_URI" >"$TMP/site.json"
jq ".properties.functionAppConfig.deployment.value = \"https://$SA.blob.core.windows.net/$CONT?blob=$BLOB\"" "$TMP/site.json" >"$TMP/site.patched.json"
az rest --method PUT --uri "$SITE_URI" --body @"$TMP/site.patched.json" >/dev/null

printf '[%s] Confirm deployment pointer\n' "$(ts)"
az functionapp deployment config show -g "$RG" -n "$APP" -o json | jq '.storage'

printf '[%s] Restart app & verify\n' "$(ts)"
az functionapp restart -g "$RG" -n "$APP" >/dev/null
sleep 60
curl -is "https://$APP.azurewebsites.net/api/health" | sed -n '1,12p'
printf '[%s] Done\n' "$(ts)"
