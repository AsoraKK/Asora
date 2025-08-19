# Azure Functions v4 Common Pitfalls & Quick Fixes

## 🔍 Pre-Deployment Checklist

### 1. Package.json Configuration
- [ ] `"main": "src/index.js"` (not dist/src/index.js)
- [ ] Remove `"type": "module"` for CommonJS builds
- [ ] Verify dependencies include `@azure/functions@^4.0.0`

**Quick Check:**
```bash
grep -E '"main"|"type"' package.json
```

### 2. Host.json Configuration  
- [ ] `"version": "4.0"` (not "2.0" or missing)
- [ ] No conflicting v3 configuration

**Quick Check:**
```bash
cat host.json | jq '.version'
```

### 3. Project Structure (V4 Unified Model)
- [ ] No `function.json` files in subdirectories
- [ ] All functions defined in `src/index.js` via decorators
- [ ] No leftover v3 function folders

**Quick Check:**
```bash
find . -name "function.json" -type f | grep -v node_modules
```

### 4. TypeScript Build Configuration
- [ ] `tsconfig.json` outDir points to `dist` (not `src`)
- [ ] Build output is in `dist/src/index.js`
- [ ] No source maps in production build

**Quick Check:**
```bash
cat tsconfig.json | jq '.compilerOptions.outDir'
ls -la dist/src/index.js
```

### 5. Node.js Runtime Version
- [ ] `WEBSITE_NODE_DEFAULT_VERSION` set to `~20`
- [ ] Package engines specify `"node": ">=18.0.0"`
- [ ] No version conflicts in package-lock.json

**Quick Check:**
```bash
az functionapp config appsettings list \
  -g asora-psql-flex -n asora-function-dev \
  --query "[?name=='WEBSITE_NODE_DEFAULT_VERSION'].value"
```

### 6. Dependencies & Node Modules
- [ ] Production `node_modules` present at zip root
- [ ] No dev dependencies in production build
- [ ] `@azure/functions` package included

**Quick Check:**
```bash
# After running npm ci --omit=dev
ls node_modules/@azure/functions/package.json
npm ls --production --depth=0
```

## 🛠️ Quick Fixes

### Fix Wrong Main Field
```bash
# Update package.json main field
npm pkg set main="src/index.js"
```

### Fix Host Version
```bash
# Update host.json version
echo '{"version": "4.0", "logging": {"applicationInsights": {"samplingSettings": {"isEnabled": true}}}}' > host.json
```

### Remove Legacy Function.json Files
```bash
# Clean up v3 artifacts
find . -name "function.json" -not -path "./node_modules/*" -delete
```

### Fix Node Version
```bash
# Set correct Node.js version
az functionapp config appsettings set \
  -g asora-psql-flex -n asora-function-dev \
  --settings "WEBSITE_NODE_DEFAULT_VERSION=~20"
```

### Fix TypeScript Config
```bash
# Ensure correct outDir in tsconfig.json
npm pkg set typescript.compilerOptions.outDir="dist"
```

## 🧹 Production Optimization (Post-Green)

### Node Modules Pruning
```bash
# After successful deployment, optimize node_modules
npm prune --production
npx modclean -r -a
```

### Exclude Dev/Test Artifacts
Add to your packaging script:
```bash
# Exclude development files from zip
zip -r dist-v4-final.zip . \
  -x "*.test.js" "*.spec.js" "test/*" "tests/*" \
     "*.d.ts" "*.map" ".env*" "*.log" \
     "coverage/*" "docs/*" ".git/*"
```

## ☁️ Cloudflare Note

Since Cloudflare is in front:
- Set Cache Rule: Bypass cache for `/api/*` paths
- TLS/SSL mode: Full (strict) - not Flexible
- Origin rules: Pass through Host header

The 503 error is likely from the function host, not Cloudflare.
