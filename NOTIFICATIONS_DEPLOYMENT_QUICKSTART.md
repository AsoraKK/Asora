# Notifications Deployment - Quick Start

**TL;DR**: Follow these steps in order. Full details in `NOTIFICATIONS_DEPLOYMENT_GUIDE.md`.

---

## ☑️ Pre-Deployment Checklist

- [ ] Azure CLI installed and logged in (`az login`)
- [ ] Node.js 20+ installed
- [ ] Firebase account created
- [ ] Access to Azure subscription
- [ ] Cosmos DB account exists
- [ ] Function App deployed

---

## 🚀 Deployment Steps

### 1. Firebase Configuration (10 minutes)

```bash
# Create Firebase project (if needed)
# https://console.firebase.google.com/

# Download config files:
# - Android: google-services.json → android/app/
# - iOS: GoogleService-Info.plist → ios/Runner/
# - Service account JSON (save securely, don't commit)

# Verify Analytics disabled
grep "firebase_analytics_collection_enabled" android/app/src/main/AndroidManifest.xml
grep "FirebaseAnalyticsCollectionEnabled" ios/Runner/Info.plist
```

**Templates created**:
- `android/app/google-services.json.example`
- `ios/Runner/GoogleService-Info.plist.example`

---

### 2. Azure Notification Hub (5 minutes)

```bash
# Create hub for dev environment
./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus

# Save the connection string printed at the end!
```

**Then configure credentials in Azure Portal**:
1. Notification Hub → Settings → Google (FCM V1)
2. Upload Firebase service account JSON
3. Notification Hub → Settings → Apple (APNS)
4. Upload APNs key/certificate

---

### 3. Cosmos DB Containers (2 minutes)

```bash
COSMOS_ACCOUNT="<your-cosmos-account>"
RESOURCE_GROUP="<your-rg>"
DATABASE_NAME="users"

# Run all 4 container creation commands from deployment guide
# Or use Azure Portal → Data Explorer → New Container (repeat 4 times)
```

**Containers**: notification_events, notifications, notification_preferences, device_tokens

---

### 4. Function App Environment Variables (3 minutes)

```bash
# Interactive script
./scripts/set-function-app-env-vars.sh asora-function-dev dev

# Or manual:
az functionapp config appsettings set \
  --name asora-function-dev \
  --resource-group rg-asora-dev \
  --settings \
    NOTIFICATION_HUB_CONNECTION_STRING="..." \
    NOTIFICATION_HUB_NAME="asora-notifications-dev" \
    COSMOS_CONNECTION_STRING="..." \
    COSMOS_DATABASE_NAME="users" \
    ENVIRONMENT="dev"
```

**Verify**: `curl https://asora-function-dev.azurewebsites.net/api/health`

---

### 5. Deploy Backend (5 minutes)

```bash
cd functions
npm ci
npm run build
npm test  # Optional

# Deploy via GitHub Actions (push to main)
git push origin main

# Or deploy manually
func azure functionapp publish asora-function-dev
```

---

### 6. Flutter App Setup (5 minutes)

```bash
# Ensure Firebase config files exist
ls android/app/google-services.json
ls ios/Runner/GoogleService-Info.plist

flutter pub get
flutter run --release

# Log in, grant notification permission
# Check logs: "Device token registered successfully"
```

---

### 7. E2E Test (2 minutes)

```bash
# Set Cosmos connection string
export COSMOS_CONNECTION_STRING="..."

# Run test
./scripts/run-e2e-notification-test.sh user-123 POST_LIKE

# Wait 90 seconds for processing
# Check push notification on device
# Check in-app notifications list
```

---

## ✅ Verification Steps

### Health Check
```bash
curl https://asora-function-dev.azurewebsites.net/api/health
# Should return: {"status": "healthy", "config": {...}}
```

### Function Logs
```bash
az functionapp log tail --name asora-function-dev --resource-group rg-asora-dev
# Look for: [CONFIG] Notifications Enabled: true
```

### Device Token Registration
```bash
# Query Cosmos device_tokens container
az cosmosdb sql query \
  --account-name <cosmos> \
  --database-name users \
  --container-name device_tokens \
  --query-text "SELECT * FROM c WHERE c.userId = '<user-id>'"
```

### Notification Hub Metrics
Azure Portal → Notification Hub → Monitoring → Metrics → "Successful Sends"

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| **Health check returns 503** | Check env vars are set: `COSMOS_CONNECTION_STRING`, `NOTIFICATION_HUB_CONNECTION_STRING` |
| **Event stays PENDING** | Check timer-trigger logs, verify Cosmos connection |
| **Push not received** | Verify device token in Cosmos, check Notification Hub credentials (FCM/APNS) |
| **In-app notification missing** | Check Cosmos `notifications` container, verify event processed successfully |
| **"No device tokens found"** | Register device by opening app and granting permission |

---

## 📚 Full Documentation

- **Complete Guide**: `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` (10 detailed steps)
- **Architecture**: `docs/ADR_001_ADDENDUM_PUSH_NOTIFICATIONS_PRIVACY.md`
- **Backend**: `NOTIFICATIONS_BACKEND_COMPLETE.md`
- **E2E Testing**: `NOTIFICATIONS_SUBSYSTEM_COMPLETE.md` → Testing Guide
- **Cosmos Schema**: `docs/notifications_cosmos_schema.md`

---

## 🎯 Next Steps After Deployment

1. **Test all event types**: POST_LIKE, POST_COMMENT, SECURITY_NEW_DEVICE, etc.
2. **Test quiet hours**: Set quiet hours, verify notifications blocked during those times
3. **Test 3-device cap**: Register 4th device, verify oldest device auto-revoked
4. **Test category toggles**: Disable social notifications, verify only security/safety come through
5. **Load test**: Enqueue 100 events, verify timer-trigger handles batch correctly

---

## 🔐 Security Reminders

- ❌ **DO NOT** commit Firebase config files to git (`.gitignore` entries added)
- ❌ **DO NOT** hardcode connection strings in code
- ✅ **DO** store secrets in Azure Key Vault
- ✅ **DO** use managed identity for production
- ✅ **DO** verify Firebase Analytics is disabled

---

**Deployment Time**: ~30 minutes for first environment  
**Support**: Check function logs, Notification Hub metrics, Cosmos Data Explorer  
**Questions**: See full deployment guide or ADR privacy addendum
