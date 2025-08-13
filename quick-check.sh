#!/usr/bin/env bash
# Quick pre-commit checks - essential gates only
set -euo pipefail

echo "🚀 Quick pre-commit verification"
echo "================================"

# Essential checks that must pass
dart format --output=none --set-exit-if-changed . || { echo "❌ Format check failed"; exit 1; }
flutter analyze --no-fatal-infos || { echo "❌ Analysis failed"; exit 1; }
flutter test || { echo "❌ Flutter tests failed"; exit 1; }

pushd functions > /dev/null
npm run build || { echo "❌ Functions build failed"; exit 1; }
npm test || { echo "❌ Functions tests failed"; exit 1; }
popd > /dev/null

echo "✅ Quick checks passed - ready for commit!"
