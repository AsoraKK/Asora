#!/bin/bash
# End-to-End notification test
# Usage: ./run-e2e-notification-test.sh <user-id> [event-type]
# Example: ./run-e2e-notification-test.sh user-123 POST_LIKE

set -e

USER_ID=${1}
EVENT_TYPE=${2:-POST_LIKE}

if [ -z "$USER_ID" ]; then
  echo "ERROR: User ID required"
  echo "Usage: $0 <user-id> [event-type]"
  echo "Example: $0 user-123 POST_LIKE"
  exit 1
fi

echo "========================================"
echo "E2E Notification Test"
echo "========================================"
echo "User ID: $USER_ID"
echo "Event Type: $EVENT_TYPE"
echo ""

# Check if COSMOS_CONNECTION_STRING is set
if [ -z "$COSMOS_CONNECTION_STRING" ]; then
  echo "ERROR: COSMOS_CONNECTION_STRING environment variable not set"
  echo ""
  echo "Set it via:"
  echo "  export COSMOS_CONNECTION_STRING=\"AccountEndpoint=...\""
  echo ""
  echo "Or retrieve from Azure:"
  echo "  az cosmosdb keys list --name <cosmos-account> --resource-group <rg> --type connection-strings --query \"connectionStrings[0].connectionString\" -o tsv"
  exit 1
fi

# Step 1: Enqueue test notification
echo "Step 1: Enqueuing test notification..."
node scripts/enqueue-test-notification.js "$USER_ID" "$EVENT_TYPE"

EVENT_ID=$(cat /tmp/last-notification-event-id.txt 2>/dev/null || echo "unknown")

echo ""
echo "Waiting 90 seconds for timer-trigger to process (runs every minute)..."
sleep 90

# Step 2: Check Cosmos for event status
echo ""
echo "Step 2: Checking event status in Cosmos..."
echo "(This requires Azure CLI access to Cosmos)"
echo ""
echo "Manual check: Azure Portal → Cosmos Data Explorer → notification_events"
echo "Query: SELECT * FROM c WHERE c.userId = \"$USER_ID\" ORDER BY c.createdAt DESC"
echo ""

# Step 3: Check for in-app notification
echo "Step 3: Checking in-app notification..."
echo "Manual check: Azure Portal → Cosmos Data Explorer → notifications"
echo "Query: SELECT * FROM c WHERE c.userId = \"$USER_ID\" ORDER BY c.createdAt DESC"
echo ""

# Step 4: Check Azure Notification Hub metrics
echo "Step 4: Checking push notification delivery..."
echo "Manual check: Azure Portal → Notification Hub → Monitoring → Metrics"
echo "Metric: Successful Sends (last 1 hour)"
echo ""

# Step 5: Verify on device
echo "Step 5: Verify on device..."
echo "- Check push notification received"
echo "- Open app → Notifications screen"
echo "- Should see new notification"
echo ""

echo "========================================"
echo "E2E Test Summary"
echo "========================================"
echo "✅ Step 1: Event enqueued"
echo "⏳ Step 2-5: Manual verification required"
echo ""
echo "Expected Timeline:"
echo "  T+0s: Event enqueued (PENDING)"
echo "  T+60-120s: Timer-trigger processes event"
echo "  T+60-120s: Push sent to device(s)"
echo "  T+60-120s: In-app notification created"
echo ""
echo "Troubleshooting:"
echo "- Check Function App logs (Azure Portal → Log Stream)"
echo "- Check Notification Hub metrics (Successful/Failed Sends)"
echo "- Verify device token exists in device_tokens container"
echo "- Check event status: SELECT * FROM c WHERE c.id = \"$EVENT_ID\""
echo ""
