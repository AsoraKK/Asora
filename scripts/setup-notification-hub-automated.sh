#!/bin/bash
# Azure Notification Hub - Automated Setup Script
# This script automates Steps 2, 4, and 5 (Step 3 requires Azure Portal for FCM config)

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="asora-psql-flex"
LOCATION="northeurope"
NAMESPACE_NAME="asora-ns-dev"
HUB_NAME="asora-dev-hub"
FUNCTION_APP="asora-function-dev"

echo -e "${GREEN}=== Azure Notification Hub Automated Setup ===${NC}"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Namespace: $NAMESPACE_NAME"
echo "Hub Name: $HUB_NAME"
echo "Function App: $FUNCTION_APP"
echo ""

# Step 1: Check Azure CLI login
echo -e "${YELLOW}[1/6] Checking Azure CLI login...${NC}"
if ! az account show &>/dev/null; then
    echo -e "${RED}ERROR: Not logged in to Azure CLI${NC}"
    echo "Please run: az login"
    exit 1
fi
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Logged in to: $SUBSCRIPTION${NC}"
echo ""

# Step 2: Create Notification Hub Namespace
echo -e "${YELLOW}[2/6] Creating Notification Hub Namespace...${NC}"
if az notification-hub namespace show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$NAMESPACE_NAME" &>/dev/null; then
    echo -e "${GREEN}✓ Namespace already exists${NC}"
else
    az notification-hub namespace create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$NAMESPACE_NAME" \
        --location "$LOCATION" \
        --sku Standard
    echo -e "${GREEN}✓ Namespace created${NC}"
fi
echo ""

# Step 3: Create Notification Hub
echo -e "${YELLOW}[3/6] Creating Notification Hub...${NC}"
if az notification-hub show \
    --resource-group "$RESOURCE_GROUP" \
    --namespace-name "$NAMESPACE_NAME" \
    --name "$HUB_NAME" &>/dev/null; then
    echo -e "${GREEN}✓ Notification Hub already exists${NC}"
else
    az notification-hub create \
        --resource-group "$RESOURCE_GROUP" \
        --namespace-name "$NAMESPACE_NAME" \
        --name "$HUB_NAME" \
        --location "$LOCATION"
    echo -e "${GREEN}✓ Notification Hub created${NC}"
fi
echo ""

# Step 4: Get Connection String
echo -e "${YELLOW}[4/6] Retrieving Notification Hub connection string...${NC}"
CONNECTION_STRING=$(az notification-hub authorization-rule list-keys \
    --resource-group "$RESOURCE_GROUP" \
    --namespace-name "$NAMESPACE_NAME" \
    --notification-hub-name "$HUB_NAME" \
    --name DefaultFullSharedAccessSignature \
    --query primaryConnectionString -o tsv)

if [ -z "$CONNECTION_STRING" ]; then
    echo -e "${RED}ERROR: Failed to retrieve connection string${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connection string retrieved${NC}"
echo ""
echo -e "${YELLOW}Connection String (save this):${NC}"
echo "$CONNECTION_STRING"
echo ""

# Step 5: Update Function App Settings
echo -e "${YELLOW}[5/6] Updating Function App environment variables...${NC}"
az functionapp config appsettings set \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        NOTIFICATION_HUB_NAME="$HUB_NAME" \
        NOTIFICATION_HUB_CONNECTION_STRING="$CONNECTION_STRING" \
    --output none

echo -e "${GREEN}✓ Function App settings updated${NC}"
echo ""

# Step 6: Restart Function App
echo -e "${YELLOW}[6/6] Restarting Function App...${NC}"
az functionapp restart \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --output none

echo -e "${GREEN}✓ Function App restarted${NC}"
echo ""
echo "Waiting 30 seconds for Function App to start..."
sleep 30

# Final verification
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Manual Step Required${NC}"
echo ""
echo "You must now configure FCM v1 credentials in Azure Portal:"
echo ""
echo "1. Go to: https://portal.azure.com"
echo "2. Navigate: Notification Hubs → $HUB_NAME"
echo "3. Settings → Google (FCM v1)"
echo "4. Paste the following values:"
echo ""
echo "   Project ID: asora-dev"
echo "   Client Email: asora-fcm-notifications@asora-dev.iam.gserviceaccount.com"
echo "   Private Key: (run below command to view)"
echo ""
echo "   jq -r '.private_key' ~/asora/secrets/fcm-dev.json"
echo ""
echo "5. Click Save"
echo ""
echo -e "${YELLOW}After configuring FCM v1, test the health endpoint:${NC}"
echo ""
echo "   curl https://$FUNCTION_APP.azurewebsites.net/api/health"
echo ""
echo -e "${GREEN}Expected: HTTP 200 with notification hub status${NC}"
echo ""

# Save connection string to temp file for reference
echo "$CONNECTION_STRING" > ~/asora/secrets/notification-hub-connection-string.txt
chmod 600 ~/asora/secrets/notification-hub-connection-string.txt
echo -e "${YELLOW}Connection string saved to: ~/asora/secrets/notification-hub-connection-string.txt${NC}"
echo ""
