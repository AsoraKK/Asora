#!/bin/bash
#
# DSR Drill 1: Export Flow End-to-End
#
# Prerequisites:
#   - Azure CLI authenticated with 'privacy_admin' role
#   - Cosmos DB access configured
#   - DSR storage account accessible
#
# Usage:
#   export BEARER_TOKEN="<privacy_admin_jwt>"
#   ./drill1-export.sh <test_user_id>

set -euo pipefail

BASE_URL="${DSR_BASE_URL:-https://asora-function-dev.azurewebsites.net}"
TEST_USER_ID="${1:-}"
BEARER_TOKEN="${BEARER_TOKEN:-}"

echo "=== DSR DRILL 1: EXPORT FLOW ==="
echo "Timestamp: $(date -Iseconds)"
echo "Base URL: $BASE_URL"
echo ""

if [[ -z "$TEST_USER_ID" ]]; then
  echo "ERROR: Usage: $0 <test_user_id>"
  echo "  Provide a UUIDv7 test user ID for export drill"
  exit 1
fi

if [[ -z "$BEARER_TOKEN" ]]; then
  echo "ERROR: BEARER_TOKEN not set"
  echo "  Export a JWT with 'privacy_admin' role first"
  exit 1
fi

# Step 1: Enqueue export request
echo "Step 1: Enqueue export for user $TEST_USER_ID"
EXPORT_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/export" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER_ID\", \"note\": \"Drill 1 test export\"}")

REQUEST_ID=$(echo "$EXPORT_RESP" | jq -r '.id // empty')
if [[ -z "$REQUEST_ID" ]]; then
  echo "ERROR: Failed to enqueue export"
  echo "$EXPORT_RESP"
  exit 1
fi
echo "  ✓ Request ID: $REQUEST_ID"

# Step 2: Check initial status
echo ""
echo "Step 2: Verify initial status (should be 'queued')"
STATUS_RESP=$(curl -s "$BASE_URL/_admin/dsr/$REQUEST_ID" \
  -H "Authorization: Bearer $BEARER_TOKEN")
STATUS=$(echo "$STATUS_RESP" | jq -r '.status // empty')
echo "  Status: $STATUS"

if [[ "$STATUS" != "queued" ]]; then
  echo "  WARN: Expected 'queued', got '$STATUS'"
fi

# Step 3: Wait for worker processing
echo ""
echo "Step 3: Poll for status change (max 60s)"
MAX_WAIT=60
POLL_INTERVAL=5
ELAPSED=0

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  
  STATUS_RESP=$(curl -s "$BASE_URL/_admin/dsr/$REQUEST_ID" \
    -H "Authorization: Bearer $BEARER_TOKEN")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // empty')
  
  echo "  [$ELAPSED s] Status: $STATUS"
  
  if [[ "$STATUS" == "awaiting_review" ]] || [[ "$STATUS" == "ready_to_release" ]] || [[ "$STATUS" == "released" ]]; then
    echo "  ✓ Export ready for review"
    break
  elif [[ "$STATUS" == "failed" ]]; then
    echo "  ✗ Export failed"
    echo "$STATUS_RESP" | jq .
    exit 1
  fi
done

# Step 4: Simulate reviewer approvals (if needed)
echo ""
echo "Step 4: Check review status"
REVIEW_A=$(echo "$STATUS_RESP" | jq -r '.review.a.pass // false')
REVIEW_B=$(echo "$STATUS_RESP" | jq -r '.review.b.pass // false')
echo "  Reviewer A: $REVIEW_A"
echo "  Reviewer B: $REVIEW_B"

# Step 5: Document results
echo ""
echo "=== DRILL 1 RESULTS ==="
echo "Request ID:    $REQUEST_ID"
echo "Final Status:  $STATUS"
echo "Review A:      $REVIEW_A"
echo "Review B:      $REVIEW_B"
echo ""
echo "Next steps:"
echo "  1. Review export content via /_admin/dsr/$REQUEST_ID"
echo "  2. Complete reviewer checklists via /_admin/dsr/$REQUEST_ID/review-a and /review-b"
echo "  3. Release download link via /_admin/dsr/$REQUEST_ID/release"
echo ""

# Save drill results
RESULT_FILE="results/drill1-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$(dirname "$RESULT_FILE")"
cat > "$RESULT_FILE" << EOF
{
  "drill": "drill1-export",
  "timestamp": "$(date -Iseconds)",
  "request_id": "$REQUEST_ID",
  "user_id": "$TEST_USER_ID",
  "final_status": "$STATUS",
  "review_a": $REVIEW_A,
  "review_b": $REVIEW_B,
  "passed": $([ "$STATUS" == "awaiting_review" ] || [ "$STATUS" == "ready_to_release" ] && echo true || echo false)
}
EOF
echo "Results saved to: $RESULT_FILE"
