#!/bin/bash
# Setup Azure Notification Hub for Asora notifications
# Usage: ./setup-azure-notification-hub.sh <environment> <resource-group> <location>
# Example: ./setup-azure-notification-hub.sh dev rg-asora-dev eastus

set -e

ENVIRONMENT=${1:-dev}
RESOURCE_GROUP=${2:-rg-asora-$ENVIRONMENT}
LOCATION=${3:-eastus}

NAMESPACE_NAME="asora-notif-ns-${ENVIRONMENT}"
HUB_NAME="asora-notifications-${ENVIRONMENT}"

echo "========================================"
echo "Azure Notification Hub Setup"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Namespace: $NAMESPACE_NAME"
echo "Hub Name: $HUB_NAME"
echo ""

# Check if logged in
echo "Checking Azure CLI login status..."
az account show &>/dev/null || {
  echo "ERROR: Not logged in to Azure CLI"
  echo "Run: az login"
  exit 1
}

# Check if resource group exists
echo "Checking if resource group exists..."
az group show --name "$RESOURCE_GROUP" &>/dev/null || {
  echo "ERROR: Resource group $RESOURCE_GROUP does not exist"
  echo "Create it first: az group create --name $RESOURCE_GROUP --location $LOCATION"
  exit 1
}

# Create Notification Hubs namespace (Standard tier for push notifications)
echo ""
echo "Creating Notification Hubs namespace..."
az notification-hub namespace create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$NAMESPACE_NAME" \
  --location "$LOCATION" \
  --sku Standard \
  || {
    echo "WARNING: Namespace might already exist, continuing..."
  }

# Create Notification Hub
echo ""
echo "Creating Notification Hub..."
az notification-hub create \
  --resource-group "$RESOURCE_GROUP" \
  --namespace-name "$NAMESPACE_NAME" \
  --name "$HUB_NAME" \
  --location "$LOCATION" \
  || {
    echo "WARNING: Hub might already exist, continuing..."
  }

# Get connection string
echo ""
echo "Retrieving connection string..."
CONNECTION_STRING=$(az notification-hub authorization-rule list-keys \
  --resource-group "$RESOURCE_GROUP" \
  --namespace-name "$NAMESPACE_NAME" \
  --notification-hub-name "$HUB_NAME" \
  --name DefaultFullSharedAccessSignature \
  --query primaryConnectionString \
  --output tsv)

echo ""
echo "========================================"
echo "✅ SUCCESS: Notification Hub Created"
echo "========================================"
echo ""
echo "Hub Details:"
echo "  Namespace: $NAMESPACE_NAME"
echo "  Hub Name: $HUB_NAME"
echo "  Resource Group: $RESOURCE_GROUP"
echo ""
echo "Connection String (SAVE THIS SECURELY):"
echo "$CONNECTION_STRING"
echo ""
echo "Next Steps:"
echo "1. Configure FCM V1 credentials:"
echo "   - Firebase Console → Project Settings → Service Accounts"
echo "   - Generate new private key (JSON)"
echo "   - Azure Portal → Notification Hub → Settings → Google (FCM V1)"
echo "   - Upload service account JSON"
echo ""
echo "2. Configure APNS credentials (for iOS):"
echo "   - Apple Developer → Certificates, IDs & Profiles"
echo "   - Create APNs key or certificate"
echo "   - Azure Portal → Notification Hub → Settings → Apple (APNS)"
echo "   - Upload key/certificate"
echo ""
echo "3. Set Function App environment variables:"
echo "   az functionapp config appsettings set \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --name <function-app-name> \\"
echo "     --settings \\"
echo "       NOTIFICATION_HUB_CONNECTION_STRING=\"\$CONNECTION_STRING\" \\"
echo "       NOTIFICATION_HUB_NAME=\"$HUB_NAME\""
echo ""
