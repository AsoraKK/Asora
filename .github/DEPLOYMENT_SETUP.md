# 🚀 GitHub Actions Azure Function App Deployment Setup

This guide explains how to set up automated deployment for your Asora Azure Function App using GitHub Actions with OIDC authentication.

## 📋 Prerequisites

- Azure subscription with Function App deployed
- GitHub repository with admin access
- Azure CLI installed locally

## 🔐 Step 1: Create Azure Service Principal with OIDC

### Option A: Using Azure CLI (Recommended)

```bash
# Set variables
SUBSCRIPTION_ID="your-azure-subscription-id"
RESOURCE_GROUP="asora-psql-flex"
APP_NAME="asora-github-actions"
REPO="AsoraKK/Asora"  # Your GitHub repository

# Create service principal for OIDC
az ad app create --display-name "$APP_NAME"

# Get the Application (client) ID
CLIENT_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
echo "Client ID: $CLIENT_ID"

# Create service principal
az ad sp create --id $CLIENT_ID

# Get the Object ID of the service principal
OBJECT_ID=$(az ad sp show --id $CLIENT_ID --query "id" -o tsv)
echo "Object ID: $OBJECT_ID"

# Create federated credentials for GitHub Actions
az ad app federated-credential create \
   --id $CLIENT_ID \
   --parameters '{
       "name": "github-main",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:'$REPO':ref:refs/heads/main",
       "audiences": ["api://AzureADTokenExchange"]
   }'

# Create federated credential for manual workflow dispatch
az ad app federated-credential create \
   --id $CLIENT_ID \
   --parameters '{
       "name": "github-environment",
       "issuer": "https://token.actions.githubusercontent.com",
       "subject": "repo:'$REPO':environment:dev",
       "audiences": ["api://AzureADTokenExchange"]
   }'

# Assign Contributor role to the service principal
az role assignment create \
   --assignee $CLIENT_ID \
   --role "Contributor" \
   --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

# Get tenant ID
TENANT_ID=$(az account show --query "tenantId" -o tsv)
echo "Tenant ID: $TENANT_ID"
```

### Option B: Using Azure Portal

1. **Navigate to Azure Active Directory**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Click "New registration"
   - Name: `asora-github-actions`
   - Click "Register"

2. **Configure Federated Credentials**
   - In your app registration → Certificates & secrets → Federated credentials
   - Click "Add credential"
   - Select "GitHub Actions deploying Azure resources"
   - Repository: `AsoraKK/Asora`
   - Entity type: "Branch"
   - Branch name: `main`
   - Name: `github-main`
   - Click "Add"

3. **Assign Permissions**
   - Go to Azure Portal → Subscriptions → Your subscription → Access control (IAM)
   - Click "Add role assignment"
   - Role: "Contributor"
   - Assign access to: "User, group, or service principal"
   - Select your app registration
   - Click "Save"

## 🔑 Step 2: Configure GitHub Repository Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

### Required Secrets:

```
AZURE_CLIENT_ID=your-application-client-id
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_SUBSCRIPTION_ID=your-azure-subscription-id
```

### Optional Secrets (if using environment-specific deployments):

```
# Development environment
DEV_AZURE_FUNCTION_APP_NAME=asora-function-dev
DEV_AZURE_RESOURCE_GROUP=asora-psql-flex

# Production environment (when ready)
PROD_AZURE_FUNCTION_APP_NAME=asora-function-prod
PROD_AZURE_RESOURCE_GROUP=asora-prod
```

## 🌍 Step 3: Create GitHub Environments (Optional)

For better security and environment-specific deployments:

1. **Navigate to Repository Settings**
   - Go to GitHub repository → Settings → Environments
   - Click "New environment"

2. **Create Development Environment**
   - Name: `dev`
   - Add environment variables:
     - `AZURE_FUNCTIONAPP_NAME`: `asora-function-dev`
     - `AZURE_RESOURCE_GROUP`: `asora-psql-flex`

3. **Create Production Environment** (when ready)
   - Name: `production`
   - Enable "Required reviewers" for added security
   - Add environment variables:
     - `AZURE_FUNCTIONAPP_NAME`: `asora-function-prod`
     - `AZURE_RESOURCE_GROUP`: `asora-prod`

## 🧪 Step 4: Test the Deployment

### Automatic Deployment (Push to main)
```bash
# Make a change to any function
echo "// Updated $(date)" >> authEmail/index.js

# Commit and push
git add .
git commit -m "Test: Update authEmail function"
git push origin main
```

### Manual Deployment
1. Go to GitHub repository → Actions
2. Click "Deploy Azure Function App"
3. Click "Run workflow"
4. Select environment (dev/staging/production)
5. Click "Run workflow"

## 📊 Step 5: Monitor Deployment

### GitHub Actions Logs
- Navigate to Actions tab in your repository
- Click on the latest workflow run
- Review logs for each step

### Azure Function App Verification
```bash
# Check deployment status
az functionapp show \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --query "{name:name, state:state, hostNames:hostNames[0]}" -o table

# List deployed functions
az functionapp function list \
  --name asora-function-dev \
  --resource-group asora-psql-flex \
  --query "[].{Name:name, Trigger:config.bindings[0].type}" -o table
```

## 🔧 Workflow Features

### ✅ What the workflow does:
- **Multi-runtime support**: Handles both Node.js and Python functions
- **Smart deployment**: Only deploys when function code changes
- **Health verification**: Tests deployment success
- **Environment support**: Dev/staging/production environments
- **Security**: Uses OIDC instead of storing credentials
- **Clean packaging**: Creates optimized deployment packages

### 🎯 Trigger Conditions:
- **Automatic**: Push to `main` branch with changes to function code
- **Manual**: Workflow dispatch with environment selection
- **Paths**: Only triggers when relevant files change

## 🚨 Troubleshooting

### Common Issues:

1. **OIDC Authentication Failed**
   ```
   Error: OIDC token request failed
   ```
   **Solution**: Verify federated credentials are correctly configured for your repository

2. **Permission Denied**
   ```
   Error: Insufficient privileges to complete the operation
   ```
   **Solution**: Ensure service principal has Contributor role on the resource group

3. **Function App Not Found**
   ```
   Error: Resource 'asora-function-dev' not found
   ```
   **Solution**: Verify the function app name and resource group in workflow variables

4. **Dependencies Issues**
   ```
   Error: Cannot find module
   ```
   **Solution**: Ensure package.json includes all required dependencies

### Debug Commands:
```bash
# Check service principal permissions
az role assignment list --assignee $CLIENT_ID --output table

# Verify function app exists
az functionapp list --resource-group asora-psql-flex --query "[].name" -o table

# Test OIDC token (locally)
az login --service-principal -u $CLIENT_ID --federated-token $ACTIONS_ID_TOKEN_REQUEST_TOKEN --tenant $AZURE_TENANT_ID
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. ✅ GitHub Actions workflow completes without errors
2. ✅ Function app shows updated deployment timestamp in Azure Portal
3. ✅ All functions are listed and accessible
4. ✅ Health check passes (if health endpoint exists)
5. ✅ Application Insights shows new telemetry data

---

**🔐 Security Note**: This setup uses OpenID Connect (OIDC) which is more secure than storing long-lived secrets. The federated credentials are tied to your specific GitHub repository and branch, providing fine-grained access control.
