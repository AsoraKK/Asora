#!/usr/bin/env bash
set -euo pipefail

# Prereqs: az CLI logged in; resource group exists; Front Door profile exists.

RG=${RG:-asora-psql-flex}
REGION=${REGION:-northeurope}
APP=${APP:-asora-function-flex}
CANARY=${CANARY:-asora-function-flex-canary}
AI=${AI:-asora-ai-flex}
FD_PROFILE=${FD_PROFILE:-asora-frontdoor}
FD_ENDPOINT=${FD_ENDPOINT:-asora-frontdoor-endpoint}
FD_ORIGIN_GROUP=${FD_ORIGIN_GROUP:-asora-origin-group}

echo "Creating CANARY Function App (${CANARY}) in ${RG}/${REGION} (Flex)";

# NOTE: FlexConsumption creation flags can vary by CLI version. Options:
# 1) If supported by your az CLI:
# az functionapp create -g "$RG" -n "$CANARY" --consumption-plan-location "$REGION" \
#   --runtime node --runtime-version 20 --functions-version 4 --os-type linux --sku FlexConsumption
# 2) Otherwise, provision via Portal/ARM/Bicep and reuse here.

echo "Ensure Application Insights is linked via app setting (optional).";

echo "Add origins to Front Door and set weights.";
az afd origin create \
  -g "$RG" \
  --profile-name "$FD_PROFILE" \
  --origin-group-name "$FD_ORIGIN_GROUP" \
  --origin-name "$APP" \
  --host-name "${APP}.azurewebsites.net" \
  --enabled-state Enabled \
  --weight 100 || true

az afd origin create \
  -g "$RG" \
  --profile-name "$FD_PROFILE" \
  --origin-group-name "$FD_ORIGIN_GROUP" \
  --origin-name "$CANARY" \
  --host-name "${CANARY}.azurewebsites.net" \
  --enabled-state Enabled \
  --weight 0 || true

echo "Set initial split: prod=100, canary=0";
az afd origin update -g "$RG" --profile-name "$FD_PROFILE" --origin-group-name "$FD_ORIGIN_GROUP" --origin-name "$APP"    --host-name "${APP}.azurewebsites.net"    --weight 100 || true
az afd origin update -g "$RG" --profile-name "$FD_PROFILE" --origin-group-name "$FD_ORIGIN_GROUP" --origin-name "$CANARY" --host-name "${CANARY}.azurewebsites.net" --weight 0   || true

echo "Configure health probe on origin group (/api/health, 30s)";
az afd origin-group update \
  -g "$RG" \
  --profile-name "$FD_PROFILE" \
  --origin-group-name "$FD_ORIGIN_GROUP" \
  --probe-request-type GET \
  --probe-protocol Http \
  --probe-interval-in-seconds 30 \
  --probe-path "/api/health" || true

echo "Ensure cloud_RoleName is explicit for both apps (for AI filtering)";
az functionapp config appsettings set -g "$RG" -n "$APP"    --settings APPLICATIONINSIGHTS_ROLE_NAME="$APP"    -o none || true
az functionapp config appsettings set -g "$RG" -n "$CANARY" --settings APPLICATIONINSIGHTS_ROLE_NAME="$CANARY" -o none || true

echo "Done. Use workflow to deploy to CANARY and shift traffic to 10%."
