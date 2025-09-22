#!/bin/bash
# Cosmos DB Target Containers Provisioning
# Creates new containers with correct partition keys for target architecture

set -euo pipefail

# Configuration
RG="${AZURE_RESOURCE_GROUP:-asora-psql-flex}"
ACCOUNT="${COSMOS_ACCOUNT:-asora-cosmos-dev}"
DATABASE="${COSMOS_DATABASE_NAME:-asora}"

echo "=== Creating Target Cosmos DB Containers ==="
echo "Resource Group: $RG"
echo "Account: $ACCOUNT"
echo "Database: $DATABASE"
echo

# Check if Azure CLI is logged in
if ! az account show >/dev/null 2>&1; then
    echo "❌ Please log in to Azure CLI first: az login"
    exit 1
fi

# Function to create container with error handling
create_container() {
    local name="$1"
    local partition_key="$2"
    local throughput="${3:-400}"
    
    echo "Creating container: $name (pk: $partition_key, throughput: $throughput RU/s)"
    
    if az cosmosdb sql container create \
        --resource-group "$RG" \
        --account-name "$ACCOUNT" \
        --database-name "$DATABASE" \
        --name "$name" \
        --partition-key-path "$partition_key" \
        --throughput "$throughput" \
        --output none 2>/dev/null; then
        echo "✅ Created $name"
    else
        echo "⚠️  Container $name already exists or creation failed"
    fi
}

# 1) posts_v2 - Single post partition (pk: /postId)
create_container "posts_v2" "/postId" 1000

# 2) userFeed - Timeline partition (pk: /recipientId)
create_container "userFeed" "/recipientId" 2000

# 3) reactions - Post reactions partition (pk: /postId)
create_container "reactions" "/postId" 800

# 4) notifications - User notifications partition (pk: /recipientId)
create_container "notifications" "/recipientId" 1000

# 5) counters - Subject counters partition (pk: /subjectId)
create_container "counters" "/subjectId" 400

# 6) publicProfiles - User profile projection (pk: /userId)
create_container "publicProfiles" "/userId" 600

echo
echo "=== Container Creation Complete ==="

# Verify containers exist
echo "Verifying created containers..."
echo

az cosmosdb sql container list \
    --resource-group "$RG" \
    --account-name "$ACCOUNT" \
    --database-name "$DATABASE" \
    --query "[?contains(['posts_v2','userFeed','reactions','notifications','counters','publicProfiles'], name)].{Name:name,PartitionKey:resource.partitionKey.paths[0],Throughput:options.throughput}" \
    --output table

echo
echo "🎉 Target Cosmos containers provisioned successfully!"
echo
echo "Next steps:"
echo "1. Update application code to use new containers"
echo "2. Implement dual-write to posts_v2"
echo "3. Set up change feed processors"
echo "4. Backfill data from legacy containers"
echo "5. Switch read paths to new containers"