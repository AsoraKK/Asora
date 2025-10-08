set -euo pipefail
RG=asora-psql-flex
APP=asora-function-consumption
SA=asoraflexdev1404

# 1) Solid baseline app settings (Consumption requires a full conn string)
KEY=$(az storage account keys list -g $RG -n $SA --query "[0].value" -o tsv)
CONN="DefaultEndpointsProtocol=https;AccountName=$SA;AccountKey=$KEY;EndpointSuffix=core.windows.net"

az webapp config appsettings set -g $RG -n $APP --settings \
  AzureWebJobsStorage="$CONN" \
  FUNCTIONS_EXTENSION_VERSION="~4" \
  FUNCTIONS_WORKER_RUNTIME="node" \
  WEBSITE_NODE_DEFAULT_VERSION="~18" \
  AzureWebJobsFeatureFlags= \
  WEBSITE_RUN_FROM_PACKAGE= \
  WEBSITE_SKIP_CONTENTSHARE= >/dev/null

# 2) Deploy a classic (function.json) HTTP function -> no Worker Indexing needed
TMP=$(mktemp -d); cd "$TMP"; mkdir -p health
cat > host.json <<'JSON'
{ "version": "2.0" }
JSON
cat > health/function.json <<'JSON'
{
  "bindings": [
    { "authLevel": "anonymous", "type": "httpTrigger", "direction": "in", "name": "req", "methods": ["get"] },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
JSON
cat > health/index.js <<'JS'
module.exports = async function (context, req) {
  context.res = { status: 200, body: "OK" };
};
JS
zip -r probe.zip .

# 3) Zip deploy (no SAS, no Kudu build)
az functionapp deployment source config-zip -g $RG -n $APP --src probe.zip

# 4) Restart + verify
az functionapp restart -g $RG -n $APP
sleep 15
curl -s -i https://$APP.azurewebsites.net/api/health | sed -n '1,5p'
