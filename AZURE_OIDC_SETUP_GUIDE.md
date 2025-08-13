# Azure OIDC Authentication Setup Guide

## 🎯 **Azure Service Principal Configuration**

To enable OIDC authentication between GitHub Actions and Azure, you need to create a Service Principal with federated credentials.

### 1. Create Azure Service Principal

```bash
# Create Service Principal
az ad sp create-for-rbac \
  --name "asora-github-oidc" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID} \
  --query '{clientId:appId,clientSecret:password,tenantId:tenant}' \
  --output json

# Save the output - you'll need clientId and tenantId for GitHub secrets
```

### 2. Configure Federated Credentials

```bash
# Get the Application Object ID
APP_ID=$(az ad app list --display-name "asora-github-oidc" --query '[0].id' -o tsv)

# Create federated credential for main branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "asora-github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:AsoraKK/Asora:ref:refs/heads/main",
    "description": "GitHub OIDC for Asora main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create federated credential for pull requests (optional)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "asora-github-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:AsoraKK/Asora:pull_request",
    "description": "GitHub OIDC for Asora pull requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## 🔐 **GitHub Secrets Configuration**

Add the following secrets to your GitHub repository (`Settings > Secrets and Variables > Actions`):

### Required Secrets:
- **AZURE_CLIENT_ID**: The Application (client) ID from the Service Principal
- **AZURE_TENANT_ID**: The Directory (tenant) ID from Azure AD
- **AZURE_SUBSCRIPTION_ID**: The Azure subscription ID where resources will be deployed

### ⚠️ **Important**: 
- **DO NOT** add `AZURE_CLIENT_SECRET` - OIDC authentication doesn't need it
- No passwords or secrets are stored in GitHub with OIDC

## ✅ **Workflow Configuration Verification**

### 1. Permissions Block
```yaml
# Required for OIDC authentication with Azure
permissions:
  id-token: write  # Required for OIDC token exchange
  contents: read   # Required to checkout code
```

### 2. Environment Variables
```yaml
env:
  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### 3. Azure Login Step
```yaml
- name: 🔐 Azure Login (OIDC)
  uses: azure/login@v2
  with:
    client-id: ${{ env.AZURE_CLIENT_ID }}
    tenant-id: ${{ env.AZURE_TENANT_ID }}
    subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}
```

## 🧪 **Testing OIDC Authentication**

### Manual Test Commands:
```bash
# After Azure login step, verify authentication
az account show --output table
az account show --query name -o tsv
az account show --query tenantId -o tsv
```

### Expected Success Output:
```
✅ Successfully authenticated with Azure using OIDC (no client secrets used)
📋 Current subscription: Your-Subscription-Name
📋 Tenant ID: your-tenant-id-guid
```

## 🔍 **Verification Checklist**

### ✅ GitHub Repository Settings:
- [ ] `AZURE_CLIENT_ID` secret configured
- [ ] `AZURE_TENANT_ID` secret configured  
- [ ] `AZURE_SUBSCRIPTION_ID` secret configured
- [ ] No `AZURE_CLIENT_SECRET` (not needed for OIDC)

### ✅ Workflow Configuration:
- [ ] `permissions: id-token: write` present
- [ ] `azure/login@v2` action used
- [ ] No `client-secret` parameter in login step
- [ ] Environment variables properly referenced

### ✅ Azure Configuration:
- [ ] Service Principal created
- [ ] Federated credentials configured for repository
- [ ] Contributor role assigned to subscription
- [ ] Subject matches: `repo:AsoraKK/Asora:ref:refs/heads/main`

## 🚨 **Troubleshooting**

### Common Issues:

1. **Error: "AADSTS70021: No matching federated identity record found"**
   - Check federated credential subject matches exactly: `repo:OWNER/REPO:ref:refs/heads/main`
   - Verify the issuer is: `https://token.actions.githubusercontent.com`

2. **Error: "AADSTS700016: Application not found"**
   - Verify `AZURE_CLIENT_ID` secret matches the Service Principal's Application ID

3. **Error: "Insufficient privileges"**
   - Ensure Service Principal has appropriate role (Contributor) on the subscription

4. **Error: "The current user is not authorized to perform action"**
   - Check that the Service Principal has access to the specific resources being deployed

## 📋 **Current Asora Configuration**

### Workflows with OIDC:
1. **ci.yml** - Main CI/CD pipeline with deployment
2. **deploy-functionapp.yml** - Manual function app deployment

### Verification Steps Added:
Both workflows now include verification steps that:
- Run `az account show --output table`
- Confirm no client secrets are used
- Display current subscription and tenant information

### Success Criteria:
- ✅ `azure/login@v2` succeeds without client secrets
- ✅ `az account show` prints subscription information
- ✅ Workflows can deploy to Azure resources
- ✅ No sensitive secrets stored in GitHub
