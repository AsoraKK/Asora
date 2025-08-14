#!/usr/bin/env bash
# Quick pre-commit checks - essential gates only
set -euo pipefail

# Load nvm if available
if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
  
  # Use Node.js 20 if available
  if nvm ls 20 >/dev/null 2>&1; then
    nvm use 20 >/dev/null || true
  fi
fi

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
