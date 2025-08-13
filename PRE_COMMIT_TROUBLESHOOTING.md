# Pre-commit Verification Troubleshooting Guide

## Quick Reference Commands

```bash
# Quick checks (30 seconds)
./quick-check.sh

# Full CI parity (2-3 minutes) 
./ci-local.sh

# Test pre-push hook
git push --dry-run
```

## Workflow Verification ✅

**Current Configuration Status:**
- ✅ Flutter CI: Uses Flutter 3.32.8 with built-in cache
- ✅ Functions Deploy: Uses Node.js 20.x with npm cache
- ✅ No extra ~/.pub-cache configuration (good)

## Common Failure Fixes

### 1. Formatting Issues
```bash
# Problem: "dart format --set-exit-if-changed" fails
# Fix:
dart format .
git add .
git commit -m "fix: apply dart formatting"
./quick-check.sh  # Re-verify
```

### 2. TypeScript Compile Errors
```bash
# Problem: npm run build fails
# Fix: Address errors in functions/src/**
cd functions
npm run build  # See specific errors
# Fix the TypeScript issues, then:
npm run build  # Verify fix
cd ..
./quick-check.sh  # Re-verify
```

### 3. Port in Use Error
```bash
# Problem: "func start --port 7072" fails with port busy
# Option 1: Find and kill the process
netstat -ano | findstr :7072
taskkill /PID <process_id> /F

# Option 2: Use different port
# Edit ci-local.sh and change:
#   func start --port 7072  →  func start --port 7073
# Update app base URL accordingly for testing session
```

### 4. Node.js Version Mismatch
```bash
# Problem: Functions failing due to Node.js v22 vs required v20
# Check current version:
node -v  # Should show v20.x for Functions compatibility

# Fix with nvm (if available):
nvm use 20
# Or install Node 20.x directly

# Re-run Function steps:
cd functions
npm ci
npm run build
npm test
func start --port 7072  # Should now work
```

### 5. Azure Functions Local Issues
```bash
# Problem: "Worker was unable to load entry point index.js"
# Fix: Ensure proper build output
cd functions
npm run build
ls -la dist/health/  # Should show index.js and function.json

# Problem: Application Insights connection errors
# Fix: Check local.settings.json placeholders
# - Use "dev-placeholder" for local development
# - Actual secrets go in environment variables or Key Vault
```

### 6. Flutter Test Issues
```bash
# Problem: Flutter tests failing
# Fix: Check specific test output
flutter test --verbose

# Common issues:
# - Missing TestWidgetsFlutterBinding.ensureInitialized()
# - Service binding not initialized in test environment
# These are often non-critical warnings in test logs
```

## Pre-push Hook Troubleshooting

### Hook Not Running
```bash
# Verify hooks path is set:
git config core.hooksPath
# Should show: .githooks

# If not set:
git config core.hooksPath .githooks

# Verify hook is executable:
ls -la .githooks/pre-push
# Should show executable permissions (rwx)
```

### Hook Bypassing (Emergency Only)
```bash
# Skip pre-push hook (NOT RECOMMENDED):
git push --no-verify

# Only use in emergencies - defeats the safety purpose
```

## Version Alignment Check

```bash
# Verify versions match CI requirements:
echo "Node.js: $(node -v)"  # Should be v20.x for Functions
echo "Flutter: $(flutter --version | head -1)"  # Should be 3.32.x
echo "Functions: $(func --version)"  # Should be 4.x

# GitHub Actions uses:
# - Node.js 20.x for Functions
# - Flutter 3.32.8 for mobile
```

## Success Indicators

✅ **All systems green when:**
- `./quick-check.sh` exits with code 0
- `./ci-local.sh` completes without errors  
- Pre-push hook allows push to proceed
- No version mismatch warnings

❌ **Investigate when:**
- Any script exits with code 1
- Version warnings appear
- Function host fails to start
- Port conflicts occur

## Emergency Procedures

**If CI is broken and you need to push urgently:**
1. Create separate branch: `git checkout -b hotfix/urgent-fix`
2. Make minimal changes only
3. Skip pre-push: `git push --no-verify origin hotfix/urgent-fix`
4. Fix CI issues in follow-up PR
5. Merge only after CI is green

**Remember:** The pre-commit system prevents problems, not creates them!
