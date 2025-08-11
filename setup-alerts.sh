#!/bin/bash
# Application Insights Alerts Setup
# Creates monitoring alerts for error rate and p95 latency

set -e

# Configuration
RG="${AZURE_RESOURCE_GROUP:-asora-psql-flex}"
APP="${AZURE_FUNCTIONAPP_NAME:-asora-function-dev}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚨 Setting up Application Insights Alerts${NC}"
echo "=============================================="

# Get Application Insights resource
AI_RESOURCE=$(az functionapp show -g "$RG" -n "$APP" --query "siteConfig.appSettings[?name=='APPLICATIONINSIGHTS_CONNECTION_STRING'].value" -o tsv)
if [ -z "$AI_RESOURCE" ]; then
    echo -e "${RED}❌ Application Insights not configured for Function App${NC}"
    exit 1
fi

# Extract Application Insights resource ID from connection string
AI_INSTRUMENTATION_KEY=$(echo "$AI_RESOURCE" | sed -n 's/.*InstrumentationKey=\([^;]*\).*/\1/p')
AI_RESOURCE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Insights/components/$APP-insights"

echo -e "${GREEN}✅ Found Application Insights: $AI_INSTRUMENTATION_KEY${NC}"

## **Alert 1: Error Rate > 1% over 10 minutes**
echo -e "${YELLOW}Creating error rate alert...${NC}"

az monitor metrics alert create \
    --name "${APP}-error-rate-alert" \
    --resource-group "$RG" \
    --scopes "$AI_RESOURCE_ID" \
    --condition "count 'requests/failed' > 0.01 * count 'requests/count'" \
    --window-size 10m \
    --evaluation-frequency 5m \
    --severity 2 \
    --description "Function App error rate exceeds 1% over 10 minutes" \
    --action-group-ids ""

echo -e "${GREEN}✅ Error rate alert created${NC}"

## **Alert 2: P95 Latency > 200ms over 10 minutes**
echo -e "${YELLOW}Creating latency alert...${NC}"

az monitor metrics alert create \
    --name "${APP}-latency-alert" \
    --resource-group "$RG" \
    --scopes "$AI_RESOURCE_ID" \
    --condition "percentile95 'requests/duration' > 200" \
    --window-size 10m \
    --evaluation-frequency 5m \
    --severity 2 \
    --description "Function App p95 latency exceeds 200ms over 10 minutes" \
    --action-group-ids ""

echo -e "${GREEN}✅ Latency alert created${NC}"

echo -e "${BLUE}🎯 Monitoring Alerts Summary${NC}"
echo "=============================================="
echo -e "${YELLOW}Error Rate Alert:${NC} Triggers when >1% of requests fail over 10 minutes"
echo -e "${YELLOW}Latency Alert:${NC} Triggers when p95 response time >200ms over 10 minutes"
echo ""
echo -e "${BLUE}📧 To add email notifications:${NC}"
echo "1. Create an Action Group in Azure Portal"
echo "2. Update alerts to reference the Action Group ID"
echo ""
echo -e "${GREEN}🎉 Application Insights alerts configured!${NC}"
