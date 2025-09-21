#!/usr/bin/env bash
set -Eeuo pipefail

SUBS="${SUBS:?SUBS is empty}"
RG="${RG:?RG is empty}"
APP="${APP:?APP is empty}"
API_VERSION="${API_VERSION:-2023-01-01}"

if ! az account show -o none >/dev/null 2>&1; then
  echo "::error::Azure CLI is not logged in. Run azure/login@v2 in this job."
  exit 1
fi

az account set --subscription "$SUBS"

APP_ID="/subscriptions/${SUBS}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"
SITE_JSON="$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_VERSION}")"

TIER="$(jq -r '.sku.tier // empty' <<<"$SITE_JSON")"
CUR_NAME="$(jq -r '.properties.functionAppConfig.runtime.name // empty' <<<"$SITE_JSON")"
CUR_VER="$(jq -r '.properties.functionAppConfig.runtime.version // empty' <<<"$SITE_JSON")"

echo "Plan tier=${TIER:-<unknown>} runtime=${CUR_NAME:-<none>}@${CUR_VER:-<none>}"

if [ "$TIER" != "FlexConsumption" ]; then
  echo "::error::Not a FlexConsumption app; refusing to modify runtime"
  exit 1
fi

EXISTING_KEYS="$(az functionapp config appsettings list -g "$RG" -n "$APP" --query '[].name' -o tsv || echo '')"
for KEY in WEBSITE_RUN_FROM_PACKAGE WEBSITE_RUN_FROM_ZIP WEBSITE_NODE_DEFAULT_VERSION FUNCTIONS_WORKER_RUNTIME FUNCTIONS_EXTENSION_VERSION; do
  if grep -qx "$KEY" <<<"$EXISTING_KEYS"; then
    az functionapp config appsettings delete -g "$RG" -n "$APP" --setting-names "$KEY" -o none
    echo "Removed $KEY"
  fi
done

TARGET_NAME="node"
TARGET_VER="20"

if [ "$CUR_NAME" != "$TARGET_NAME" ] || [ "$CUR_VER" != "$TARGET_VER" ]; then
  echo "Updating functionAppConfig.runtime to ${TARGET_NAME}@${TARGET_VER}"
  PATCH_BODY="$(jq -n --arg name "$TARGET_NAME" --arg ver "$TARGET_VER" '{properties:{functionAppConfig:{runtime:{name:$name,version:$ver}}}}')"
  az rest --method patch \
    --url "https://management.azure.com${APP_ID}?api-version=${API_VERSION}" \
    --headers "Content-Type=application/json" \
    --body "$PATCH_BODY" -o none
fi

SITE_JSON_UPDATED="$(az rest --method get --url "https://management.azure.com${APP_ID}?api-version=${API_VERSION}")"
NEW_NAME="$(jq -r '.properties.functionAppConfig.runtime.name // empty' <<<"$SITE_JSON_UPDATED")"
NEW_VER="$(jq -r '.properties.functionAppConfig.runtime.version // empty' <<<"$SITE_JSON_UPDATED")"

if [ "$NEW_NAME" != "$TARGET_NAME" ] || [ "$NEW_VER" != "$TARGET_VER" ]; then
  echo "::group::ARM response"
  jq '.' <<<"$SITE_JSON_UPDATED" || echo "$SITE_JSON_UPDATED"
  echo "::endgroup::"
  echo "::error::Runtime update did not persist. Check RBAC or API version."
  exit 1
fi

echo "✓ Flex settings normalized to ${NEW_NAME}@${NEW_VER}"
