#!/bin/bash

# ============================================================================
# SETUP COSMOS DB FOR MODERATION WEIGHTS
# 
# Creates the necessary Cosmos DB container for storing admin-customized
# moderation class weights. This is a one-time setup script.
#
# Usage: bash setup-cosmos-moderation-weights.sh
# ============================================================================

set -e

# Configuration
RESOURCE_GROUP="${1:-asora-rg}"
COSMOS_ACCOUNT="${2:-asora-cosmos}"
DATABASE_NAME="asora-db"
CONTAINER_NAME="ModerationWeights"
PARTITION_KEY="/className"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Setting up Cosmos DB for Moderation Weights              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "Cosmos Account: $COSMOS_ACCOUNT"
echo "Database: $DATABASE_NAME"
echo "Container: $CONTAINER_NAME"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

# Verify resource group exists
echo "📍 Verifying resource group: $RESOURCE_GROUP"
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "❌ Resource group '$RESOURCE_GROUP' not found."
    exit 1
fi

# Verify Cosmos account exists
echo "📍 Verifying Cosmos account: $COSMOS_ACCOUNT"
if ! az cosmosdb show --resource-group "$RESOURCE_GROUP" --name "$COSMOS_ACCOUNT" &> /dev/null; then
    echo "❌ Cosmos account '$COSMOS_ACCOUNT' not found."
    exit 1
fi

# Create database if it doesn't exist
echo "📍 Creating database (if not exists): $DATABASE_NAME"
az cosmosdb sql database create \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOS_ACCOUNT" \
    --name "$DATABASE_NAME" \
    --throughput 400 \
    2>/dev/null || echo "   (Database already exists)"

# Create container for moderation weights
echo "📍 Creating container: $CONTAINER_NAME"
az cosmosdb sql container create \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOS_ACCOUNT" \
    --database-name "$DATABASE_NAME" \
    --name "$CONTAINER_NAME" \
    --partition-key-path "$PARTITION_KEY" \
    --throughput 400 \
    2>/dev/null || echo "   (Container already exists)"

# Enable TTL (optional - set to -1 for never expire)
echo "📍 Enabling TTL (Time To Live): Disabled (never expire)"
az cosmosdb sql container update \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOS_ACCOUNT" \
    --database-name "$DATABASE_NAME" \
    --name "$CONTAINER_NAME" \
    --ttl -1 \
    2>/dev/null || echo "   (TTL configuration skipped)"

# Create composite index for efficient queries
echo "📍 Creating composite indexes for efficient queries"
az cosmosdb sql container update \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOS_ACCOUNT" \
    --database-name "$DATABASE_NAME" \
    --name "$CONTAINER_NAME" \
    --idx '{"indexingMode":"consistent","includedPaths":[{"path":"/*"}],"excludedPaths":[{"path":"/\"_etag\"/?"}],"compositeIndexes":[[{"path":"/apiType","order":"ascending"},{"path":"/active","order":"ascending"}],[{"path":"/lastModifiedAt","order":"descending"}]]}' \
    2>/dev/null || echo "   (Indexes already exist or skipped)"

echo ""
echo "✅ Cosmos DB setup complete!"
echo ""
echo "Container Details:"
echo "  - Database: $DATABASE_NAME"
echo "  - Container: $CONTAINER_NAME"
echo "  - Partition Key: $PARTITION_KEY"
echo "  - TTL: Disabled (documents never expire)"
echo ""
echo "Sample document structure:"
echo '{
  "id": "text_hate",
  "className": "hate",
  "apiType": "text",
  "customWeight": 0.90,
  "defaultWeight": 0.85,
  "lastModifiedBy": "admin@lythaus.com",
  "lastModifiedAt": "2026-01-18T14:30:00Z",
  "changeReason": "Reducing false positives",
  "active": true
}'
echo ""
echo "Next steps:"
echo "1. Update Azure Functions environment: Set COSMOS_CONNECTION_STRING"
echo "2. Deploy the Control Panel API endpoints"
echo "3. Test via: curl -X GET http://localhost:7072/api/admin/moderation-classes"
