#!/bin/bash

# Script to remove invalid Flex app settings and keep only what Flex supports
# Azure Functions Flex Plan has specific requirements for app settings

APP_NAME="asora-function-dev"
RESOURCE_GROUP="asora-psql-flex"

echo "Fixing Azure Functions Flex app settings for $APP_NAME..."

# Remove invalid settings for Flex plan
echo "Removing FUNCTIONS_WORKER_RUNTIME (not supported in Flex)..."
az functionapp config appsettings delete \
  -g "$RESOURCE_GROUP" \
  -n "$APP_NAME" \
  --setting-names FUNCTIONS_WORKER_RUNTIME

# Set required settings for Flex plan
echo "Setting FUNCTIONS_EXTENSION_VERSION to ~4..."
az functionapp config appsettings set \
  -g "$RESOURCE_GROUP" \
  -n "$APP_NAME" \
  --settings FUNCTIONS_EXTENSION_VERSION="~4"

echo "Flex app settings configuration complete!"

# Optional: Show current app settings to verify
echo "Current app settings:"
az functionapp config appsettings list \
  -g "$RESOURCE_GROUP" \
  -n "$APP_NAME" \
  --output table
