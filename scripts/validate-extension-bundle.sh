#!/usr/bin/env bash
# Validate Azure Functions extension bundle is v4 [4.*, 5.0.0)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Validating Azure Functions extension bundle version..."

# Check host.json
HOST_JSON="$REPO_ROOT/host.json"

if [[ ! -f "$HOST_JSON" ]]; then
    echo "❌ host.json not found at $HOST_JSON"
    exit 1
fi

# Extract bundle version using jq or grep
if command -v jq &> /dev/null; then
    BUNDLE_VERSION=$(jq -r '.extensionBundle.version' "$HOST_JSON")
else
    # Fallback to grep/sed if jq not available
    BUNDLE_VERSION=$(grep -A 2 '"extensionBundle"' "$HOST_JSON" | grep '"version"' | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/')
fi

echo "📦 Found extension bundle version: $BUNDLE_VERSION"

# Validate it matches the v4 pattern [4.*, 5.0.0)
if [[ "$BUNDLE_VERSION" == "[4.*, 5.0.0)" ]]; then
    echo "✅ Extension bundle version is correct: $BUNDLE_VERSION"
else
    echo "❌ Extension bundle version must be [4.*, 5.0.0), found: $BUNDLE_VERSION"
    echo "   Update host.json to use Microsoft-recommended v4 bundle range."
    exit 1
fi

# Check Azure Function App settings if az CLI is available and logged in
if command -v az &> /dev/null && az account show &> /dev/null 2>&1; then
    echo ""
    echo "🔍 Checking Azure Function App settings..."
    
    FUNC_APP="${FUNC_APP:-asora-function-dev}"
    RG="${RG:-asora-psql-flex}"
    
    echo "   App: $FUNC_APP"
    echo "   Resource Group: $RG"
    
    # Get FUNCTIONS_EXTENSION_VERSION
    EXT_VERSION=$(az functionapp config appsettings list \
        --name "$FUNC_APP" \
        --resource-group "$RG" \
        --query "[?name=='FUNCTIONS_EXTENSION_VERSION'].value | [0]" \
        --output tsv 2>/dev/null || echo "")
    
    if [[ "$EXT_VERSION" == "~4" ]]; then
        echo "   ✅ FUNCTIONS_EXTENSION_VERSION: $EXT_VERSION"
    else
        echo "   ⚠️  FUNCTIONS_EXTENSION_VERSION: ${EXT_VERSION:-NOT SET} (expected: ~4)"
    fi
    
    # Verify FUNCTIONS_WORKER_RUNTIME is NOT set (Flex Consumption requirement)
    WORKER_RUNTIME=$(az functionapp config appsettings list \
        --name "$FUNC_APP" \
        --resource-group "$RG" \
        --query "[?name=='FUNCTIONS_WORKER_RUNTIME'].value | [0]" \
        --output tsv 2>/dev/null || echo "")
    
    if [[ -z "$WORKER_RUNTIME" ]]; then
        echo "   ✅ FUNCTIONS_WORKER_RUNTIME: not set (correct for Flex)"
    else
        echo "   ⚠️  FUNCTIONS_WORKER_RUNTIME: $WORKER_RUNTIME (should NOT be set for Flex apps)"
    fi
else
    echo ""
    echo "ℹ️  Azure CLI not available or not logged in - skipping app settings check"
fi

echo ""
echo "✅ Validation complete"
