#!/bin/bash
# Set Azure Function App environment variables for notifications
# Usage: ./set-function-app-env-vars.sh <function-app-name> <environment>
# Example: ./set-function-app-env-vars.sh asora-function-dev dev

set -e

FUNCTION_APP_NAME=${1}
ENVIRONMENT=${2:-dev}

if [ -z "$FUNCTION_APP_NAME" ]; then
  echo "ERROR: Function app name required"
  echo "Usage: $0 <function-app-name> <environment>"
  echo "Example: $0 asora-function-dev dev"
  exit 1
fi

echo "========================================"
echo "Set Function App Environment Variables"
echo "========================================"
echo "Function App: $FUNCTION_APP_NAME"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if logged in
az account show &>/dev/null || {
  echo "ERROR: Not logged in to Azure CLI"
  echo "Run: az login"
  exit 1
}

# Prompt for required variables
echo "Enter environment variables (press Enter to skip optional ones):"
echo ""

read -p "NOTIFICATION_HUB_CONNECTION_STRING (required): " HUB_CONN
if [ -z "$HUB_CONN" ]; then
  echo "ERROR: NOTIFICATION_HUB_CONNECTION_STRING is required"
  exit 1
fi

read -p "NOTIFICATION_HUB_NAME (required, e.g., asora-notifications-dev): " HUB_NAME
if [ -z "$HUB_NAME" ]; then
  echo "ERROR: NOTIFICATION_HUB_NAME is required"
  exit 1
fi

read -p "COSMOS_CONNECTION_STRING (required): " COSMOS_CONN
if [ -z "$COSMOS_CONN" ]; then
  echo "ERROR: COSMOS_CONNECTION_STRING is required"
  exit 1
fi

read -p "COSMOS_DATABASE_NAME (default: users): " COSMOS_DB
COSMOS_DB=${COSMOS_DB:-users}

echo ""
echo "Setting environment variables..."

az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$(az functionapp show --name "$FUNCTION_APP_NAME" --query resourceGroup -o tsv)" \
  --settings \
    NOTIFICATION_HUB_CONNECTION_STRING="$HUB_CONN" \
    NOTIFICATION_HUB_NAME="$HUB_NAME" \
    COSMOS_CONNECTION_STRING="$COSMOS_CONN" \
    COSMOS_DATABASE_NAME="$COSMOS_DB" \
    ENVIRONMENT="$ENVIRONMENT"

echo ""
echo "========================================"
echo "✅ SUCCESS: Environment Variables Set"
echo "========================================"
echo ""
echo "Verification:"
echo "Check function app logs for startup messages:"
echo "  [CONFIG] Environment: $ENVIRONMENT"
echo "  [CONFIG] Notification Hub: $HUB_NAME"
echo "  [CONFIG] Notifications Enabled: true"
echo ""
echo "Test health check:"
echo "  curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
echo ""
