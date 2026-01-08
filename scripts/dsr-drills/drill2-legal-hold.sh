#!/bin/bash
#
# DSR Drill 2: Delete with Legal Hold
#
# Tests that delete requests are blocked when a legal hold is active,
# and proceed correctly after hold is cleared.
#
# Prerequisites:
#   - Azure CLI authenticated with 'privacy_admin' role
#   - Cosmos DB access configured
#
# Usage:
#   export BEARER_TOKEN="<privacy_admin_jwt>"
#   ./drill2-legal-hold.sh <test_user_id>

set -euo pipefail

BASE_URL="${DSR_BASE_URL:-https://asora-function-dev.azurewebsites.net}"
TEST_USER_ID="${1:-}"
BEARER_TOKEN="${BEARER_TOKEN:-}"

echo "=== DSR DRILL 2: DELETE WITH LEGAL HOLD ==="
echo "Timestamp: $(date -Iseconds)"
echo "Base URL: $BASE_URL"
echo ""

if [[ -z "$TEST_USER_ID" ]]; then
  echo "ERROR: Usage: $0 <test_user_id>"
  exit 1
fi

if [[ -z "$BEARER_TOKEN" ]]; then
  echo "ERROR: BEARER_TOKEN not set"
  exit 1
fi

# Step 1: Place a legal hold on the test user
echo "Step 1: Place legal hold on user $TEST_USER_ID"
HOLD_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/legal-holds" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scope\": \"user\", \"scopeId\": \"$TEST_USER_ID\", \"reason\": \"Drill 2 test hold\"}")

HOLD_ID=$(echo "$HOLD_RESP" | jq -r '.id // empty')
if [[ -z "$HOLD_ID" ]]; then
  echo "ERROR: Failed to place legal hold"
  echo "$HOLD_RESP"
  exit 1
fi
echo "  ✓ Hold ID: $HOLD_ID"

# Step 2: Attempt delete request (should be blocked)
echo ""
echo "Step 2: Enqueue delete request (should be blocked by hold)"
DELETE_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/delete" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER_ID\", \"note\": \"Drill 2 test delete\"}")

REQUEST_ID=$(echo "$DELETE_RESP" | jq -r '.id // empty')
if [[ -z "$REQUEST_ID" ]]; then
  echo "ERROR: Failed to enqueue delete"
  echo "$DELETE_RESP"
  exit 1
fi
echo "  ✓ Request ID: $REQUEST_ID"

# Step 3: Wait and check status (should show hold blocking)
echo ""
echo "Step 3: Poll for processing (max 30s)"
MAX_WAIT=30
POLL_INTERVAL=5
ELAPSED=0
BLOCKED=false

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  
  STATUS_RESP=$(curl -s "$BASE_URL/_admin/dsr/$REQUEST_ID" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // empty')
  
  echo "  [$ELAPSED s] Status: $STATUS"
  
  # Check for hold blocking in audit
  HOLD_EVENT=$(echo "$STATUS_RESP" | jq -r '.audit[]? | select(.event | contains("hold")) | .event' | head -1)
  if [[ -n "$HOLD_EVENT" ]]; then
    BLOCKED=true
    echo "  ✓ Detected hold blocking: $HOLD_EVENT"
    break
  fi
  
  if [[ "$STATUS" == "failed" ]] || [[ "$STATUS" == "succeeded" ]]; then
    break
  fi
done

# Step 4: Clear the legal hold
echo ""
echo "Step 4: Clear legal hold $HOLD_ID"
CLEAR_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/legal-holds/$HOLD_ID/clear" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json")
CLEAR_STATUS=$(echo "$CLEAR_RESP" | jq -r '.active // "unknown"')
echo "  Hold active: $CLEAR_STATUS (should be false)"

# Step 5: Retry the delete
echo ""
echo "Step 5: Retry delete request"
RETRY_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/$REQUEST_ID/retry" \
  -H "Authorization: Bearer $BEARER_TOKEN")
RETRY_STATUS=$(echo "$RETRY_RESP" | jq -r '.status // empty')
echo "  Status after retry: $RETRY_STATUS"

# Step 6: Poll for completion
echo ""
echo "Step 6: Poll for delete completion (max 30s)"
ELAPSED=0

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  
  STATUS_RESP=$(curl -s "$BASE_URL/_admin/dsr/$REQUEST_ID" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // empty')
  
  echo "  [$ELAPSED s] Status: $STATUS"
  
  if [[ "$STATUS" == "succeeded" ]] || [[ "$STATUS" == "failed" ]]; then
    break
  fi
done

# Results
echo ""
echo "=== DRILL 2 RESULTS ==="
echo "Request ID:     $REQUEST_ID"
echo "Hold ID:        $HOLD_ID"
echo "Hold Blocked:   $BLOCKED"
echo "Final Status:   $STATUS"
echo ""

RESULT_FILE="results/drill2-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$(dirname "$RESULT_FILE")"
cat > "$RESULT_FILE" << EOF
{
  "drill": "drill2-legal-hold",
  "timestamp": "$(date -Iseconds)",
  "request_id": "$REQUEST_ID",
  "hold_id": "$HOLD_ID",
  "user_id": "$TEST_USER_ID",
  "blocked_by_hold": $BLOCKED,
  "final_status": "$STATUS",
  "passed": $([ "$BLOCKED" == "true" ] && echo true || echo false)
}
EOF
echo "Results saved to: $RESULT_FILE"
