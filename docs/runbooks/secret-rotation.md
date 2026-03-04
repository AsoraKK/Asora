# Secret Rotation Runbook

> **Audience**: Platform engineering, security leads.  
> **Frequency**: Quarterly minimum, or immediately after suspected compromise.

---

## 1. Rotation Schedule

| Secret | Location | Rotation Frequency | Owner |
|--------|----------|-------------------|-------|
| `COSMOS_CONNECTION_STRING` | Azure Key Vault | Quarterly | Platform Eng |
| `JWT_SIGNING_KEY` | Azure Key Vault | Quarterly | Platform Eng |
| `FCM_PRIVATE_KEY` | Azure Key Vault | Annually or on compromise | Platform Eng |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Settings | On resource recreation | Platform Eng |
| GitHub OIDC credentials | GitHub Secrets | Annually | DevOps |
| TLS SPKI pins | `environment_config.dart` | On certificate renewal | Security |
| Azure Storage keys | Azure Key Vault | Quarterly | Platform Eng |

---

## 2. Rotation Procedures

### 2.1 Cosmos DB Connection String

```bash
# 1. Regenerate key in Azure Portal or CLI
az cosmosdb keys regenerate \
  --name asora-cosmos \
  --resource-group asora-rg \
  --key-kind primary

# 2. Get new connection string
NEW_CONN=$(az cosmosdb keys list \
  --name asora-cosmos \
  --resource-group asora-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

# 3. Update Key Vault secret
az keyvault secret set \
  --vault-name asora-keyvault \
  --name "cosmos-connection-string" \
  --value "$NEW_CONN"

# 4. Restart function app to pick up new reference
az functionapp restart --name asora-function-flex --resource-group asora-rg
az functionapp restart --name asora-function-staging --resource-group asora-rg

# 5. Verify health
curl -s https://asora-function-flex.azurewebsites.net/api/health | jq .status
curl -s https://asora-function-staging.azurewebsites.net/api/health | jq .status
```

### 2.2 JWT Signing Key

```bash
# 1. Generate new key
NEW_JWT_KEY=$(openssl rand -base64 64)

# 2. Update Key Vault
az keyvault secret set \
  --vault-name asora-keyvault \
  --name "jwt-signing-key" \
  --value "$NEW_JWT_KEY"

# 3. Restart function apps
az functionapp restart --name asora-function-flex --resource-group asora-rg

# 4. Note: Existing tokens will be invalidated. Users will need to re-authenticate.
```

### 2.3 FCM Private Key

```bash
# 1. Generate new service account key in Firebase Console
#    → Project Settings → Service Accounts → Generate new private key

# 2. Extract values from downloaded JSON
FCM_PROJECT_ID=$(jq -r .project_id service-account.json)
FCM_CLIENT_EMAIL=$(jq -r .client_email service-account.json)
FCM_PRIVATE_KEY=$(jq -r .private_key service-account.json)

# 3. Update Key Vault secrets
az keyvault secret set --vault-name asora-keyvault --name "fcm-project-id" --value "$FCM_PROJECT_ID"
az keyvault secret set --vault-name asora-keyvault --name "fcm-client-email" --value "$FCM_CLIENT_EMAIL"
az keyvault secret set --vault-name asora-keyvault --name "fcm-private-key" --value "$FCM_PRIVATE_KEY"

# 4. Delete old key from Firebase Console
# 5. Restart function app
az functionapp restart --name asora-function-flex --resource-group asora-rg

# 6. Verify: send a test notification
```

### 2.4 TLS Certificate Pin Rotation

See `docs/runbooks/tls-pinning-rotation.md` for the full SPKI pin rotation procedure.

---

## 3. Emergency Rotation (Suspected Compromise)

1. **Immediately** rotate the compromised secret (steps above).
2. **Revoke** any sessions/tokens signed with the old key.
3. **Audit** logs for unauthorized access during the exposure window.
4. **Notify** security lead and document in incident report.
5. **Rotate all secrets** if the compromise vector is unclear.
6. Check health endpoints after rotation: `GET /api/health`, `GET /api/ready`.

---

## 4. Verification Checklist

After every rotation:

- [ ] Health endpoint returns `200 healthy`
- [ ] Ready endpoint returns `200 ready`
- [ ] Authentication flow works (sign in, token refresh)
- [ ] Push notifications deliver successfully
- [ ] Data queries return expected results
- [ ] No errors in App Insights for 15 minutes post-rotation

---

*See also: `docs/runbooks/admin-ops.md` for operational commands.*
