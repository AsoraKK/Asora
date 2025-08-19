#!/bin/bash
# Azure Functions v4 Packaging Script (Linux/macOS)
# Creates production-ready zip with correct root layout

set -e

echo "🚀 Azure Functions v4 Packaging Started"

# Clean previous artifacts
echo "🧹 Cleaning previous artifacts..."
rm -rf dist deploy dist-v4-final.zip

# Install production dependencies only
echo "📦 Installing production dependencies..."
npm ci --omit=dev

# Build TypeScript to dist/src/*
echo "🔨 Building TypeScript..."
npm run build

# Create staging directory
echo "📁 Creating deployment staging..."
mkdir -p deploy

# Copy essential files to zip root
echo "📋 Copying configuration files..."
cp host.json package.json deploy/

# Copy compiled source
echo "📄 Copying compiled source..."
cp -R dist/src deploy/src

# Copy production node_modules
echo "📚 Copying production node_modules..."
cp -R node_modules deploy/node_modules

# Create final zip (paths relative to zip root)
echo "🗜️  Creating deployment zip..."
cd deploy
zip -r ../dist-v4-final.zip . -x "*.DS_Store" "*.git*" "Thumbs.db"
cd ..

# Verify zip contents
echo "✅ Zip contents verification:"
unzip -l dist-v4-final.zip | head -20

echo "📦 Package complete: dist-v4-final.zip ($(du -h dist-v4-final.zip | cut -f1))"
echo "🎯 Ready for: az functionapp deployment source config-zip"
