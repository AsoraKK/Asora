#!/bin/bash
# Final validation script for Asora CI/CD refactoring

echo "🎯 ASORA CI/CD REFACTORING VALIDATION"
echo "===================================="
echo ""

echo "1️⃣ REPO SCAN RESULTS:"
echo "--------------------"
echo "Checking for staging/production job names..."
if git grep -E 'Deploy to Azure \(dev\)|\(staging\)|\(production\)' >/dev/null 2>&1; then
    echo "❌ FAIL: Found environment-specific job names"
    git grep -n -E 'Deploy to Azure \(dev\)|\(staging\)|\(production\)'
else
    echo "✅ PASS: No environment-specific job names found"
fi

echo ""
echo "2️⃣ WORKFLOW STRUCTURE:"
echo "----------------------"
if [ -f ".github/workflows/ci.yml" ]; then
    echo "✅ PASS: ci.yml exists"
    
    # Check jobs
    if grep -q "jobs:" .github/workflows/ci.yml && \
       grep -q "tests:" .github/workflows/ci.yml && \
       grep -q "functions_build:" .github/workflows/ci.yml && \
       grep -q "deploy_azure:" .github/workflows/ci.yml; then
        echo "✅ PASS: All required jobs present (tests, functions_build, deploy_azure)"
    else
        echo "❌ FAIL: Missing required jobs"
    fi
    
    # Check deploy job name
    if grep -q "name: Deploy to Azure" .github/workflows/ci.yml; then
        echo "✅ PASS: Deploy job has correct name 'Deploy to Azure'"
    else
        echo "❌ FAIL: Deploy job name incorrect"
    fi
    
    # Check targets
    if grep -q "AZURE_RESOURCE_GROUP: asora-psql-flex" .github/workflows/ci.yml && \
       grep -q "app-name: asora-function-dev" .github/workflows/ci.yml; then
        echo "✅ PASS: Correct Azure targets (asora-psql-flex / asora-function-dev)"
    else
        echo "❌ FAIL: Incorrect Azure targets"
    fi
    
    # Check for matrices
    if grep -q "matrix:" .github/workflows/ci.yml; then
        echo "❌ FAIL: Found matrix strategy (should be removed)"
    else
        echo "✅ PASS: No matrix strategies found"
    fi
else
    echo "❌ FAIL: ci.yml not found"
fi

echo ""
echo "3️⃣ AZURE TARGET VERIFICATION:"
echo "-----------------------------"
if command -v az >/dev/null 2>&1; then
    if az account show >/dev/null 2>&1; then
        echo "✅ PASS: Azure CLI logged in"
        
        echo "Checking function app existence..."
        if az functionapp show -n asora-function-dev -g asora-psql-flex >/dev/null 2>&1; then
            echo "✅ PASS: asora-function-dev exists in asora-psql-flex"
            
            echo "Checking runtime configuration..."
            RUNTIME=$(az functionapp config show -n asora-function-dev -g asora-psql-flex --query "linuxFxVersion" -o tsv 2>/dev/null)
            if [[ "$RUNTIME" == "NODE|20-lts" ]]; then
                echo "✅ PASS: Runtime is NODE|20-lts"
            else
                echo "⚠️  WARNING: Runtime is '$RUNTIME' (expected: NODE|20-lts)"
            fi
        else
            echo "❌ FAIL: asora-function-dev not found in asora-psql-flex"
        fi
    else
        echo "❌ FAIL: Not logged in to Azure CLI (run 'az login')"
    fi
else
    echo "❌ FAIL: Azure CLI not installed"
fi

echo ""
echo "4️⃣ WORKFLOW FILES CLEANUP:"
echo "--------------------------"
WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" -type f | wc -l)
echo "Found $WORKFLOW_COUNT workflow files:"
ls -la .github/workflows/

if [ "$WORKFLOW_COUNT" -eq 2 ]; then
    if [ -f ".github/workflows/ci.yml" ] && [ -f ".github/workflows/canary.yml" ]; then
        echo "✅ PASS: Only ci.yml and canary.yml remain"
    else
        echo "❌ FAIL: Unexpected workflow files"
    fi
else
    echo "❌ FAIL: Expected 2 workflow files, found $WORKFLOW_COUNT"
fi

echo ""
echo "🎯 VALIDATION SUMMARY:"
echo "====================="
echo "✅ = PASS, ❌ = FAIL, ⚠️ = WARNING"
echo ""
echo "Manual checks needed:"
echo "• GitHub Settings → Environments: Remove staging/production, keep dev"
echo "• GitHub Settings → Secrets: Verify AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID"
echo "• Azure Entra → App registration → Federated credentials: Verify repo:AsoraKK/Asora patterns"
echo ""
echo "Ready for CI test: Push a commit to main/develop to test the workflow!"
