#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: verify-dsr-storage.sh <storage-account> <resource-group> <function-principal-id>

Example:
  verify-dsr-storage.sh stasoradsr-staging-12345 asora-psql-flex 00000000-0000-0000-0000-000000000000
EOF
  exit 1
}

if [[ $# -ne 3 ]]; then
  usage
fi

STORAGE_ACCOUNT="$1"
RESOURCE_GROUP="$2"
PRINCIPAL_ID="$3"
CONTAINER_NAME="dsr-exports"
RULE_NAME="dsr-export-lifecycle"

echo "Verifying DSR storage account ${STORAGE_ACCOUNT} (${RESOURCE_GROUP})"

if az storage container show \
  --auth-mode login \
  --account-name "$STORAGE_ACCOUNT" \
  --name "$CONTAINER_NAME" &>/dev/null; then
  echo "  ✅ Container ${CONTAINER_NAME} exists"
else
  echo "  ❌ Container ${CONTAINER_NAME} missing or inaccessible"
  exit 1
fi

# Enforce container is private (no public access)
public_access=$(az storage container show \
  --auth-mode login \
  --account-name "$STORAGE_ACCOUNT" \
  --name "$CONTAINER_NAME" \
  --query "properties.publicAccess" -o tsv 2>/dev/null || echo "")
if [[ -z "$public_access" || "$public_access" == "None" || "$public_access" == "" ]]; then
  echo "  ✅ Container access is private"
else
  echo "  ❌ Container public access is enabled (${public_access})"
  exit 1
fi

rule_count=$(az storage account management-policy show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "policy.rules[?name=='${RULE_NAME}'] | length(@)" \
  -o tsv 2>/dev/null || echo "0")

if [[ "$rule_count" != "1" ]]; then
  echo "  ❌ Lifecycle rule ${RULE_NAME} missing"
  exit 1
fi

prefix=$(az storage account management-policy show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "policy.rules[?name=='${RULE_NAME}'] | [0].definition.filters.prefixMatch[0]" \
  -o tsv 2>/dev/null || echo "")

if [[ "$prefix" != "${CONTAINER_NAME}/" ]]; then
  echo "  ❌ Lifecycle prefix mismatch (${prefix:-missing})"
  exit 1
fi

base_days=$(az storage account management-policy show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "policy.rules[?name=='${RULE_NAME}'] | [0].definition.actions.baseBlob.deleteAfterDaysSinceModificationGreaterThan" \
  -o tsv 2>/dev/null || echo "")

snapshot_days=$(az storage account management-policy show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "policy.rules[?name=='${RULE_NAME}'] | [0].definition.actions.snapshot.deleteAfterDaysSinceCreationGreaterThan" \
  -o tsv 2>/dev/null || echo "")

if [[ "$base_days" != "30" || "$snapshot_days" != "30" ]]; then
  echo "  ❌ Lifecycle retention mismatch (base=${base_days:-missing}, snapshot=${snapshot_days:-missing})"
  exit 1
fi

echo "  ✅ Lifecycle rule ${RULE_NAME} deletes ${CONTAINER_NAME}/ after 30 days"

STORAGE_ACCOUNT_ID=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "id" -o tsv 2>/dev/null || true)

if [[ -z "$STORAGE_ACCOUNT_ID" ]]; then
  echo "  ❌ Unable to resolve storage account id"
  exit 1
fi

roles=$(az role assignment list \
  --scope "$STORAGE_ACCOUNT_ID" \
  --assignee "$PRINCIPAL_ID" \
  --query "[].roleDefinitionName" \
  -o tsv 2>/dev/null || true)

if [[ -z "$roles" ]]; then
  echo "  ❌ No role assignments found for ${PRINCIPAL_ID}"
  exit 1
fi

if ! grep -q "Storage Blob Data Contributor" <<< "$roles"; then
  echo "  ❌ ${PRINCIPAL_ID} missing Storage Blob Data Contributor role"
  exit 1
fi

echo "  ✅ ${PRINCIPAL_ID} granted Storage Blob Data Contributor on ${STORAGE_ACCOUNT}"

# Network hardening checks
pub_net=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "publicNetworkAccess" -o tsv 2>/dev/null || echo "Enabled")
if [[ "$pub_net" != "Disabled" ]]; then
  echo "  ❌ publicNetworkAccess should be Disabled, found: ${pub_net}"
  exit 1
fi
echo "  ✅ publicNetworkAccess is Disabled"

default_action=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "networkRuleSet.defaultAction" -o tsv 2>/dev/null || echo "Allow")
if [[ "$default_action" != "Deny" ]]; then
  echo "  ❌ networkRuleSet.defaultAction should be Deny, found: ${default_action}"
  exit 1
fi
echo "  ✅ Firewall default action is Deny"

pe_count=$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateEndpointConnections | length(@)" -o tsv 2>/dev/null || echo "0")
if [[ "$pe_count" -ge 1 ]]; then
  echo "  ✅ Private endpoint connections present: ${pe_count}"
else
  echo "  ⚠️  No private endpoint connections detected; relying on firewall rules only"
fi
