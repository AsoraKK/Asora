#!/bin/bash
set -euo pipefail

# Test: Try restarting the function app to trigger package extraction
echo "Restarting asora-function-dev to trigger package extraction..."
az functionapp restart -g asora-psql-flex -n asora-function-dev

echo "Waiting 45s for app to restart and extract package..."
sleep 45

echo "Checking function discovery..."
az functionapp function list -g asora-psql-flex -n asora-function-dev -o table

echo "Testing health endpoint..."
curl -v https://asora-function-dev.azurewebsites.net/api/health
