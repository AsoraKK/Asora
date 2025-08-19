# Azure Functions v4 Common Pitfalls & Fixes

## ❌ Issue: Wrong package.json "main" field
**Check:** `"main": "src/index.js"` (should point to compiled output)
**Fix:** Update package.json main field to match your build output

## ❌ Issue: Missing production node_modules
**Check:** Zip contains `node_modules/` at root with `@azure/functions`
**Fix:** Run `npm ci --omit=dev` before packaging

## ❌ Issue: Leftover v3 function.json folders
**Check:** No individual `function.json` files in subdirectories
**Fix:** Delete old function folders, use v4 unified model in `src/index.js`

## ❌ Issue: Wrong Node.js version
**Check:** `WEBSITE_NODE_DEFAULT_VERSION=~20` in app settings
**Fix:** `az functionapp config appsettings set -g asora-psql-flex -n asora-function-dev --settings WEBSITE_NODE_DEFAULT_VERSION=~20`

## ❌ Issue: ES modules vs CommonJS mismatch
**Check:** No `"type": "module"` in package.json for v4
**Fix:** Remove `"type": "module"` or adjust imports/exports

## ❌ Issue: Wrong TypeScript outDir
**Check:** `tsconfig.json` outDir points to `./dist`
**Fix:** Ensure build outputs to `dist/src/` structure

## ❌ Issue: Dev dependencies in production
**Check:** Zip doesn't contain TypeScript, Jest, etc.
**Fix:** Use `npm ci --omit=dev` instead of `npm install`

## ❌ Issue: Stale zip cache
**Check:** `WEBSITE_RUN_FROM_PACKAGE=1` with old deployment
**Fix:** New deployment should override, but can delete old zip in Kudu if needed

## Quick Health Checks
```bash
# 1. Verify package structure
unzip -l dist-v4-final.zip | grep -E "(host.json|package.json|src/index.js|node_modules/@azure/functions)"

# 2. Check app settings
az functionapp config appsettings list -g asora-psql-flex -n asora-function-dev --query "[?name=='WEBSITE_NODE_DEFAULT_VERSION'].value" -o tsv

# 3. Verify runtime version
curl -s https://asora-function-dev.azurewebsites.net/admin/host/status | grep -i version
```
