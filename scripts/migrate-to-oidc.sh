#!/usr/bin/env bash
#
# Azure OIDC Migration Script
# Automates the Azure CLI portion of the OIDC migration
#
# Usage: bash scripts/migrate-to-oidc.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TENANT_ID="275643fa-37e0-4f67-b616-85a7da674bea"
SUBSCRIPTION_ID="99df7ef7-776a-4235-84a4-c77899b2bb04"
APP_ID="06c8564f-030d-414f-a552-678d756f9ec3"
LEGACY_SP_NAME="github-actions-asora-deployer"
RESOURCE_GROUP="asora-psql-flex"
FUNCTION_APP="asora-function-dev"
KEY_VAULT="kv-asora-dev"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Azure OIDC Migration for GitHub Actions             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Login and set subscription
echo -e "${YELLOW}[1/6] Logging in to Azure and setting subscription...${NC}"
az login --tenant "$TENANT_ID" 2>/dev/null || echo "Already logged in"
az account set --subscription "$SUBSCRIPTION_ID"
az account show -o table
echo ""

# Step 2: Create federated credentials
echo -e "${YELLOW}[2/6] Creating federated credentials...${NC}"

SUBJECTS=(
  "repo:AsoraKK/Asora:ref:refs/heads/main"
  "repo:AsoraKK/Asora:environment:dev"
)

for SUBJECT in "${SUBJECTS[@]}"; do
  CRED_NAME="gha-oidc-${SUBJECT//[:\/]/-}"
  echo "  Creating credential: $CRED_NAME"
  
  if az ad app federated-credential create --id "$APP_ID" --parameters '{
    "name": "'"$CRED_NAME"'",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "'"$SUBJECT"'",
    "audiences": ["api://AzureADTokenExchange"]
  }' 2>/dev/null; then
    echo -e "    ${GREEN}✓${NC} Created federated credential: $CRED_NAME"
  else
    echo -e "    ${YELLOW}⚠${NC} Credential already exists or error occurred: $CRED_NAME"
  fi
done
echo ""

# Step 3: List existing client secrets
echo -e "${YELLOW}[3/6] Listing existing client secrets...${NC}"
SECRETS=$(az ad app credential list --id "$APP_ID" --query "[?keyId!=null].{keyId:keyId, displayName:displayName, endDateTime:endDateTime}" -o tsv)

if [ -z "$SECRETS" ]; then
  echo -e "  ${GREEN}✓${NC} No client secrets found (good!)"
else
  echo -e "  ${RED}⚠${NC} Found existing client secrets:"
  echo "$SECRETS" | while read -r line; do
    echo "    $line"
  done
  
  echo ""
  read -p "Do you want to delete these secrets? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$SECRETS" | while IFS=$'\t' read -r keyId displayName endDateTime; do
      echo "  Deleting secret: $displayName ($keyId)"
      if az ad app credential delete --id "$APP_ID" --key-id "$keyId" 2>/dev/null; then
        echo -e "    ${GREEN}✓${NC} Deleted"
      else
        echo -e "    ${RED}✗${NC} Failed to delete"
      fi
    done
  else
    echo -e "  ${YELLOW}⚠${NC} Skipping secret deletion"
  fi
fi
echo ""

# Step 4: Remove legacy SP role assignments
echo -e "${YELLOW}[4/6] Removing legacy Service Principal role assignments...${NC}"

# Function App
echo "  Removing Function App access..."
if az role assignment delete --assignee "$LEGACY_SP_NAME" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP" 2>/dev/null; then
  echo -e "    ${GREEN}✓${NC} Removed Function App role assignment"
else
  echo -e "    ${YELLOW}⚠${NC} No Function App role assignment found or already removed"
fi

# Key Vault
echo "  Removing Key Vault access..."
if az role assignment delete --assignee "$LEGACY_SP_NAME" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT" 2>/dev/null; then
  echo -e "    ${GREEN}✓${NC} Removed Key Vault role assignment"
else
  echo -e "    ${YELLOW}⚠${NC} No Key Vault role assignment found or already removed"
fi
echo ""

# Step 5: Verify federated credentials
echo -e "${YELLOW}[5/6] Verifying federated credentials...${NC}"
CREDS=$(az ad app federated-credential list --id "$APP_ID" --query "[].{name:name, subject:subject}" -o table)
echo "$CREDS"

# Check for expected subjects
for SUBJECT in "${SUBJECTS[@]}"; do
  if echo "$CREDS" | grep -q "$SUBJECT"; then
    echo -e "  ${GREEN}✓${NC} Found: $SUBJECT"
  else
    echo -e "  ${RED}✗${NC} Missing: $SUBJECT"
  fi
done
echo ""

# Step 6: Verify role assignments for the Entra app
echo -e "${YELLOW}[6/6] Verifying Entra app role assignments...${NC}"
ROLES=$(az role assignment list --assignee "$APP_ID" --query "[].{role:roleDefinitionName, scope:scope}" -o table)
echo "$ROLES"

if echo "$ROLES" | grep -q "Website Contributor"; then
  echo -e "  ${GREEN}✓${NC} Has Website Contributor role"
else
  echo -e "  ${RED}✗${NC} Missing Website Contributor role"
fi

if echo "$ROLES" | grep -q "Key Vault"; then
  echo -e "  ${GREEN}✓${NC} Has Key Vault access"
else
  echo -e "  ${YELLOW}⚠${NC} May be missing Key Vault access"
fi
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Azure CLI Migration Complete                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Set GitHub secrets (see AZURE_OIDC_MIGRATION_GUIDE.md Step 6)"
echo "2. Delete legacy GitHub secrets (Step 7)"
echo "3. Test a deployment workflow"
echo ""
echo -e "${YELLOW}To set GitHub secrets, run:${NC}"
echo "  gh secret set AZURE_CLIENT_ID --body \"$APP_ID\""
echo "  gh secret set AZURE_TENANT_ID --body \"$TENANT_ID\""
echo "  gh secret set AZURE_SUBSCRIPTION_ID --body \"$SUBSCRIPTION_ID\""
echo "  gh secret delete AZURE_CLIENT_SECRET || true"
echo "  gh secret delete AZURE_CREDENTIALS || true"
echo ""
