#!/usr/bin/env bash
set -Eeuo pipefail

: "${SUBS:?SUBS unset}"
: "${RG:?RG unset}"
: "${APP:?APP unset}"
API_SITE="${API_VERSION:-2023-01-01}"
API_PLAN="2022-03-01"

APP_ID="/subscriptions/${SUBS}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"

# 0) Auth sanity
az account show -o none || { echo "::error::Not logged in"; exit 1; }
az account set --subscription "$SUBS"

# 1) Get site; extract serverFarmId; read plan sku
SITE_JSON=$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_SITE}")
PLAN_ID=$(jq -r '.properties.serverFarmId // empty' <<<"$SITE_JSON")
if [ -z "$PLAN_ID" ]; then
  # fallback via CLI if RBAC trims fields
  PLAN_ID=$(az functionapp show -g "$RG" -n "$APP" --query "serverFarmId" -o tsv 2>/dev/null || echo "")
fi

if [ -z "$PLAN_ID" ]; then
  echo "::error::serverFarmId not found on site"; exit 1
fi

PLAN_JSON=$(az rest --method get --url "https://management.azure.com${PLAN_ID}?api-version=${API_PLAN}")
TIER=$(jq -r '.sku.tier // empty' <<<"$PLAN_JSON")
NAME=$(jq -r '.sku.name // empty' <<<"$PLAN_JSON")

# 2) Determine FlexConsumption
IS_FLEX=0
if [ "$TIER" = "FlexConsumption" ] || [[ "$NAME" =~ ^FC. ]]; then
  IS_FLEX=1
fi

CUR_NAME=$(jq -r '.properties.functionAppConfig.runtime.name // empty' <<<"$SITE_JSON")
CUR_VER=$(jq -r '.properties.functionAppConfig.runtime.version // empty' <<<"$SITE_JSON")
echo "Plan tier=${TIER:-<unknown>} sku=${NAME:-<unknown>} runtime=${CUR_NAME:-<none>}@${CUR_VER:-<none>}"

if [ "$IS_FLEX" -ne 1 ]; then
  echo "Non-Flex app detected; skipping normalization without error."
  exit 0
fi

# 3) Remove Flex-incompatible settings only if present
EXISTING=$(az functionapp config appsettings list -g "$RG" -n "$APP" --query "[].name" -o tsv || true)
for k in WEBSITE_RUN_FROM_PACKAGE WEBSITE_RUN_FROM_ZIP WEBSITE_NODE_DEFAULT_VERSION FUNCTIONS_WORKER_RUNTIME FUNCTIONS_EXTENSION_VERSION; do
  if grep -qx "$k" <<<"$EXISTING"; then
    az functionapp config appsettings delete -g "$RG" -n "$APP" --setting-names "$k" -o none || true
    echo "Removed $k"
  fi
done

# 4) Patch runtime to node@20 if different
TARGET_NAME="node"
TARGET_VER="20"
if [ "$CUR_NAME" != "$TARGET_NAME" ] || [ "$CUR_VER" != "$TARGET_VER" ]; then
  PATCH=$(jq -n --arg n "$TARGET_NAME" --arg v "$TARGET_VER" '{properties:{functionAppConfig:{runtime:{name:$n,version:$v}}}}')
  az rest --method patch \
    --url "https://management.azure.com${APP_ID}?api-version=${API_SITE}" \
    --headers "Content-Type=application/json" \
    --body "$PATCH" -o none
fi

# 5) Read-back verify
SITE_JSON2=$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_SITE}")
NEW_NAME=$(jq -r '.properties.functionAppConfig.runtime.name // empty' <<<"$SITE_JSON2")
NEW_VER=$(jq -r '.properties.functionAppConfig.runtime.version // empty' <<<"$SITE_JSON2")

if [ "$NEW_NAME" = "$TARGET_NAME" ] && [ "$NEW_VER" = "$TARGET_VER" ]; then
  echo "✓ Flex settings normalized to ${NEW_NAME}@${NEW_VER}"
else
  echo "::group::ARM response"; echo "$SITE_JSON2" | jq .; echo "::endgroup::"
  echo "::error::Runtime update did not persist; check RBAC or API version"
  exit 1
fi
