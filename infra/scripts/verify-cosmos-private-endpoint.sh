#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: verify-cosmos-private-endpoint.sh <cosmos-account> <resource-group>

Validates that the Cosmos DB account has private endpoint connections
and public network access is properly configured.

Example:
  verify-cosmos-private-endpoint.sh asora-cosmos-prod asora-psql-flex
EOF
  exit 1
}

if [[ $# -ne 2 ]]; then
  usage
fi

COSMOS_ACCOUNT="$1"
RESOURCE_GROUP="$2"

echo "Verifying Cosmos DB private endpoint configuration for ${COSMOS_ACCOUNT}..."

# Check public network access setting
public_access=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "publicNetworkAccess" -o tsv 2>/dev/null || echo "Enabled")

if [[ "$public_access" == "Disabled" ]]; then
  echo "  ✅ Public network access is Disabled"
elif [[ "$public_access" == "SecuredByPerimeter" ]]; then
  echo "  ✅ Public network access is SecuredByPerimeter"
else
  echo "  ⚠️  Public network access is ${public_access} (consider Disabled for production)"
fi

# Check for private endpoint connections
pe_count=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateEndpointConnections | length(@)" -o tsv 2>/dev/null || echo "0")

if [[ "$pe_count" -ge 1 ]]; then
  echo "  ✅ Private endpoint connections present: ${pe_count}"
  
  # List private endpoint states
  pe_states=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "privateEndpointConnections[].privateLinkServiceConnectionState.status" -o tsv 2>/dev/null || echo "")
  
  if echo "$pe_states" | grep -q "Approved"; then
    echo "  ✅ At least one private endpoint is Approved"
  else
    echo "  ❌ No approved private endpoints found"
    exit 1
  fi
else
  echo "  ⚠️  No private endpoint connections detected"
  if [[ "$public_access" == "Enabled" ]]; then
    echo "  ❌ Cosmos DB is publicly accessible without private endpoints"
    exit 1
  fi
fi

# Check network ACL rules if public access is not fully disabled
if [[ "$public_access" != "Disabled" ]]; then
  default_action=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "ipRules | length(@)" -o tsv 2>/dev/null || echo "0")
  
  if [[ "$default_action" -gt 0 ]]; then
    echo "  ✅ IP firewall rules configured: ${default_action} rules"
  else
    echo "  ⚠️  No IP firewall rules; relying on private endpoints only"
  fi
fi

echo "✅ Cosmos DB private networking verification complete"
