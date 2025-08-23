# 🚀 Asora Production Deployment Checklist

## 📋 Pre-Deployment Preparation

### 1. **Environment Configuration**
- [ ] **Set Production Environment Variables**
  ```bash
  # Core Terraform Variables
  export TF_VAR_subscription_id="your-azure-subscription-id"
  export TF_VAR_environment="production"
  export TF_VAR_location="northeurope"
  export TF_VAR_resource_group_name="asora-prod"
  export TF_VAR_client_ip="your-client-ip"
  
  # Database Configuration
  export TF_VAR_postgresql_admin="asoraadmin"
  export TF_VAR_postgresql_password="generate-strong-password-32-chars"
  
  # Security Secrets (Generate strong random values)
  export TF_VAR_jwt_secret="generate-256-bit-secret"
  export TF_VAR_email_hash_salt="generate-salt-for-email-hashing"
  
  # AI Moderation API Keys
  export TF_VAR_hive_text_key="your-hive-text-api-key"
  export TF_VAR_hive_image_key="your-hive-image-api-key" 
  export TF_VAR_hive_deepfake_key="your-hive-deepfake-api-key"
  ```

- [ ] **Verify No Hardcoded Secrets**
  - Confirm `local.settings.json` is not committed to git
  - Use `local.settings.json.example` template only
  - Validate `terraform.tfvars` is in `.gitignore`

### 2. **Security Verification**
- [ ] **Azure Subscription Access**
  - Verify correct Azure subscription is selected
  - Ensure Service Principal has required permissions:
    - Contributor role on subscription
    - Key Vault Administrator (for secret management)
    - Application Insights Component Contributor

- [ ] **Network Security**
  - Update `TF_VAR_client_ip` to production admin IP
  - Review PostgreSQL firewall rules
  - Confirm HTTPS-only enforcement

### 3. **Code Preparation**
- [ ] **Backend Functions Build**
  ```bash
  cd functions
  npm install --production
  npm run build
  # Verify no TypeScript compilation errors
  ```

- [ ] **Infrastructure Validation**
  ```bash
  cd Infra
  terraform init
  terraform validate
  terraform plan -var-file="terraform.tfvars.production"
  ```

---

## 🏗️ Infrastructure Deployment

### 4. **Execute Deployment Script**
- [ ] **Run Production Deployment**
  ```bash
  chmod +x deploy-production.sh
  ./deploy-production.sh
  ```

- [ ] **Monitor Deployment Progress**
  - Azure Resource Group creation: `asora-prod`
  - PostgreSQL Flexible Server provisioning
  - Cosmos DB (Serverless) setup
  - Key Vault with secrets management
  - Function App with Elastic Premium plan (EP1)
  - Application Insights and Log Analytics workspace

### 5. **Post-Infrastructure Verification**
- [ ] **Resource Group Status**
  ```bash
  az group show --name asora-prod --query "properties.provisioningState"
  # Expected: "Succeeded"
  ```

- [ ] **Key Vault Access Verification**
  ```bash
  az keyvault secret list --vault-name kv-asora-dev
  # Should show: JWT-SECRET, HIVE-AI-KEY, HIVE-TEXT-KEY, HIVE-VISUAL-KEY, COSMOS-KEY, POSTGRES-PASSWORD
  ```

- [ ] **Function App System Identity**
  ```bash
  az functionapp identity show --name asora-functions-production --resource-group asora-prod
  # Verify: "type": "SystemAssigned" and principalId exists
  # Ensure this identity has "Key Vault Secrets User" role on kv-asora-dev
  ```

---

## 🔧 Application Configuration

### 6. **Key Vault Secret Management**
- [ ] **Verify Secret References in Function App**
  Using Key Vault URI: `https://kv-asora-dev.vault.azure.net/`
  
  **Required Secret Bindings:**
  ```env
  # In Function App → Configuration → Application Settings
  JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/JWT-SECRET/)
  HIVE_AI_KEY=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/HIVE-AI-KEY/)
  HIVE_TEXT_KEY=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/HIVE-TEXT-KEY/)
  HIVE_VISUAL_KEY=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/HIVE-VISUAL-KEY/)
  COSMOS_KEY=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/COSMOS-KEY/)
  POSTGRES_PASSWORD=@Microsoft.KeyVault(SecretUri=https://kv-asora-dev.vault.azure.net/secrets/POSTGRES-PASSWORD/)
  ```

- [ ] **Test Key Vault Access**
  ```bash
  # Function App should have Key Vault Secrets User role
  az keyvault secret show --vault-name kv-asora-dev --name JWT-SECRET --query "value" -o tsv
  # Should return the secret value (test with proper authentication)
  ```

- [ ] **Restart Function App After Configuration**
  ```bash
  az functionapp restart --name asora-functions-production --resource-group asora-prod
  # Required after updating Key Vault references
  ```

### 7. **Database Setup**
- [ ] **PostgreSQL Database Initialization**
  ```bash
  # Connect using admin credentials and create initial schema
  psql "Host=asora-pg-dev-ne.postgres.database.azure.com;Database=asora_db;Username=asoraadmin;Password=your-password;SslMode=Require;"
  \i database/create_users_table.sql
  ```

- [ ] **Cosmos DB Collections**
  - Database: `asora`
  - Container: `posts` (partition key: `/authorId`)
  - Container: `config` (for dynamic moderation rules)

### 8. **Application Insights Configuration**
- [ ] **Verify Telemetry Connection**
  - Check instrumentation key is set in Function App
  - Connection string properly configured
  - Log Analytics workspace linked

---

## 🧪 Deployment Verification (Smoke Tests)

### 9. **Core Function Health Checks**
- [ ] **Health Endpoint Test**
  ```bash
  curl -f https://asora-functions-production.azurewebsites.net/api/health
  # Expected: 200 OK
  ```

- [ ] **Key Vault Integration Test (COMPLETED ✅)**
  ```bash
  # Test JWT_SECRET retrieval from Key Vault
  # This test has been completed successfully - JWT_SECRET retrieved with 64 character length
  # Test endpoint has been removed for security
  # Result: ✅ PASSED - Key Vault integration working properly
  ```

- [ ] **Authentication Flow Test**
  ```bash
  # Test email authentication
  curl -X POST https://asora-functions-production.azurewebsites.net/api/authEmail \
    -H "Content-Type: application/json" \
    -d '{"email": "test@asora.app", "password": "testpass123"}'
  # Expected: 200 OK with JWT token
  ```

### 10. **Database Connectivity Tests**
- [ ] **PostgreSQL Connection**
  ```bash
  curl -H "Authorization: Bearer JWT_TOKEN" \
    https://asora-functions-production.azurewebsites.net/api/getUserAuth
  # Expected: 200 OK with user data from PostgreSQL
  ```

- [ ] **Cosmos DB Connection**
  ```bash
  curl -H "Authorization: Bearer JWT_TOKEN" \
    https://asora-functions-production.azurewebsites.net/api/feed/getFeedPosts?page=1
  # Expected: 200 OK with feed data from Cosmos DB
  ```

### 11. **AI Moderation System Test**
- [ ] **Content Creation with AI Check**
  ```bash
  curl -X POST https://asora-functions-production.azurewebsites.net/api/post/create \
    -H "Authorization: Bearer JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test post content", "mediaUrl": null}'
  # Expected: 200 OK or 400 if content flagged by AI
  ```

---

## 📊 Monitoring & Observability

### 12. **Application Insights Verification**
- [ ] **Live Metrics Stream**
  - Navigate to Azure Portal → Application Insights → Live Metrics
  - Verify incoming requests appear in real-time

- [ ] **Custom Telemetry Check**
  ```kql
  requests 
  | where timestamp > ago(10m)
  | summarize count() by name
  | order by count_ desc
  ```

- [ ] **Error Monitoring Setup**
  ```kql
  exceptions
  | where timestamp > ago(1h)
  | summarize count() by type
  ```

### 13. **Performance Baseline Validation**
- [ ] **Response Time Verification**
  - `/api/authEmail`: < 2000ms (P95)
  - `/api/getMe`: < 500ms (P95)
  - `/api/feed/getFeedPosts`: < 1000ms (P95)
  - `/api/post/create`: < 1500ms (P95)

- [ ] **Throughput Test**
  ```bash
  # Run 100 concurrent requests to health endpoint
  ab -n 100 -c 10 https://asora-functions-production.azurewebsites.net/api/health
  # Expected: 0% failed requests
  ```

---

## 🔐 Security Validation

### 14. **Security Configuration Checks**
- [ ] **HTTPS Enforcement**
  ```bash
  curl -I http://asora-functions-production.azurewebsites.net/api/health
  # Expected: 301 redirect to HTTPS
  ```

- [ ] **Security Headers Validation**
  ```bash
  curl -I https://asora-functions-production.azurewebsites.net/api/health
  # Check for: Strict-Transport-Security, X-Content-Type-Options, etc.
  ```

- [ ] **CORS Configuration**
  ```bash
  # Verify only production domains are allowed
  curl -H "Origin: https://malicious-site.com" \
    https://asora-functions-production.azurewebsites.net/api/health
  # Expected: CORS error (blocked)
  ```

### 15. **Access Control Verification**
- [ ] **Function App Authentication**
  - System-assigned managed identity enabled
  - Key Vault access permissions configured (`Key Vault Secrets User` role)
  - No hardcoded secrets in application settings

- [ ] **Key Vault Security Practices**
  ```bash
  # Verify RBAC assignments on kv-asora-dev
  az role assignment list --scope "/subscriptions/$TF_VAR_subscription_id/resourceGroups/asora-psql-flex/providers/Microsoft.KeyVault/vaults/kv-asora-dev"
  
  # Check for proper role assignments:
  # - Function App managed identity: "Key Vault Secrets User"
  # - Admin users: "Key Vault Secrets Officer" (if needed)
  ```

- [ ] **Secret Rotation Schedule**
  - Set quarterly rotation reminders for all secrets:
    - JWT-SECRET, HIVE-AI-KEY, HIVE-TEXT-KEY, HIVE-VISUAL-KEY
    - COSMOS-KEY, POSTGRES-PASSWORD
  - Document rotation procedures for each secret type

- [ ] **Database Security**
  - PostgreSQL: SSL required, firewall rules active
  - Cosmos DB: Serverless mode, key-based access via Key Vault (`kv-asora-dev`)
  - Key Vault: Proper RBAC with "Key Vault Secrets User" role assignments

---

## 📱 Flutter App Configuration

### 16. **Mobile App Production Setup**
- [ ] **Update Base URL Configuration**
  ```dart
  // In Flutter app
  static const String _baseUrl = 
    'https://asora-functions-production.azurewebsites.net/api';
  ```

- [ ] **Environment Flag**
  ```bash
  # Build production Flutter app
  flutter build apk --release --dart-define=FLUTTER_DEV=false
  flutter build ios --release --dart-define=FLUTTER_DEV=false
  ```

---

## 🔄 CI/CD Pipeline Setup (Optional)

### 17. **GitHub Actions Deployment**
- [ ] **Configure Azure OIDC Authentication**
  ```bash
  # Create service principal with federated credentials
  az ad app create --display-name "asora-github-actions"
  CLIENT_ID=$(az ad app list --display-name "asora-github-actions" --query "[0].appId" -o tsv)
  
  # Add federated credential for GitHub Actions
  az ad app federated-credential create --id $CLIENT_ID --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com", 
    "subject": "repo:AsoraKK/Asora:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
  ```

- [ ] **Add GitHub Repository Secrets**
  ```
  Repository Settings → Secrets and variables → Actions:
  AZURE_CLIENT_ID=your-application-client-id
  AZURE_TENANT_ID=your-azure-tenant-id  
  AZURE_SUBSCRIPTION_ID=your-azure-subscription-id
  ```

- [ ] **Test Automated Deployment**
  ```bash
  # Push to main branch or use manual workflow dispatch
  git push origin main
  # Monitor deployment in GitHub Actions tab
  ```

- [ ] **Verify Deployment Pipeline**
  - GitHub Actions workflow completes successfully
  - Function App shows updated deployment timestamp
  - All functions are accessible and healthy
  - Application Insights receives telemetry data

---

## 🚨 Rollback Plan

### 18. **Rollback Triggers**
Initiate rollback if any of the following occur within 30 minutes:
- Error rate > 5% for 5+ minutes
- Response time P95 > 5 seconds for 5+ minutes
- Authentication endpoints return 500 errors
- Database connectivity issues > 50% of requests
- Key Vault access failures

### 19. **Rollback Procedure**
- [ ] **Infrastructure Rollback**
  ```bash
  # If using previous Terraform state
  terraform workspace select production-backup
  terraform apply
  ```

- [ ] **Function App Rollback**
  ```bash
  # Option 1: Use GitHub Actions
  # Navigate to Actions → Deploy Azure Function App → Re-run previous successful deployment
  
  # Option 2: Manual rollback
  az functionapp deployment source config-zip \
    --resource-group asora-prod \
    --name asora-functions-production \
    --src backup-deploy.zip
  ```

- [ ] **DNS/Client Updates**
  - Revert Flutter app to previous endpoint
  - Update any cached configurations

---

## ✅ Post-Deployment Tasks

### 20. **Documentation Updates**
- [ ] Update README.md with production endpoints
- [ ] Document production environment variables
- [ ] Update API documentation with production URLs
- [ ] **✅ COMPLETED: Test endpoint removed**
  ```bash
  # Test JWT secret endpoint has been successfully removed after validation
  # Local testing confirmed JWT_SECRET retrieval works properly (64 characters)
  # Key Vault integration validated and ready for production
  ```

### 21. **Team Notifications**
- [ ] Notify development team of successful deployment
- [ ] Share monitoring dashboard URLs
- [ ] Provide production troubleshooting guide
- [ ] **Document CI/CD Pipeline**
  - Share GitHub Actions workflow details
  - Provide OIDC setup documentation (`.github/DEPLOYMENT_SETUP.md`)
  - Train team on manual deployment procedures

### 22. **Ongoing Monitoring Setup**
- [ ] **Alerting Rules**
  - High error rate alerts (> 2%)
  - Response time degradation (> 3 seconds P95)
  - Key Vault access failures
  - Database connection issues

- [ ] **Daily Health Checks**
  - Automated smoke test schedule
  - Log analysis for errors
  - Performance metrics review

- [ ] **CI/CD Pipeline Monitoring**
  - GitHub Actions workflow success rate
  - Deployment frequency and lead time
  - Failed deployment notifications
  - Automated rollback triggers

---

## 📚 Quick Reference

### Production URLs:
- **Function App**: `https://asora-functions-production.azurewebsites.net`
- **Application Insights**: Azure Portal → Resource Group → asora-appinsights-production
- **Key Vault**: `https://kv-asora-dev.vault.azure.net/` (Primary secrets vault)
  - Note: kv-asora-flex-dev is empty and unused
- **PostgreSQL**: asora-pg-dev-ne.postgres.database.azure.com
- **Cosmos DB**: asora-cosmos-dev.documents.azure.com

### Emergency Contacts:
- **Azure Support**: [Azure Support Portal](https://portal.azure.com/#view/Microsoft_Azure_Support/HelpAndSupportBlade)
- **Hive AI Support**: [Hive AI Documentation](https://docs.thehive.ai/)

---

**🎊 Deployment Complete!** 

After completing all checklist items, your Asora platform is ready for production use with:
- Secure Azure infrastructure with Key Vault secret management
- AI-powered content moderation with real-time configuration
- Comprehensive monitoring via Application Insights
- Production-grade security with HTTPS enforcement
- Automated error handling and logging

Monitor the platform closely for the first 24 hours and run the complete smoke test plan regularly to ensure optimal performance.
