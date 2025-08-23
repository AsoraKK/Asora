# Azure Functions Key Vault Configuration - Important Notes

## 📋 Key Points to Remember

### 🎭 App Settings Display Behavior
- **CLI often shows `value: null` for app settings** - This is **masking behavior**, not an error
- The Azure CLI masks sensitive values (like Key Vault references) in output
- This is a security feature, not a configuration issue
- Actual values are properly resolved at runtime

### 🔤 Key Vault SecretName Casing
- **Keep Key Vault SecretName casing consistent**
- **Standardized on lowercase names** in this configuration:
  - `edge-telemetry-secret`
  - `email-hash-salt`
  - `hive-image-key` 
  - `hive-text-key`
  - `jwt-secret`
  - `hive-deepfake-key`

### 🔐 RBAC Role Assignment Troubleshooting
- **If RBAC role assignment errors occur:**
  1. Re-run step 1: Enable system-assigned identity
  2. Then re-run step 2: Assign Key Vault Secrets User role
- Sometimes there's a propagation delay for new managed identities

### 🆔 System-Assigned Identity Verification
- **Always confirm the Function App system-assigned identity is ON**
- Use: `az webapp identity show -g asora-psql-flex -n asora-function-dev -o table`
- The identity should show:
  - `principalId`: A valid GUID
  - `tenantId`: Your tenant GUID
  - `type`: SystemAssigned

## 🔧 Current Configuration Status

### Function App Details
- **Name**: asora-function-dev
- **Resource Group**: asora-psql-flex
- **Subscription**: 99df7ef7-776a-4235-84a4-c77899b2bb04
- **Key Vault**: kv-asora-dev (primary)
  - Note: kv-asora-flex-dev is empty and unused
- **Storage Account**: asoraflexdev1404

### Managed Identity
- **Principal ID**: fb9a0072-3c59-4560-b425-1915016fb786
- **Role**: Key Vault Secrets User on kv-asora-dev

### Key Vault References Format
```
@Microsoft.KeyVault(VaultName=kv-asora-dev;SecretName=secret-name)
```

### Environment Variables Set
- `HIVE_TEXT_KEY` → `hive-text-key`
- `HIVE_IMAGE_KEY` → `hive-image-key`
- `HIVE_DEEPFAKE_KEY` → `hive-deepfake-key`
- `EMAIL_HASH_SALT` → `email-hash-salt`
- `EDGE_TELEMETRY_SECRET` → `edge-telemetry-secret`
- `JWT_SECRET` → `jwt-secret`

## 🚨 Common Issues & Solutions

### Issue: App settings show `null` values
- **Solution**: This is normal masking behavior, not an error
- Values are properly resolved at runtime

### Issue: Secret creation fails with `-v` parameter
- **Problem**: Used `-v` instead of `--value` in `az keyvault secret set`
- **Solution**: Always use `--value` parameter for secret values
- **Example**: `az keyvault secret set --vault-name VAULT --name NAME --value "VALUE"`

### Issue: Key Vault references not resolving
- **Check**: System-assigned identity is enabled
- **Check**: Role assignment exists and is properly scoped
- **Action**: Restart Function App after changes

### Issue: RBAC assignment fails
- **Solution**: Wait a few minutes for identity propagation
- **Solution**: Re-run identity creation, then role assignment
- **Solution**: Pass `--subscription` explicitly if CLI context issues occur

### Issue: Function App won't start
- **Check**: AzureWebJobsStorage is properly configured
- **Check**: All referenced secrets exist in Key Vault
- **Check**: Managed identity has proper permissions

### Issue: Function App has no hostname/functions
- **Cause**: No code has been deployed to the Function App yet
- **Solution**: This is expected until function code is deployed
- **Note**: Health checks will fail until functions are deployed

## 📚 References

- [Azure Functions Key Vault References](https://docs.microsoft.com/azure/app-service/app-service-key-vault-references)
- [Managed Identity for Azure Functions](https://docs.microsoft.com/azure/azure-functions/functions-identity)
- [Azure Functions Flex Consumption Plan](https://docs.microsoft.com/azure/azure-functions/flex-consumption-plan)
