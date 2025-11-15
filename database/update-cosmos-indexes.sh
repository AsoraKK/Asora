#!/bin/bash

# Update Cosmos containers with production indexing and TTL policies
# Requires Azure CLI and authentication

DB_NAME="AsoraDatabase"
ACCOUNT_NAME="$COSMOS_ACCOUNT_NAME"

echo "Updating Cosmos DB container indexing policies and TTL settings..."

# Update userFeed with composite indexes for feed queries
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "userFeed" \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/recipientId", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ],
      [
        {"path": "/recipientId", "order": "ascending"},
        {"path": "/relevanceScore", "order": "descending"},
        {"path": "/createdAt", "order": "descending"}
      ]
    ]
  }'

# Update posts with indexes aligned with feed pagination
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "posts" \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/createdAt", "order": "descending"},
        {"path": "/id", "order": "descending"}
      ],
      [
        {"path": "/authorId", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ]
    ]
  }'

# Update posts_v2 with indexes for author queries and content discovery
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "posts_v2" \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/authorId", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ],
      [
        {"path": "/status", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ]
    ]
  }'

# Update reactions with indexes for post reactions and user history
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "reactions" \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/postId", "order": "ascending"},
        {"path": "/type", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ],
      [
        {"path": "/userId", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ]
    ]
  }'

# Update notifications with TTL (30 days) and read status index
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "notifications" \
  --ttl 2592000 \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/recipientId", "order": "ascending"},
        {"path": "/read", "order": "ascending"},
        {"path": "/createdAt", "order": "descending"}
      ]
    ]
  }'

# Update counters with TTL (90 days) and type-based queries
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "counters" \
  --ttl 7776000 \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}],
    "compositeIndexes": [
      [
        {"path": "/subjectId", "order": "ascending"},
        {"path": "/type", "order": "ascending"}
      ]
    ]
  }'

# Update publicProfiles with optimized indexing (exclude bio from indexing)
az cosmosdb sql container update \
  --account-name "$ACCOUNT_NAME" \
  --database-name "$DB_NAME" \
  --name "publicProfiles" \
  --idx-policy '{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [
      {"path": "/\"_etag\"/?"},
      {"path": "/bio/?"}
    ]
  }'

echo "✅ All container indexing policies and TTL settings updated"
echo "📊 TTL configured: notifications (30d), counters (90d)"
echo "🔍 Composite indexes optimized for single-partition queries"
