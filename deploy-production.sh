#!/bin/bash

# Asora Production Deployment Script
# This script deploys the Asora backend to Azure with proper security configuration

set -e  # Exit on any error

echo "🚀 Starting Asora Production Deployment..."

# Check required environment variables
REQUIRED_VARS=(
    "TF_VAR_subscription_id"
    "TF_VAR_postgresql_password" 
    "TF_VAR_client_ip"
    "TF_VAR_jwt_secret"
    "TF_VAR_email_hash_salt"
    "TF_VAR_hive_text_key"
    "TF_VAR_hive_image_key"
    "TF_VAR_hive_deepfake_key"
)

echo "✅ Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Error: Environment variable $var is not set"
        exit 1
    fi
done

# Set production environment
export TF_VAR_environment="production"

echo "✅ All required environment variables are set"

# Navigate to infrastructure directory
cd Infra

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Validate configuration
echo "🔍 Validating Terraform configuration..."
terraform validate

# Plan deployment
echo "📋 Creating deployment plan..."
terraform plan -out=production.tfplan

# Ask for confirmation
echo "⚠️  About to deploy to PRODUCTION environment"
echo "   Resource Group: asora-prod"
echo "   Location: North Europe"
read -p "   Continue with deployment? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Apply deployment
echo "🚀 Deploying infrastructure..."
terraform apply production.tfplan

# Get deployment outputs
echo "📄 Deployment completed! Getting outputs..."
FUNCTION_APP_URL=$(terraform output -raw function_app_url)
echo "Function App URL: $FUNCTION_APP_URL"

# Deploy Function App code
echo "📦 Deploying Function App code..."
cd ../functions

# Install dependencies
npm install --production

# Create deployment package
zip -r ../deploy.zip . -x "node_modules/@types/*" "*.test.js" "*.spec.js"

# Deploy to Azure Function App
az functionapp deployment source config-zip \
    --resource-group asora-prod \
    --name asora-functions-production \
    --src ../deploy.zip

echo "✅ Function App code deployed successfully"

# Run smoke tests
echo "🧪 Running production smoke tests..."
cd ..

# Test health endpoint
echo "Testing health endpoint..."
if curl -f "$FUNCTION_APP_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test Application Insights connectivity
echo "🔍 Checking Application Insights..."
sleep 30  # Wait for telemetry to appear

echo "✅ Production deployment completed successfully!"
echo ""
echo "🎉 Next steps:"
echo "1. Run the full smoke test plan in PRODUCTION_SMOKE_TEST_PLAN.md"
echo "2. Monitor Application Insights for the first hour"
echo "3. Check Azure Portal for any alerts or issues"
echo "4. Update your Flutter app to use the new endpoint: $FUNCTION_APP_URL"
echo ""
echo "📊 Monitoring URLs:"
echo "- Application Insights: https://portal.azure.com/#resource/subscriptions/$TF_VAR_subscription_id/resourceGroups/asora-prod/providers/Microsoft.Insights/components/asora-appinsights-production"
echo "- Function App: https://portal.azure.com/#resource/subscriptions/$TF_VAR_subscription_id/resourceGroups/asora-prod/providers/Microsoft.Web/sites/asora-functions-production"
echo "- Key Vault: https://portal.azure.com/#resource/subscriptions/$TF_VAR_subscription_id/resourceGroups/asora-prod/providers/Microsoft.KeyVault/vaults/asora-kv-production-*"

# Clean up
rm -f deploy.zip
rm -f Infra/production.tfplan

echo "🎊 Deployment complete!"
