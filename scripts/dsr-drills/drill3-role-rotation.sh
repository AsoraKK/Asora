#!/bin/bash
#
# DSR Drill 3: Storage Role Rotation
#
# Tests that after rotating storage roles, the Function MI
# still has valid permissions for DSR operations.
#
# Prerequisites:
#   - Azure CLI authenticated with sufficient privileges
#   - infra/scripts/grant-dsr-storage-access.sh available
#   - Privacy admin JWT for API calls
#
# Usage:
#   export BEARER_TOKEN="<privacy_admin_jwt>"
#   ./drill3-role-rotation.sh

set -euo pipefail

BASE_URL="${DSR_BASE_URL:-https://asora-function-dev.azurewebsites.net}"
BEARER_TOKEN="${BEARER_TOKEN:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_SCRIPTS="${SCRIPT_DIR}/../../infra/scripts"

echo "=== DSR DRILL 3: STORAGE ROLE ROTATION ==="
echo "Timestamp: $(date -Iseconds)"
echo "Base URL: $BASE_URL"
echo ""

if [[ -z "$BEARER_TOKEN" ]]; then
  echo "ERROR: BEARER_TOKEN not set"
  exit 1
fi

# Step 1: Verify current health
echo "Step 1: Verify current DSR health"
HEALTH_RESP=$(curl -s "$BASE_URL/api/health")
HEALTH_STATUS=$(echo "$HEALTH_RESP" | jq -r '.status // "unknown"')
echo "  Health status: $HEALTH_STATUS"

if [[ "$HEALTH_STATUS" != "healthy" ]]; then
  echo "  WARN: System not healthy before rotation"
fi

# Step 2: Check for rotation script
echo ""
echo "Step 2: Check rotation script availability"
ROTATION_SCRIPT="$INFRA_SCRIPTS/grant-dsr-storage-access.sh"

if [[ -f "$ROTATION_SCRIPT" ]]; then
  echo "  ✓ Rotation script found: $ROTATION_SCRIPT"
else
  echo "  ✗ Rotation script not found at: $ROTATION_SCRIPT"
  echo ""
  echo "Manual rotation steps:"
  echo "  1. az role assignment list --assignee <function-mi-id> --scope <storage-account>"
  echo "  2. az role assignment delete --assignee <function-mi-id> --role 'Storage Blob Data Contributor' --scope <storage-account>"
  echo "  3. az role assignment create --assignee <function-mi-id> --role 'Storage Blob Data Contributor' --scope <storage-account>"
  echo ""
  exit 1
fi

# Step 3: Execute role rotation
echo ""
echo "Step 3: Execute role rotation"
echo "  Running: $ROTATION_SCRIPT"

# Check if we can execute it
if [[ -x "$ROTATION_SCRIPT" ]]; then
  if ! "$ROTATION_SCRIPT" 2>&1; then
    echo "  ✗ Rotation script failed"
    exit 1
  fi
  echo "  ✓ Rotation completed"
else
  echo "  Script not executable. Running with bash..."
  if ! bash "$ROTATION_SCRIPT" 2>&1; then
    echo "  ✗ Rotation script failed"
    exit 1
  fi
  echo "  ✓ Rotation completed"
fi

# Step 4: Wait for propagation
echo ""
echo "Step 4: Wait for role propagation (30s)"
sleep 30

# Step 5: Test DSR operation
echo ""
echo "Step 5: Test DSR operation post-rotation"

# Use a test export to verify permissions
TEST_USER_ID="01912345-6789-7abc-8def-0123456789ab"  # Synthetic test ID
EXPORT_RESP=$(curl -s -X POST "$BASE_URL/_admin/dsr/export" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER_ID\", \"note\": \"Drill 3 post-rotation test\"}" 2>/dev/null || echo '{"error": "request_failed"}')

REQUEST_ID=$(echo "$EXPORT_RESP" | jq -r '.id // empty')
if [[ -n "$REQUEST_ID" ]]; then
  echo "  ✓ DSR export enqueued: $REQUEST_ID"
  PERMISSIONS_OK=true
else
  ERROR_MSG=$(echo "$EXPORT_RESP" | jq -r '.error // "unknown"')
  echo "  ✗ DSR export failed: $ERROR_MSG"
  PERMISSIONS_OK=false
fi

# Step 6: Verify health again
echo ""
echo "Step 6: Verify post-rotation health"
HEALTH_RESP=$(curl -s "$BASE_URL/api/health")
POST_HEALTH=$(echo "$HEALTH_RESP" | jq -r '.status // "unknown"')
echo "  Health status: $POST_HEALTH"

# Results
echo ""
echo "=== DRILL 3 RESULTS ==="
echo "Pre-rotation health:  $HEALTH_STATUS"
echo "Post-rotation health: $POST_HEALTH"
echo "DSR permissions OK:   $PERMISSIONS_OK"
echo ""

RESULT_FILE="results/drill3-$(date +%Y%m%d-%H%M%S).json"
mkdir -p "$(dirname "$RESULT_FILE")"
cat > "$RESULT_FILE" << EOF
{
  "drill": "drill3-role-rotation",
  "timestamp": "$(date -Iseconds)",
  "pre_health": "$HEALTH_STATUS",
  "post_health": "$POST_HEALTH",
  "permissions_ok": $PERMISSIONS_OK,
  "passed": $([ "$PERMISSIONS_OK" == "true" ] && [ "$POST_HEALTH" == "healthy" ] && echo true || echo false)
}
EOF
echo "Results saved to: $RESULT_FILE"

if [[ "$PERMISSIONS_OK" != "true" ]] || [[ "$POST_HEALTH" != "healthy" ]]; then
  echo ""
  echo "DRILL FAILED - Investigate permissions and re-run rotation script"
  exit 1
fi
