#!/usr/bin/env bash
set -Eeuo pipefail

: "${SUBS:?SUBS unset}"
: "${RG:?RG unset}"
: "${APP:?APP unset}"

sub_opt=(--subscription "$SUBS")
APP_ID="/subscriptions/${SUBS}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}"

PLAN_ID="$(az resource show "${sub_opt[@]}" --ids "$APP_ID" --query "properties.serverFarmId" -o tsv --only-show-errors || echo "")"
KIND="$(az resource show "${sub_opt[@]}" --ids "$APP_ID" --query "kind" -o tsv --only-show-errors || echo "")"
TIER=""
if [ -n "$PLAN_ID" ]; then
  TIER="$(az resource show "${sub_opt[@]}" --ids "$PLAN_ID" --query "sku.tier" -o tsv --only-show-errors || echo "")"
fi
IS_FLEX=false
if [ "$TIER" = "FlexConsumption" ] || [[ "$KIND" == *flex* ]]; then
  IS_FLEX=true
fi

if "$IS_FLEX"; then
  az functionapp config appsettings delete "${sub_opt[@]}" -g "$RG" -n "$APP" --setting-names FUNCTIONS_WORKER_RUNTIME WEBSITE_NODE_DEFAULT_VERSION FUNCTIONS_EXTENSION_VERSION -o none --only-show-errors || true
  API="2022-03-01"
  SITE_JSON="$(az rest --method get --url "https://management.azure.com$APP_ID?api-version=$API" --only-show-errors)"
  RUNTIME_JSON="$(jq -c '.properties.functionAppConfig.runtime // {}' <<<"$SITE_JSON" || echo '{}')"
  echo "Flex runtime: $RUNTIME_JSON"
  NAME="$(jq -r '.name // ""' <<<"$RUNTIME_JSON")"
  VER="$(jq -r '.version // ""' <<<"$RUNTIME_JSON")"
  if [ "$NAME" != "node" ] || [ "$VER" != "20" ]; then
    echo "::warning::Flex runtime not reported as node/20; continuing (API sometimes omits runtime)."
  fi
  az resource update "${sub_opt[@]}" -g "$RG" -n "$APP/config/web" --resource-type "Microsoft.Web/sites/config" --set properties.linuxFxVersion="" -o none --only-show-errors || true
else
  az functionapp config appsettings set "${sub_opt[@]}" -g "$RG" -n "$APP" -o none --only-show-errors --settings \
    FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR=true \
    APPLICATIONINSIGHTS_ROLE_NAME="$APP"
  if [[ "$KIND" == *linux* ]]; then
    az functionapp config set "${sub_opt[@]}" -g "$RG" -n "$APP" --linux-fx-version "node|20" -o none --only-show-errors
  fi
fi

az functionapp restart "${sub_opt[@]}" -g "$RG" -n "$APP" -o none --only-show-errors

ROLE_VAL="$(az functionapp config appsettings list "${sub_opt[@]}" -g "$RG" -n "$APP" --query "[?name=='APPLICATIONINSIGHTS_ROLE_NAME'].value|[0]" -o tsv --only-show-errors)"
if [ "$ROLE_VAL" != "$APP" ]; then
  echo "::error::AI role not set on $APP"
  exit 3
fi
