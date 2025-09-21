#!/usr/bin/env bash
set -euo pipefail

SUBS="${SUBS:?SUBS environment variable is required}"
RG="${RG:?RG environment variable is required}"
APP="${APP:?APP environment variable is required}"
API_VERSION="${API_VERSION:-2022-03-01}"
LOCATION="${LOCATION:-northeurope}"
TARGET_RUNTIME_NAME="node"
TARGET_RUNTIME_VERSION="${TARGET_RUNTIME_VERSION:-20}"
COSMOS_DATABASE_NAME="${COSMOS_DATABASE_NAME:-asora}"

APP_ID="/subscriptions/${SUBS}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"
WEB_CONFIG_ID="${APP_ID}/config/web"

echo "Inspecting plan for ${APP}..."
KIND="$(az functionapp show -g "$RG" -n "$APP" --query kind -o tsv 2>/dev/null || echo "")"
PLAN_ID="$(az resource show --ids "$APP_ID" --query properties.serverFarmId -o tsv 2>/dev/null || echo "")"
PLAN_TIER=""
if [ -n "$PLAN_ID" ]; then
  PLAN_TIER="$(az resource show --ids "$PLAN_ID" --query sku.tier -o tsv 2>/dev/null || echo "")"
fi
KIND_LOWER="$(echo "$KIND" | tr '[:upper:]' '[:lower:]')"
IS_FLEX=0
if [ "$PLAN_TIER" = "FlexConsumption" ] || [[ "$KIND_LOWER" == *"flex"* ]]; then
  IS_FLEX=1
fi
echo "kind=${KIND:-<unknown>} tier=${PLAN_TIER:-<unknown>} flex=${IS_FLEX}"

if [ "$IS_FLEX" -eq 1 ]; then
  echo "Flex plan detected. Removing deprecated app settings..."
  az functionapp config appsettings delete -g "$RG" -n "$APP" \
    --setting-names FUNCTIONS_WORKER_RUNTIME FUNCTIONS_EXTENSION_VERSION WEBSITE_NODE_DEFAULT_VERSION \
    --output none || true

  echo "Ensuring linuxFxVersion cleared for Flex..."
  az resource update --ids "$WEB_CONFIG_ID" --set properties.linuxFxVersion="" -o none || true

  echo "Setting safe baseline app settings..."
  az functionapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
    AzureWebJobsFeatureFlags=EnableWorkerIndexing \
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true \
    WEBSITE_RUN_FROM_PACKAGE=1

  echo "Fetching current runtime configuration..."
  RUNTIME_JSON="$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_VERSION}")"
  CURRENT_NAME="$(jq -r '.properties.functionAppConfig.runtime.name // empty' <<<"$RUNTIME_JSON")"
  CURRENT_VERSION="$(jq -r '.properties.functionAppConfig.runtime.version // empty' <<<"$RUNTIME_JSON")"
  echo "Current functionAppConfig.runtime: name=${CURRENT_NAME:-<empty>} version=${CURRENT_VERSION:-<empty>}"

  if [ "$CURRENT_NAME" != "$TARGET_RUNTIME_NAME" ] || [ "$CURRENT_VERSION" != "$TARGET_RUNTIME_VERSION" ]; then
    echo "Updating runtime to ${TARGET_RUNTIME_NAME} ${TARGET_RUNTIME_VERSION}..."
    az resource update --ids "$APP_ID" \
      --set properties.functionAppConfig.runtime.name="$TARGET_RUNTIME_NAME" \
            properties.functionAppConfig.runtime.version="$TARGET_RUNTIME_VERSION" \
      -o none
  else
    echo "Runtime already set to desired value."
  fi

  echo "Validating runtime configuration..."
  UPDATED_RUNTIME_JSON="$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_VERSION}")"
  jq '.properties.functionAppConfig.runtime' <<<"$UPDATED_RUNTIME_JSON"

  echo "Asserting deprecated settings are absent..."
  APP_SETTINGS_JSON="$(az functionapp config appsettings list -g "$RG" -n "$APP")"
  if jq -e '.[] | select(.name=="FUNCTIONS_WORKER_RUNTIME" or .name=="FUNCTIONS_EXTENSION_VERSION" or .name=="WEBSITE_NODE_DEFAULT_VERSION")' <<<"$APP_SETTINGS_JSON" >/dev/null; then
    echo "::error::Deprecated app settings still present after cleanup" >&2
    jq '.[] | select(.name=="FUNCTIONS_WORKER_RUNTIME" or .name=="FUNCTIONS_EXTENSION_VERSION" or .name=="WEBSITE_NODE_DEFAULT_VERSION")' <<<"$APP_SETTINGS_JSON"
    exit 1
  fi
  echo "✓ Deprecated app settings removed."

  echo "Listing supported Flex runtimes for verification (non-blocking)..."
  az functionapp list-flexconsumption-runtimes --location "$LOCATION" --runtime node -o table || true
else
  echo "Non-Flex plan detected. Applying legacy settings..."
  az functionapp config set -g "$RG" -n "$APP" --linux-fx-version "node|20" -o none || true
  az functionapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
    AzureWebJobsFeatureFlags=EnableWorkerIndexing \
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true \
    FUNCTIONS_EXTENSION_VERSION=~4 \
    FUNCTIONS_WORKER_RUNTIME=node \
    WEBSITE_NODE_DEFAULT_VERSION=~20 \
    WEBSITE_RUN_FROM_PACKAGE=1
fi

if [ -n "${COSMOS_CONNECTION_STRING:-}" ]; then
  echo "Updating Cosmos DB settings..."
  az functionapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
    COSMOS_CONNECTION_STRING="$COSMOS_CONNECTION_STRING" \
    COSMOS_DATABASE_NAME="$COSMOS_DATABASE_NAME"
fi

echo "Restarting Function App..."
az functionapp restart -g "$RG" -n "$APP" -o none
