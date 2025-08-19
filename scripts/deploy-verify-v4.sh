# Azure Functions v4 Deployment Commands
# Copy-paste these commands after running the packaging script

# Deploy the zip package
az functionapp deployment source config-zip \
  -g asora-psql-flex \
  -n asora-function-dev \
  --src dist-v4-final.zip \
  --timeout 600

# Wait for deployment to complete (30s buffer)
echo "⏳ Waiting 30s for deployment to stabilize..."
sleep 30

# Verify deployment - list all functions
echo "📋 Listing deployed functions:"
az functionapp function list \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "[].{Name:name, TriggerType:config.bindings[0].type}" \
  --output table

# Health check via HTTP
echo "🔍 Testing /api/health endpoint:"
curl -I https://asora-function-dev.azurewebsites.net/api/health

# Alternative health check with response body
echo "🔍 Health check with response body:"
curl -s https://asora-function-dev.azurewebsites.net/api/health | head -5

# Check function app status
echo "⚡ Function app status:"
az functionapp show \
  -g asora-psql-flex \
  -n asora-function-dev \
  --query "{State:state, DefaultHostName:defaultHostName, RuntimeVersion:siteConfig.linuxFxVersion}" \
  --output table
