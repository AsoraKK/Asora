#!/usr/bin/env bash
set -euo pipefail

# Load nvm if available
if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
  
  # Use Node.js 22 if available
  if nvm ls 22 >/dev/null 2>&1; then
    nvm use 22 >/dev/null || true
  fi
fi

echo "🚀 Pre-commit verification script - CI parity checks"
echo "=================================================="

echo ""
echo "📋 Step 1: Verify toolchain versions"
echo "-------------------------------------"
NODE_VERSION=$(node -v)
FLUTTER_VERSION=$(flutter --version | head -1 | grep -oP 'Flutter \K[0-9]+\.[0-9]+\.[0-9]+')
FUNC_VERSION=$(func --version | grep -oP '[0-9]+\.[0-9]+\.[0-9]+')

echo "Node.js version: $NODE_VERSION"
echo "Flutter version: $FLUTTER_VERSION"
echo "Azure Functions Core Tools version: $FUNC_VERSION"

# Version checks
if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
  echo "⚠️  WARNING: Node.js $NODE_VERSION detected, CI expects v22.x"
  echo "   This will cause Azure Functions compatibility issues"
fi

if [[ ! "$FLUTTER_VERSION" =~ ^3\.32\. ]]; then
  echo "⚠️  WARNING: Flutter $FLUTTER_VERSION detected, CI expects 3.32.x"
fi

if [[ ! "$FUNC_VERSION" =~ ^4\. ]]; then
  echo "⚠️  WARNING: Functions Core Tools $FUNC_VERSION detected, CI expects 4.x"
fi

echo ""
echo "📦 Step 2: Clean installs"
echo "-------------------------"
echo "Flutter pub get..."
flutter pub get

echo "Functions npm ci..."
pushd functions > /dev/null
npm ci
popd > /dev/null

echo ""
echo "🎨 Step 3: Dart format gate"
echo "---------------------------"
echo "Checking Dart formatting..."
dart format --output=none --set-exit-if-changed .

echo ""
echo "🔍 Step 4: Static analysis (Flutter)"
echo "------------------------------------"
echo "Running Flutter analyze..."
flutter analyze --no-fatal-infos

echo ""
echo "🧪 Step 5: Flutter tests"
echo "------------------------"
echo "Running Flutter tests..."
flutter test

echo ""
echo "⚙️  Step 6: TypeScript compile (Functions)"
echo "------------------------------------------"
echo "Building Functions..."
pushd functions > /dev/null
npm run build
popd > /dev/null

echo ""
echo "🧪 Step 7: Functions unit tests"
echo "-------------------------------"
echo "Running Functions tests..."
pushd functions > /dev/null
npm test
popd > /dev/null

echo ""
echo "⚙️  Step 8: Local settings check"
echo "--------------------------------"
if [[ ! -f "functions/local.settings.json" ]]; then
  echo "❌ functions/local.settings.json missing"
  echo "   Run: cp local.settings.json.example functions/local.settings.json"
  echo "   Then fill in development secrets"
  exit 1
else
  echo "✅ functions/local.settings.json exists"
fi

echo ""
echo "🏥 Step 9: Function host smoke test"
echo "-----------------------------------"
pushd functions > /dev/null
# Copy required files to dist
cp host.json dist/ 2>/dev/null || true
cp local.settings.json dist/ 2>/dev/null || true
popd > /dev/null

if [[ "$NODE_VERSION" =~ ^v22\. ]]; then
  echo "Testing function host startup..."
  pushd functions/dist > /dev/null
  timeout 15s func start --port 7072 --javascript > /tmp/func-test.log 2>&1 &
  FUNC_PID=$!
  sleep 5
  
  if kill -0 $FUNC_PID 2>/dev/null; then
    echo "✅ Function host started successfully"
    echo "Testing health endpoint..."
    MAX_RETRIES=5
    for attempt in $(seq 1 $MAX_RETRIES); do
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7072/api/health || echo "000")
      if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Health endpoint responding"
        break
      elif [ "$attempt" -eq "$MAX_RETRIES" ]; then
        echo "❌ Health endpoint returned HTTP $HTTP_STATUS after $MAX_RETRIES attempts"
        kill $FUNC_PID 2>/dev/null || true
        exit 1
      else
        echo "Attempt $attempt: HTTP $HTTP_STATUS - waiting..."
        sleep 2
      fi
    done
    kill $FUNC_PID 2>/dev/null || true
  else
    echo "❌ Function host failed to start"
    cat /tmp/func-test.log
    exit 1
  fi
  popd > /dev/null
else
  echo "⚠️  Skipping function host test - Node.js v22.x required"
  echo "   Current version: $NODE_VERSION"
fi

echo ""
echo "✅ All CI parity checks completed!"
echo "=================================="
if [[ "$NODE_VERSION" =~ ^v22\. ]]; then
  echo "🎯 Ready for commit - no surprises expected in GitHub Actions"
else
  echo "⚠️  Ready for commit, but Node.js version mismatch detected"
  echo "   Consider using Node.js v22.x for full local testing"
fi
