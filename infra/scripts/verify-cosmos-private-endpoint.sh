#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: verify-cosmos-private-endpoint.sh <cosmos-account> <resource-group> [private|public-keyvault]

Validates the Cosmos DB network posture. Private networking is the default.
The public-keyvault mode is limited to the shared-cost Technical Alpha and
requires TLS 1.2; the deployment workflow separately verifies the connection
string is a resolved Azure Key Vault reference.

Example:
  verify-cosmos-private-endpoint.sh asora-cosmos-prod asora-psql-flex
  verify-cosmos-private-endpoint.sh asora-cosmos-dev asora-psql-flex public-keyvault
EOF
  exit 1
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
fi

COSMOS_ACCOUNT="$1"
RESOURCE_GROUP="$2"
NETWORK_MODE="${3:-private}"

if [[ "$NETWORK_MODE" != "private" && "$NETWORK_MODE" != "public-keyvault" ]]; then
  echo "Invalid Cosmos network mode: ${NETWORK_MODE}"
  usage
fi

echo "Verifying Cosmos DB network posture for ${COSMOS_ACCOUNT} (${NETWORK_MODE})..."

public_access=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "publicNetworkAccess" -o tsv 2>/dev/null || echo "Enabled")

if [[ "$NETWORK_MODE" == "public-keyvault" ]]; then
  min_tls=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "minimalTlsVersion" -o tsv 2>/dev/null || echo "")

  if [[ "$public_access" != "Enabled" ]]; then
    echo "  ERROR: public-keyvault mode expects the shared Cosmos public endpoint to be Enabled"
    exit 1
  fi
  if [[ "$min_tls" != "Tls12" ]]; then
    echo "  ERROR: public-keyvault mode requires Cosmos minimum TLS version Tls12"
    exit 1
  fi

  echo "  PASS: Cost-constrained public endpoint uses TLS 1.2"
  echo "  PASS: Connection-secret Key Vault enforcement is verified by the deployment workflow"
  exit 0
fi

if [[ "$public_access" == "Disabled" ]]; then
  echo "  PASS: Public network access is Disabled"
elif [[ "$public_access" == "SecuredByPerimeter" ]]; then
  echo "  PASS: Public network access is SecuredByPerimeter"
else
  echo "  ERROR: Private mode requires public network access Disabled or SecuredByPerimeter"
  exit 1
fi

pe_count=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateEndpointConnections | length(@)" -o tsv 2>/dev/null || echo "0")

if [[ "$pe_count" -ge 1 ]]; then
  echo "  PASS: Private endpoint connections present: ${pe_count}"

  pe_states=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "privateEndpointConnections[].privateLinkServiceConnectionState.status" -o tsv 2>/dev/null || echo "")

  if echo "$pe_states" | grep -q "Approved"; then
    echo "  PASS: At least one private endpoint is Approved"
  else
    echo "  ERROR: No approved private endpoints found"
    exit 1
  fi
else
  echo "  ERROR: No private endpoint connections detected"
  exit 1
fi

if [[ "$public_access" != "Disabled" ]]; then
  ip_rule_count=$(az cosmosdb show \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query "ipRules | length(@)" -o tsv 2>/dev/null || echo "0")

  if [[ "$ip_rule_count" -gt 0 ]]; then
    echo "  PASS: IP firewall rules configured: ${ip_rule_count} rules"
  else
    echo "  INFO: No IP firewall rules; relying on private endpoints"
  fi
fi

echo "PASS: Cosmos DB private networking verification complete"
