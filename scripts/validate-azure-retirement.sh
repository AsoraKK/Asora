#!/usr/bin/env bash
# scripts/validate-azure-retirement.sh
#
# Validates that all Azure retirement hardening standards are met:
#   1. Storage TLS 1.2 — all az storage account create/update calls include --min-tls-version TLS1_2
#   2. Key Vault RBAC — no azurerm_key_vault_access_policy resources in active Terraform
#   3. Node.js 22 — no Node.js 20 runtime references in deployable files
#   4. PostgreSQL HA — no azurerm_postgresql_flexible_server without high_availability block
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#
# Usage:
#   bash scripts/validate-azure-retirement.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

red()    { printf "\033[0;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[0;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

fail() {
  red "  FAIL: $*"
  FAILURES=$((FAILURES + 1))
}

pass() {
  green "  PASS: $*"
}

echo ""
bold "=== Azure Retirement Hardening Validation ==="
echo ""

# ---------------------------------------------------------------------------
# CHECK 1: Storage TLS 1.2
# ---------------------------------------------------------------------------
bold "Check 1: Azure Storage — TLS 1.2 minimum"

# Find all shell scripts that create or update storage accounts
STORAGE_SCRIPTS=$(grep -rl "az storage account create\|az storage account update" \
  "$REPO_ROOT" \
  --include="*.sh" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  2>/dev/null || true)

if [[ -z "$STORAGE_SCRIPTS" ]]; then
  yellow "  SKIP: No shell scripts with 'az storage account create/update' found"
else
  while IFS= read -r script; do
    # Check that every 'az storage account create/update' block includes --min-tls-version TLS1_2
    # We look at the file as a whole rather than individual lines because flags can span lines
    if grep -q "az storage account create\|az storage account update" "$script"; then
      if grep -q "min-tls-version.*TLS1_2\|min_tls_version.*TLS1_2\|min_tls_version.*= .TLS1_2" "$script"; then
        pass "$script contains --min-tls-version TLS1_2"
      else
        fail "$script calls 'az storage account create/update' but does not set --min-tls-version TLS1_2"
      fi
    fi
  done <<< "$STORAGE_SCRIPTS"
fi

# Check Terraform files
TF_STORAGE_FILES=$(grep -rl "azurerm_storage_account" \
  "$REPO_ROOT/infrastructure" "$REPO_ROOT/infra" "$REPO_ROOT/database" \
  --include="*.tf" \
  2>/dev/null || true)

if [[ -n "$TF_STORAGE_FILES" ]]; then
  while IFS= read -r tffile; do
    if grep -q "resource.*azurerm_storage_account" "$tffile"; then
      if grep -q 'min_tls_version\s*=\s*"TLS1_2"' "$tffile"; then
        pass "$tffile: azurerm_storage_account sets min_tls_version = TLS1_2"
      else
        fail "$tffile: azurerm_storage_account does not set min_tls_version = \"TLS1_2\""
      fi
    fi
  done <<< "$TF_STORAGE_FILES"
fi

echo ""

# ---------------------------------------------------------------------------
# CHECK 2: Key Vault RBAC
# ---------------------------------------------------------------------------
bold "Check 2: Azure Key Vault — RBAC authorization (no legacy access policies)"

# Search for azurerm_key_vault_access_policy in active Terraform (not archive)
KV_POLICY_HITS=$(grep -rn "resource.*azurerm_key_vault_access_policy" \
  "$REPO_ROOT/infrastructure" "$REPO_ROOT/infra" "$REPO_ROOT/database" \
  --include="*.tf" \
  2>/dev/null || true)

if [[ -n "$KV_POLICY_HITS" ]]; then
  fail "Legacy azurerm_key_vault_access_policy found in active Terraform:"
  echo "$KV_POLICY_HITS" | while IFS= read -r line; do
    red "    $line"
  done
  yellow "  Replace with azurerm_role_assignment using 'Key Vault Secrets User' role."
else
  pass "No azurerm_key_vault_access_policy found in active Terraform"
fi

# Check that active Terraform for Key Vault uses RBAC
KV_RESOURCES=$(grep -rln "resource.*azurerm_key_vault\"" \
  "$REPO_ROOT/infrastructure" "$REPO_ROOT/infra" \
  --include="*.tf" \
  2>/dev/null || true)

if [[ -n "$KV_RESOURCES" ]]; then
  while IFS= read -r tffile; do
    if grep -q 'resource "azurerm_key_vault"' "$tffile"; then
      if grep -q "enable_rbac_authorization\s*=\s*true" "$tffile"; then
        pass "$tffile: azurerm_key_vault has enable_rbac_authorization = true"
      else
        fail "$tffile: azurerm_key_vault does not set enable_rbac_authorization = true"
      fi
    fi
  done <<< "$KV_RESOURCES"
fi

echo ""

# ---------------------------------------------------------------------------
# CHECK 3: Node.js 22
# ---------------------------------------------------------------------------
bold "Check 3: Node.js 22 — no Node.js 20 runtime references in deployable files"

# Patterns that indicate Node 20 in deployment-relevant context
NODE20_PATTERNS=(
  "node-version: '20'"
  "NODE_VERSION: 20"
  "NODE_VERSION: '20'"
  "node@20"
  'WEBSITE_NODE_DEFAULT_VERSION.*~20'
  'node_version.*=.*"20"'
  '"node".*">=20 <21"'
  '--runtime-version 20'
  'linux-fx-version.*Node|20'
  'linux-fx-version.*NODE|20'
)

# Files and dirs to check (excluding lock files, dist, archive, node_modules)
SEARCH_TARGETS=(
  ".nvmrc"
  "functions/package.json"
  "local.settings.json.example"
  "ci-local.sh"
  "deploy_y1_win_ne.sh"
  "clean_flex_rebuild.sh"
  "deploy-staging.sh"
  "heal_flex_and_probe.sh"
  "fix_ep1_runfrompackage.sh"
  "scripts/"
  "infrastructure/"
  "infra/"
  ".github/workflows/"
  ".github/copilot-instructions.md"
)

NODE20_FOUND=0
for target in "${SEARCH_TARGETS[@]}"; do
  full_path="$REPO_ROOT/$target"
  if [[ ! -e "$full_path" ]]; then
    continue
  fi
  for pattern in "${NODE20_PATTERNS[@]}"; do
    hits=$(grep -rn "$pattern" "$full_path" \
      --include="*.yml" --include="*.yaml" --include="*.json" \
      --include="*.tf" --include="*.sh" --include="*.md" --include=".nvmrc" \
      --exclude="*.lock" --exclude="package-lock.json" \
      --exclude="validate-azure-retirement.sh" \
      2>/dev/null \
      | grep -v "infrastructure/function-app/main.tf" \
      || true)
    if [[ -n "$hits" ]]; then
      fail "Node.js 20 reference found (pattern: '$pattern'):"
      echo "$hits" | while IFS= read -r line; do
        red "    $line"
      done
      NODE20_FOUND=1
    fi
  done
done

if [[ "$NODE20_FOUND" -eq 0 ]]; then
  pass "No Node.js 20 runtime references found in deployable files"
fi

echo ""

# ---------------------------------------------------------------------------
# CHECK 4: PostgreSQL HA
# ---------------------------------------------------------------------------
bold "Check 4: PostgreSQL HA — explicit high_availability block required"

# Search active Terraform for PostgreSQL Flexible Server without HA
PG_FILES=$(grep -rln "resource.*azurerm_postgresql_flexible_server" \
  "$REPO_ROOT/infrastructure" "$REPO_ROOT/infra" "$REPO_ROOT/database" \
  --include="*.tf" \
  2>/dev/null || true)

if [[ -z "$PG_FILES" ]]; then
  pass "No active azurerm_postgresql_flexible_server resources found (Cosmos DB is primary)"
else
  while IFS= read -r tffile; do
    if grep -q 'resource "azurerm_postgresql_flexible_server"' "$tffile"; then
      if grep -q "high_availability" "$tffile"; then
        pass "$tffile: azurerm_postgresql_flexible_server has high_availability block"
      elif grep -q "ha-posture:.*burstable-sku-ha-not-supported" "$tffile"; then
        pass "$tffile: azurerm_postgresql_flexible_server is Burstable SKU (HA not supported — explicitly documented)"
      else
        fail "$tffile: azurerm_postgresql_flexible_server missing high_availability block (required before 1 Sept 2026)."
        yellow "  If using Burstable SKU (B_Standard_*), add comment: # ha-posture: none (burstable-sku-ha-not-supported)"
      fi
    fi
  done <<< "$PG_FILES"
fi

echo ""

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------
bold "=== Summary ==="
if [[ "$FAILURES" -eq 0 ]]; then
  green "All retirement hardening checks passed."
  echo ""
  exit 0
else
  red "$FAILURES check(s) failed. See output above for details."
  echo ""
  yellow "Refer to docs/runbooks/azure-retirement-2026.md for remediation guidance."
  echo ""
  exit 1
fi
