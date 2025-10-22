#!/usr/bin/env bash
# Verify Cosmos DB container deployment
# Usage: bash verify-cosmos-deployment.sh <env> <account-name> <resource-group> <database>

set -euo pipefail

ENV="${1:-dev}"
ACCT="${2:-asora-cosmos-${ENV}}"
RG="${3:-asora-psql-flex}"
DB="${4:-asora}"

echo "=== Verifying Cosmos DB deployment for $ENV ==="
echo "Account: $ACCT"
echo "Resource Group: $RG"
echo "Database: $DB"
echo ""

# List all containers with partition key info
echo "📦 Containers:"
az cosmosdb sql container list \
  -g "$RG" \
  -a "$ACCT" \
  -d "$DB" \
  --query "[].{Name:name,PartitionKey:resource.partitionKey.paths[0],Version:resource.partitionKey.version}" \
  -o table

# Expected containers
EXPECTED_CONTAINERS=(
  "posts"
  "comments"
  "likes"
  "content_flags"
  "appeals"
  "appeal_votes"
  "users"
  "config"
  "moderation_decisions"
)

echo ""
echo "🔍 Verification:"

# Check each container exists
MISSING=()
for container in "${EXPECTED_CONTAINERS[@]}"; do
  if az cosmosdb sql container show \
    -g "$RG" \
    -a "$ACCT" \
    -d "$DB" \
    -n "$container" &>/dev/null; then
    echo "  ✅ $container exists"
  else
    echo "  ❌ $container missing"
    MISSING+=("$container")
  fi
done

# Check partition key version
echo ""
echo "📊 Partition Key Versions:"
for container in "${EXPECTED_CONTAINERS[@]}"; do
  VERSION=$(az cosmosdb sql container show \
    -g "$RG" \
    -a "$ACCT" \
    -d "$DB" \
    -n "$container" \
    --query "resource.partitionKey.version" -o tsv 2>/dev/null || echo "N/A")
  
  if [[ "$VERSION" == "2" ]]; then
    echo "  ✅ $container: v$VERSION"
  else
    echo "  ⚠️  $container: v$VERSION (expected v2)"
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "❌ Deployment verification FAILED: ${#MISSING[@]} container(s) missing"
  exit 1
fi

echo ""
echo "✅ Deployment verification PASSED"
