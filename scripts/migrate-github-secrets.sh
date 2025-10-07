#!/usr/bin/env bash
#
# GitHub Secrets OIDC Migration Script
# Manages GitHub secrets for OIDC authentication
#
# Prerequisites: GitHub CLI (gh) must be installed and authenticated
#
# Usage: bash scripts/migrate-github-secrets.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AZURE_CLIENT_ID="06c8564f-030d-414f-a552-678d756f9ec3"
AZURE_TENANT_ID="275643fa-37e0-4f67-b616-85a7da674bea"
AZURE_SUBSCRIPTION_ID="99df7ef7-776a-4235-84a4-c77899b2bb04"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   GitHub Secrets OIDC Migration                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}✗ GitHub CLI (gh) is not installed${NC}"
  echo "  Install from: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo -e "${RED}✗ GitHub CLI is not authenticated${NC}"
  echo "  Run: gh auth login"
  exit 1
fi

echo -e "${GREEN}✓ GitHub CLI is installed and authenticated${NC}"
echo ""

# Step 1: List current secrets
echo -e "${YELLOW}[1/4] Current GitHub secrets:${NC}"
gh secret list
echo ""

# Step 2: Set OIDC secrets
echo -e "${YELLOW}[2/4] Setting OIDC secrets...${NC}"

echo "  Setting AZURE_CLIENT_ID..."
if echo "$AZURE_CLIENT_ID" | gh secret set AZURE_CLIENT_ID; then
  echo -e "    ${GREEN}✓${NC} Set AZURE_CLIENT_ID"
else
  echo -e "    ${RED}✗${NC} Failed to set AZURE_CLIENT_ID"
fi

echo "  Setting AZURE_TENANT_ID..."
if echo "$AZURE_TENANT_ID" | gh secret set AZURE_TENANT_ID; then
  echo -e "    ${GREEN}✓${NC} Set AZURE_TENANT_ID"
else
  echo -e "    ${RED}✗${NC} Failed to set AZURE_TENANT_ID"
fi

echo "  Setting AZURE_SUBSCRIPTION_ID..."
if echo "$AZURE_SUBSCRIPTION_ID" | gh secret set AZURE_SUBSCRIPTION_ID; then
  echo -e "    ${GREEN}✓${NC} Set AZURE_SUBSCRIPTION_ID"
else
  echo -e "    ${RED}✗${NC} Failed to set AZURE_SUBSCRIPTION_ID"
fi
echo ""

# Step 3: Delete legacy secrets
echo -e "${YELLOW}[3/4] Deleting legacy secrets...${NC}"

echo "  Deleting AZURE_CLIENT_SECRET (if exists)..."
if gh secret delete AZURE_CLIENT_SECRET 2>/dev/null; then
  echo -e "    ${GREEN}✓${NC} Deleted AZURE_CLIENT_SECRET"
else
  echo -e "    ${YELLOW}⚠${NC} AZURE_CLIENT_SECRET not found (already deleted or never existed)"
fi

echo "  Deleting AZURE_CREDENTIALS (if exists)..."
if gh secret delete AZURE_CREDENTIALS 2>/dev/null; then
  echo -e "    ${GREEN}✓${NC} Deleted AZURE_CREDENTIALS"
else
  echo -e "    ${YELLOW}⚠${NC} AZURE_CREDENTIALS not found (already deleted or never existed)"
fi
echo ""

# Step 4: Verify final state
echo -e "${YELLOW}[4/4] Final GitHub secrets:${NC}"
gh secret list
echo ""

# Check for required secrets
REQUIRED_SECRETS=(
  "AZURE_CLIENT_ID"
  "AZURE_TENANT_ID"
  "AZURE_SUBSCRIPTION_ID"
)

echo -e "${YELLOW}Verification:${NC}"
for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list | grep -q "^$SECRET"; then
    echo -e "  ${GREEN}✓${NC} $SECRET is set"
  else
    echo -e "  ${RED}✗${NC} $SECRET is missing"
  fi
done

# Check that legacy secrets are gone
LEGACY_SECRETS=(
  "AZURE_CLIENT_SECRET"
  "AZURE_CREDENTIALS"
)

echo ""
echo -e "${YELLOW}Legacy secret check:${NC}"
for SECRET in "${LEGACY_SECRETS[@]}"; do
  if gh secret list | grep -q "^$SECRET"; then
    echo -e "  ${RED}✗${NC} $SECRET still exists (should be deleted)"
  else
    echo -e "  ${GREEN}✓${NC} $SECRET is not present (good!)"
  fi
done
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   GitHub Secrets Migration Complete                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test a deployment workflow"
echo "2. Monitor the workflow run for OIDC authentication"
echo "3. Verify the 'Block legacy SP secrets' step passes"
echo ""
echo -e "${YELLOW}To trigger a test deployment:${NC}"
echo "  gh workflow run \"Deploy Functions (Flex)\" --ref main"
echo ""
echo -e "${YELLOW}To monitor the workflow:${NC}"
echo "  gh run watch"
echo ""
