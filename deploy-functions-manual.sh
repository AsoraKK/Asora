#!/bin/bash
# Manual Azure Functions Deployment Script
# This script provides a deterministic way to deploy Azure Functions when automated CI/CD fails

set -e  # Exit on any error

# Configuration (update these values as needed)
FUNCTION_APP_NAME="${AZURE_FUNCTIONAPP_NAME:-asora-function-dev}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-asora-psql-flex}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Manual Azure Functions Deployment${NC}"
echo "=================================================="

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Azure Functions Core Tools is installed
if ! command -v func &> /dev/null; then
    echo -e "${YELLOW}⚠️ Azure Functions Core Tools not found. Installing exact version...${NC}"
    npm i -g azure-functions-core-tools@4.0.5455 --unsafe-perm true
else
    FUNC_VERSION=$(func --version)
    if [ "$FUNC_VERSION" != "4.0.5455" ]; then
        echo -e "${YELLOW}⚠️ Azure Functions Core Tools version mismatch. Installing exact version...${NC}"
        npm i -g azure-functions-core-tools@4.0.5455 --unsafe-perm true
    fi
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please log in...${NC}"
    az login
fi

# Set subscription if provided
if [ ! -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${BLUE}Setting subscription: $SUBSCRIPTION_ID${NC}"
    az account set --subscription "$SUBSCRIPTION_ID"
fi

echo -e "${GREEN}✅ Prerequisites check complete${NC}"

# Verify function app exists
echo -e "${YELLOW}Verifying Function App exists...${NC}"
if ! az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${RED}❌ Function App '$FUNCTION_APP_NAME' not found in resource group '$RESOURCE_GROUP'${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Function App verified${NC}"

# Set explicit runtime configuration (one-time hardening)
echo -e "${YELLOW}Setting Node.js runtime configuration...${NC}"
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings FUNCTIONS_EXTENSION_VERSION=~4 \
              FUNCTIONS_WORKER_RUNTIME=node \
              WEBSITE_NODE_DEFAULT_VERSION=~20 \
              WEBSITE_RUN_FROM_PACKAGE=1

echo -e "${YELLOW}Setting Function App runtime stack...${NC}"
az functionapp config set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --linux-fx-version "NODE|20"

echo -e "${GREEN}✅ Runtime configuration set${NC}

# Verify runtime configuration
echo -e "${YELLOW}Verifying runtime configuration...${NC}"
az functionapp config appsettings list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    | jq -e '.[] | select(.name=="FUNCTIONS_WORKER_RUNTIME" and .value=="node")' >/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ FUNCTIONS_WORKER_RUNTIME correctly set to 'node'${NC}"
else
    echo -e "${RED}❌ FUNCTIONS_WORKER_RUNTIME verification failed${NC}"
    exit 1
fi

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
cd functions
npm ci
npm run build
echo -e "${GREEN}✅ TypeScript compilation completed${NC}"

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
func pack --javascript --output dist.zip
echo -e "${GREEN}✅ Deployment package ready: dist.zip${NC}"

# Deploy to Azure
echo -e "${YELLOW}Deploying to Azure Function App...${NC}"
az functionapp deployment source config-zip \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --src dist.zip

cd ..

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 15

FUNCTION_URL=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "defaultHostName" -o tsv)

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo "=================================================="
echo -e "${BLUE}Function App URL: https://$FUNCTION_URL${NC}"
echo -e "${BLUE}Function App Name: $FUNCTION_APP_NAME${NC}"
echo -e "${BLUE}Resource Group: $RESOURCE_GROUP${NC}"

# List deployed functions
echo -e "${YELLOW}Deployed functions:${NC}"
az functionapp function list \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "[].{Name:name, Trigger:config.bindings[0].type}" -o table

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
cd functions
rm -f dist.zip

echo -e "${GREEN}🎉 Manual deployment completed successfully!${NC}"
