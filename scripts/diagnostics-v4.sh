# Azure Functions v4 Diagnostics & Log Commands
# Use these when deployment succeeds but function returns 503

# Stream live application logs
az webapp log tail \
  -g asora-psql-flex \
  -n asora-function-dev \
  --provider application

# Alternative: Kudu log stream (paste in browser)
# https://asora-function-dev.scm.azurewebsites.net/api/logstream

# Get recent application logs (last 100 lines)
az webapp log download \
  -g asora-psql-flex \
  -n asora-function-dev \
  --log-file recent-logs.zip

# Check function app configuration
az functionapp config appsettings list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --output table

echo "🔧 Flex runtime snapshot (if configured):"
az rest --method get --uri "https://management.azure.com/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Web/sites/asora-function-dev?api-version=2023-01-01" \
  --query "properties.functionAppConfig.runtime" -o json

# Function host status endpoint
echo "🔍 Function host status:"
curl -s https://asora-function-dev.azurewebsites.net/admin/host/status | jq '.'

# Check function keys (if admin access needed)
echo "🔑 Function keys:"
az functionapp keys list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "masterKey"

# What to look for in logs:
echo "🔍 Common error patterns to search for:"
echo "- 'Cannot find module' (missing dependencies)"
echo "- 'SyntaxError' (import/export issues)" 
echo "- 'Module not found' (wrong paths in src/index.js)"
echo "- 'Worker was unable to load' (runtime version mismatch)"
echo "- 'The function runtime is unable to start' (host.json issues)"

# Quick fixes for common issues:
echo "🛠️  Quick fixes:"
echo "- Verify package.json 'main': 'src/index.js'"
echo "- Check host.json 'version': '4.0'"
echo "- Ensure no function.json files in v4 project"
echo "- For Flex, confirm properties.functionAppConfig.runtime is node@20"
echo "- Remove 'type': 'module' from package.json for CommonJS"
