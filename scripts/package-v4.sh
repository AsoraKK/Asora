#!/usr/bin/env bash
# Azure Functions v4 Packaging Script (Linux/macOS)
# Creates production-ready zip with correct root layout (no emojis)

set -euo pipefail

echo "Azure Functions v4 packaging started"

# If invoked from repo root, descend into functions/
if [[ -f "functions/host.json" && ! -f "host.json" ]]; then
  cd functions
fi

echo "Cleaning previous artifacts..."
rm -rf dist deploy dist-v4-final.zip

echo "Installing dependencies (with dev for build)..."
npm ci

echo "Building TypeScript..."
npm run build

echo "Creating deployment staging..."
mkdir -p deploy

echo "Copying configuration files..."
cp dist/host.json dist/package.json deploy/

echo "Preparing runtime entrypoint..."
cp dist/index.js deploy/index.js

echo "Copying compiled source..."
mkdir -p deploy/src
cp -R dist/src/. deploy/src/

echo "Copying production node_modules..."
cp -R dist/node_modules deploy/node_modules

echo "Creating deployment zip..."
(
  cd deploy
  zip -r ../dist-v4-final.zip . -x "*.DS_Store" "*.git*" "Thumbs.db"
)

ZIP=dist-v4-final.zip bash ../.github/scripts/preflight.sh

echo "Zip contents (top 20):"
unzip -l dist-v4-final.zip | head -20

echo "Package complete: dist-v4-final.zip ($(du -h dist-v4-final.zip | cut -f1))"
echo "Ready for: az functionapp deployment source config-zip"
