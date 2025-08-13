#!/bin/bash

# Azure OIDC Configuration Validation Script
# This script validates that GitHub workflows are properly configured for Azure OIDC authentication

echo "🔍 Azure OIDC Configuration Validation"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WORKFLOW_DIR=".github/workflows"
ISSUES_FOUND=0

# Function to check workflow file
check_workflow() {
    local file=$1
    local filename=$(basename "$file")
    
    echo -e "\n📋 Checking: ${YELLOW}$filename${NC}"
    
    # Check if workflow uses Azure login
    if grep -q "azure/login" "$file"; then
        echo "  ✓ Uses azure/login action"
        
        # Check for proper OIDC permissions
        if grep -q "id-token: write" "$file"; then
            echo -e "  ${GREEN}✓${NC} Has 'id-token: write' permission"
        else
            echo -e "  ${RED}✗${NC} Missing 'id-token: write' permission"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
        
        # Check for azure/login@v2
        if grep -q "azure/login@v2" "$file"; then
            echo -e "  ${GREEN}✓${NC} Uses azure/login@v2"
        else
            echo -e "  ${YELLOW}!${NC} Uses older version of azure/login"
        fi
        
        # Check for client-secret (should NOT be present)
        if grep -q "client-secret" "$file"; then
            echo -e "  ${RED}✗${NC} Uses client-secret (should use OIDC instead)"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            echo -e "  ${GREEN}✓${NC} No client-secret found (good for OIDC)"
        fi
        
        # Check for required secrets
        if grep -q "AZURE_CLIENT_ID" "$file"; then
            echo -e "  ${GREEN}✓${NC} References AZURE_CLIENT_ID"
        else
            echo -e "  ${RED}✗${NC} Missing AZURE_CLIENT_ID reference"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
        
        if grep -q "AZURE_TENANT_ID" "$file"; then
            echo -e "  ${GREEN}✓${NC} References AZURE_TENANT_ID"
        else
            echo -e "  ${RED}✗${NC} Missing AZURE_TENANT_ID reference"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
        
        if grep -q "AZURE_SUBSCRIPTION_ID" "$file"; then
            echo -e "  ${GREEN}✓${NC} References AZURE_SUBSCRIPTION_ID"
        else
            echo -e "  ${RED}✗${NC} Missing AZURE_SUBSCRIPTION_ID reference"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
        
        # Check for verification step
        if grep -q "az account show" "$file"; then
            echo -e "  ${GREEN}✓${NC} Includes Azure authentication verification"
        else
            echo -e "  ${YELLOW}!${NC} Consider adding 'az account show' verification step"
        fi
        
    else
        echo -e "  ${YELLOW}-${NC} Does not use Azure authentication"
    fi
}

# Check if workflow directory exists
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo -e "${RED}✗${NC} Workflow directory not found: $WORKFLOW_DIR"
    exit 1
fi

# Check each workflow file
for workflow in "$WORKFLOW_DIR"/*.yml "$WORKFLOW_DIR"/*.yaml; do
    if [ -f "$workflow" ]; then
        check_workflow "$workflow"
    fi
done

# Summary
echo -e "\n🎯 Validation Summary"
echo "===================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ All Azure OIDC configurations are correct!${NC}"
    echo ""
    echo "Your workflows are properly configured with:"
    echo "• OIDC permissions (id-token: write)"
    echo "• No client secrets (secure)"
    echo "• Proper Azure secret references"
    echo "• Latest azure/login@v2 action"
else
    echo -e "${RED}❌ Found $ISSUES_FOUND configuration issues${NC}"
    echo ""
    echo "Please review the issues above and:"
    echo "1. Add missing permissions or secret references"
    echo "2. Remove any client-secret configurations"
    echo "3. Ensure azure/login@v2 is used"
fi

# GitHub Secrets Checklist
echo -e "\n📋 GitHub Secrets Checklist"
echo "==========================="
echo "Ensure these secrets are configured in your GitHub repository:"
echo "Settings > Secrets and Variables > Actions"
echo ""
echo "Required secrets:"
echo "• AZURE_CLIENT_ID      (Service Principal Application ID)"
echo "• AZURE_TENANT_ID      (Azure AD Tenant ID)"  
echo "• AZURE_SUBSCRIPTION_ID (Azure Subscription ID)"
echo ""
echo "❌ Should NOT be present:"
echo "• AZURE_CLIENT_SECRET  (not needed for OIDC)"

exit $ISSUES_FOUND
