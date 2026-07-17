#!/usr/bin/env bash
# Verify Terraform plan safety before apply
# Usage: bash verify-plan-safety.sh <plan-file> <mode>

set -euo pipefail

PLAN_FILE="${1:-}"
MODE="${2:-serverless}"

if [[ -z "$PLAN_FILE" || ! -f "$PLAN_FILE" ]]; then
  echo "❌ Usage: $0 <plan-file> <mode>"
  echo "   Example: $0 tf.plan serverless"
  exit 1
fi

echo "=== Verifying Terraform plan safety ==="
echo "Plan file: $PLAN_FILE"
echo "Expected mode: $MODE"
echo ""

# Convert binary plan to JSON
PLAN_JSON=$(mktemp)
trap "rm -f $PLAN_JSON" EXIT
terraform show -json "$PLAN_FILE" > "$PLAN_JSON"

# Ordinary application delivery must not create, replace, or delete shared MVP
# databases, Function Apps/plans, vaults, storage, or observability resources.
node ../scripts/validate-terraform-plan-safety.mjs "$PLAN_JSON"

# Check for throughput/autoscale in serverless mode
if [[ "$MODE" == "serverless" ]]; then
  echo "🔍 Checking for throughput configuration in serverless mode..."
  
  THROUGHPUT_FOUND=$(jq -r '
    .resource_changes[]? |
    select(.type == "azurerm_cosmosdb_sql_container") |
    select(.change.after.throughput != null or .change.after.autoscale_settings != null) |
    .address
  ' "$PLAN_JSON" || true)
  
  if [[ -n "$THROUGHPUT_FOUND" ]]; then
    echo "❌ ERROR: Throughput or autoscale settings found in serverless mode:"
    echo "$THROUGHPUT_FOUND"
    echo ""
    echo "Serverless containers must NOT have throughput or autoscale_settings."
    exit 1
  fi
  
  echo "✅ No throughput configuration found (correct for serverless)"
fi

# Check for container replacements (high-risk operations)
echo ""
echo "🔍 Checking for container replacements..."

REPLACEMENTS=$(jq -r '
  .resource_changes[]? |
  select(.type == "azurerm_cosmosdb_sql_container") |
  select(.change.actions[] | contains("delete")) |
  .address
' "$PLAN_JSON" || true)

if [[ -n "$REPLACEMENTS" ]]; then
  echo "⚠️  WARNING: Plan includes container replacements (DATA LOSS RISK):"
  echo "$REPLACEMENTS"
  echo ""
  echo "Review carefully before applying. Consider importing existing containers first."
  echo "See: infra/scripts/import-cosmos-container.sh"
  exit 1
fi

echo "✅ No container replacements detected"

# Check for creates vs updates
CREATES=$(jq -r '
  .resource_changes[]? |
  select(.type == "azurerm_cosmosdb_sql_container") |
  select(.change.actions[] | contains("create")) |
  .address
' "$PLAN_JSON" | wc -l)

UPDATES=$(jq -r '
  .resource_changes[]? |
  select(.type == "azurerm_cosmosdb_sql_container") |
  select(.change.actions[] | contains("update")) |
  .address
' "$PLAN_JSON" | wc -l)

echo ""
echo "📊 Plan summary:"
echo "  Creates: $CREATES container(s)"
echo "  Updates: $UPDATES container(s)"

echo ""
echo "✅ Plan safety verification PASSED"
