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

echo "Pruning dev dependencies for production..."
npm prune --omit=dev

echo "Creating deployment staging..."
mkdir -p deploy

echo "Copying configuration files..."
cp host.json package.json deploy/

echo "Preparing runtime entrypoint..."
# Use runtime-index.js if present; copy as index.js expected by Functions host
if [[ -f "runtime-index.js" ]]; then
  cp runtime-index.js deploy/index.js
else
  # Fallback: create an index.js that prefers ./src then ./dist/src
  cat > deploy/index.js <<'EOF'
// Azure Functions Node v4 isolated entrypoint
try {
  module.exports = require('./src/index.js');
} catch (e) {
  module.exports = require('./dist/src/index.js');
}
EOF
fi

echo "Copying compiled source..."
mkdir -p deploy/src
cp -R dist/src/. deploy/src/

echo "Copying production node_modules..."
cp -R node_modules deploy/node_modules

echo "Creating deployment zip..."
(
  cd deploy
  zip -r ../dist-v4-final.zip . -x "*.DS_Store" "*.git*" "Thumbs.db"
)

echo "Zip contents (top 20):"
unzip -l dist-v4-final.zip | head -20

echo "Package complete: dist-v4-final.zip ($(du -h dist-v4-final.zip | cut -f1))"
echo "Ready for: az functionapp deployment source config-zip"

