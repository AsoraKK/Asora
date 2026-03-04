#!/usr/bin/env bash
# One-shot: Windows Consumption (Y1) Function App in North Europe + v4 Node health probe
# Requires az CLI login, bash, zip, Node.js/npm

set -euo pipefail

# === Inputs (North Europe) ===
SUB="$(az account show --query id -o tsv)"
LOC="northeurope"
RG="${RG:-asora-y1-win-ne}"
APP="${APP:-asora-func-y1-win-ne}"
ZIP="${ZIP:-/tmp/release.zip}"

# Storage account: lowercase, <=24 chars
RND="$(printf '%04d' $((RANDOM % 10000)))"
SA_RAW="${SA:-asorawinfunc${RND}}"
SA="$(echo "${SA_RAW}" | tr -cd 'a-z0-9' | cut -c1-24)"

echo "== North Europe Windows Consumption deploy =="
echo "SUB=${SUB}"
echo "LOC=${LOC}"
echo "RG=${RG}"
echo "SA=${SA}"
echo "APP=${APP}"
echo "ZIP=${ZIP}"

echo "== 1) Resource group =="
az group create -n "${RG}" -l "${LOC}" -o none

echo "== 2) Storage account (Functions backend) =="
az storage account create -g "${RG}" -n "${SA}" -l "${LOC}" \
  --sku Standard_LRS --kind StorageV2 --https-only true -o none

echo "== 3) Windows Consumption (Y1) Function App, Node v20, Functions v4 =="
az functionapp create -g "${RG}" -n "${APP}" \
  --consumption-plan-location "${LOC}" \
  --os-type Windows \
  --runtime node --runtime-version 20 \
  --functions-version 4 \
  --storage-account "${SA}" -o none

# Safety: ensure no conflicting run-from settings from prior attempts
az functionapp config appsettings delete -g "${RG}" -n "${APP}" \
  --setting-names WEBSITE_RUN_FROM_PACKAGE WEBSITE_RUN_FROM_ZIP >/dev/null 2>&1 || true

echo "== 4) Build minimal v4 programmatic health function (with node_modules) =="
WORK="$(mktemp -d)"
pushd "${WORK}" >/dev/null

cat > package.json <<'JSON'
{
  "name": "health-probe",
  "version": "1.0.0",
  "dependencies": {
    "@azure/functions": "^4.4.0"
  }
}
JSON

cat > host.json <<'JSON'
{ "version": "2.0" }
JSON

mkdir -p health
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
module.exports = async function (context, req) {
  context.res = {
    status: 200,
    body: { ok: true }
  };
};
JS

npm install --omit=dev >/dev/null
zip -qr "${ZIP}" .
popd >/dev/null
echo "Built package at ${ZIP}"

echo "== 5) ZIP deploy via Kudu (config-zip) =="
az functionapp deployment source config-zip -g "${RG}" -n "${APP}" --src "${ZIP}" -o none

echo "== 6) Warm and verify =="
az functionapp restart -g "${RG}" -n "${APP}" -o none
sleep 20
curl -is "https://${APP}.azurewebsites.net/api/health" | sed -n '1,12p'

