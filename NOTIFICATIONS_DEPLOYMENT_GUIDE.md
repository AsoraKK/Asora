# Notifications Deployment Guide

Complete step-by-step guide to deploy the notifications subsystem.

---

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Node.js 20+ installed (for helper scripts)
- Firebase account with project created
- Access to Azure subscription with permissions to create resources
- Flutter development environment set up (for mobile app testing)

---

## Step 1: Firebase Configuration

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. **Important**: When prompted, **disable Google Analytics** (or skip Analytics setup)
4. Complete project creation

### 1.2 Add Android App

1. In Firebase Console → Project Settings → "Your apps"
2. Click "Add app" → Select Android
3. Enter package name: `com.asora.app` (or your package name from `android/app/build.gradle`)
4. Register app
5. Download `google-services.json`
6. Copy to `android/app/google-services.json` (NOT .example)

**Verify Analytics is disabled**:
```bash
# Check AndroidManifest.xml contains:
grep "firebase_analytics_collection_enabled" android/app/src/main/AndroidManifest.xml
# Should show: <meta-data android:name="firebase_analytics_collection_enabled" android:value="false" />
```

### 1.3 Add iOS App

1. In Firebase Console → Project Settings → "Your apps"
2. Click "Add app" → Select iOS
3. Enter Bundle ID: `com.asora.app` (or your bundle ID from `ios/Runner.xcodeproj`)
4. Register app
5. Download `GoogleService-Info.plist`
6. Copy to `ios/Runner/GoogleService-Info.plist` (NOT .example)

**Verify Analytics is disabled**:
```bash
# Check Info.plist contains:
grep -A1 "FirebaseAnalyticsCollectionEnabled" ios/Runner/Info.plist
# Should show: <key>FirebaseAnalyticsCollectionEnabled</key><false/>
```

### 1.4 Get FCM V1 Service Account JSON

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save JSON file securely (e.g., `firebase-service-account-dev.json`)
4. **DO NOT COMMIT THIS FILE TO GIT**

---

## Step 2: Azure Notification Hub Setup

### 2.1 Create Notification Hub

Run the setup script:

```bash
# For dev environment
./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus

# For staging
./scripts/setup-azure-notification-hub.sh staging rg-asora-staging eastus

# For production
./scripts/setup-azure-notification-hub.sh prod rg-asora-prod eastus
```

**Save the connection string** printed at the end (you'll need it for Step 3).

### 2.2 Configure FCM V1 Credentials

1. Azure Portal → Notification Hubs → Select your hub (e.g., `asora-notifications-dev`)
2. Settings → Google (FCM V1)
3. Click "Upload service account JSON"
4. Select the JSON file from Step 1.4
5. Save

**Verify**: Platform should show "Google (FCM V1)" with green checkmark.

### 2.3 Configure APNS Credentials (iOS)

**Option A: APNS Auth Key (Recommended)**
1. Apple Developer → Certificates, IDs & Profiles → Keys
2. Create new key with "Apple Push Notifications service (APNs)" enabled
3. Download `.p8` key file
4. Azure Portal → Notification Hub → Settings → Apple (APNS)
5. Select "Token" authentication
6. Upload `.p8` file
7. Enter Key ID, Team ID, Bundle ID
8. Save

**Option B: APNS Certificate**
1. Create APNs certificate via Keychain + Apple Developer
2. Export as `.p12` file
3. Azure Portal → Notification Hub → Settings → Apple (APNS)
4. Select "Certificate" authentication
5. Upload `.p12` file
6. Enter certificate password
7. Save

**Verify**: Platform should show "Apple (APNS)" with green checkmark.

---

## Step 3: Cosmos DB Containers

### 3.1 Create Containers

Run Azure CLI commands:

```bash
# Set variables
COSMOS_ACCOUNT="<your-cosmos-account>"
RESOURCE_GROUP="<your-resource-group>"
DATABASE_NAME="users"

# Create notification_events (30-day TTL)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$DATABASE_NAME" \
  --name notification_events \
  --partition-key-path /userId \
  --throughput 400 \
  --ttl 2592000

# Create notifications (30-day TTL)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$DATABASE_NAME" \
  --name notifications \
  --partition-key-path /userId \
  --throughput 400 \
  --ttl 2592000

# Create notification_preferences (no TTL)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$DATABASE_NAME" \
  --name notification_preferences \
  --partition-key-path /userId \
  --throughput 400

# Create device_tokens (no TTL, managed via revokedAt)
az cosmosdb sql container create \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --database-name "$DATABASE_NAME" \
  --name device_tokens \
  --partition-key-path /userId \
  --throughput 400
```

**Verify**: Azure Portal → Cosmos DB → Data Explorer → Should see 4 new containers.

---

## Step 4: Function App Environment Variables

### 4.1 Set Environment Variables

**Option A: Interactive Script**
```bash
./scripts/set-function-app-env-vars.sh asora-function-dev dev
# Follow prompts to enter connection strings
```

**Option B: Manual via Azure CLI**
```bash
FUNCTION_APP="asora-function-dev"
RESOURCE_GROUP="rg-asora-dev"

az functionapp config appsettings set \
  --name "$FUNCTION_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NOTIFICATION_HUB_CONNECTION_STRING="Endpoint=sb://..." \
    NOTIFICATION_HUB_NAME="asora-notifications-dev" \
    COSMOS_CONNECTION_STRING="AccountEndpoint=..." \
    COSMOS_DATABASE_NAME="users" \
    ENVIRONMENT="dev"
```

**Option C: Azure Portal**
1. Azure Portal → Function App → Configuration → Application settings
2. Click "+ New application setting" for each variable
3. Save

### 4.2 Verify Configuration

Check health endpoint:
```bash
curl https://asora-function-dev.azurewebsites.net/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "config": {
    "environment": "dev",
    "notifications": {
      "enabled": true,
      "hubName": "asora-notifications-dev",
      "hubConfigured": true
    },
    "cosmos": {
      "databaseName": "users",
      "configured": true
    }
  }
}
```

Check function app logs:
```bash
az functionapp log tail --name asora-function-dev --resource-group rg-asora-dev
```

Look for:
```
[CONFIG] Environment: dev
[CONFIG] Notification Hub: asora-notifications-dev
[CONFIG] Notifications Enabled: true
[CONFIG] Cosmos DB: users
```

---

## Step 5: Deploy Function App

### 5.1 Build Backend

```bash
cd functions
npm ci
npm run build
npm test  # Optional: Run tests first
```

### 5.2 Deploy (via GitHub Actions)

Push to main branch to trigger deployment workflow:
```bash
git add .
git commit -m "feat: notifications subsystem deployment"
git push origin main
```

**Or deploy manually** (if not using CI/CD):
```bash
cd functions
func azure functionapp publish asora-function-dev
```

### 5.3 Verify Deployment

Check timer-trigger is running:
```bash
az functionapp function show \
  --name asora-function-dev \
  --resource-group rg-asora-dev \
  --function-name processPendingNotifications
```

---

## Step 6: Flutter App Setup

### 6.1 Install Dependencies

```bash
flutter pub get
```

### 6.2 Configure Firebase

**Android**: Ensure `google-services.json` exists:
```bash
ls -la android/app/google-services.json
```

**iOS**: Ensure `GoogleService-Info.plist` exists:
```bash
ls -la ios/Runner/GoogleService-Info.plist
```

### 6.3 Update API Base URL

Edit `lib/core/network/dio_client.dart` (or equivalent):
```dart
final baseUrl = 'https://asora-function-dev.azurewebsites.net';
```

### 6.4 Build and Run

**Android**:
```bash
flutter run --release
```

**iOS**:
```bash
cd ios
pod install
cd ..
flutter run --release
```

### 6.5 Register Device Token

1. Launch app
2. Log in as test user
3. Grant notification permission when prompted
4. Check logs for: "Device token registered successfully"

**Verify in Cosmos**:
```bash
# Query device_tokens container
az cosmosdb sql query \
  --account-name "$COSMOS_ACCOUNT" \
  --database-name users \
  --container-name device_tokens \
  --query-text "SELECT * FROM c WHERE c.userId = '<your-user-id>'"
```

---

## Step 7: End-to-End Test

### 7.1 Set Cosmos Connection String

```bash
export COSMOS_CONNECTION_STRING="AccountEndpoint=..."
# Or retrieve it:
export COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)
```

### 7.2 Run E2E Test Script

```bash
./scripts/run-e2e-notification-test.sh <user-id> POST_LIKE
```

Example:
```bash
./scripts/run-e2e-notification-test.sh user-123 POST_LIKE
```

### 7.3 Monitor Execution

**Watch Function App Logs**:
```bash
az functionapp log tail --name asora-function-dev --resource-group rg-asora-dev
```

Look for:
```
[NotificationDispatcher] Processing batch of 1 events
[NotificationDispatcher] Event event-abc123: PENDING → PROCESSING
[Push] Sent FCM notification to 1 devices
[NotificationDispatcher] Event event-abc123: PROCESSING → COMPLETED
```

**Check Notification Hub Metrics**:
1. Azure Portal → Notification Hub → Monitoring → Metrics
2. Select metric: "Successful Sends"
3. Time range: Last 1 hour
4. Should see +1 send

**Check Device Push Notification**:
- Android: Should appear in notification tray
- iOS: Should appear in notification center

**Check In-App Notification**:
1. Open Flutter app
2. Navigate to Notifications screen
3. Should see new notification with title/body
4. Test swipe actions (mark read, dismiss)

---

## Step 8: Troubleshooting

### Issue: Event stays PENDING

**Check**: Timer-trigger logs
```bash
az functionapp log tail --name asora-function-dev --resource-group rg-asora-dev | grep processPendingNotifications
```

**Common causes**:
- Timer-trigger not deployed correctly
- Cosmos connection string invalid
- Event query fails (check partition key)

**Fix**:
```bash
# Redeploy function app
cd functions && func azure functionapp publish asora-function-dev
```

---

### Issue: Event status = FAILED

**Check**: Event document's `lastError` field
```bash
az cosmosdb sql query \
  --account-name "$COSMOS_ACCOUNT" \
  --database-name users \
  --container-name notification_events \
  --query-text "SELECT c.id, c.status, c.lastError FROM c WHERE c.userId = '<user-id>'"
```

**Common errors**:
- "No device tokens found": User has no registered devices (check `device_tokens` container)
- "Notification Hub error": Check `NOTIFICATION_HUB_CONNECTION_STRING` is valid
- "User preferences not found": Create default preferences for user

---

### Issue: Push not received on device

**Check**:
1. Device token exists in Cosmos `device_tokens` container
2. Push token is valid (not revoked)
3. Notification Hub credentials configured (FCM V1, APNS)
4. Device has network connectivity
5. App has notification permission granted

**Verify Notification Hub send**:
```bash
# Check Notification Hub metrics (Azure Portal)
# Metric: "Failed Sends" should be 0
```

**Test push directly** (bypass backend):
1. Azure Portal → Notification Hub → Test Send
2. Select platform (Android/iOS)
3. Enter device token (from Cosmos `device_tokens.pushToken`)
4. Send test notification

---

### Issue: In-app notification missing

**Check**: Cosmos `notifications` container
```bash
az cosmosdb sql query \
  --account-name "$COSMOS_ACCOUNT" \
  --database-name users \
  --container-name notifications \
  --query-text "SELECT * FROM c WHERE c.userId = '<user-id>' ORDER BY c.createdAt DESC"
```

**Common causes**:
- Event processing failed before creating notification
- User ID mismatch (check event `userId` vs device token `userId`)

---

## Step 9: Production Readiness

### 9.1 Security Checklist

- [ ] Firebase config files NOT committed to git (`.gitignore` entries exist)
- [ ] Notification Hub connection strings stored in Azure Key Vault
- [ ] Cosmos connection string stored in Key Vault
- [ ] Function App uses managed identity (not connection strings)
- [ ] HTTPS enforced on all API endpoints
- [ ] JWT authentication verified on all notification endpoints

### 9.2 Monitoring Checklist

- [ ] Application Insights enabled on Function App
- [ ] Custom telemetry events added (`notification_event_enqueued`, `push_sent`)
- [ ] Alerts configured for failed pushes (> 5% failure rate)
- [ ] Alerts configured for timer-trigger failures
- [ ] Cosmos DB metrics monitored (RU consumption, throttling)

### 9.3 Performance Checklist

- [ ] Cosmos DB throughput appropriate for load (400 RU/s dev, autoscale prod)
- [ ] Timer-trigger batch size tuned (100 events/minute default)
- [ ] Device token cleanup job scheduled (revoke inactive devices > 90 days)
- [ ] Notification TTL verified (30 days auto-expire)

### 9.4 Privacy Checklist

- [ ] Firebase Analytics explicitly disabled (verified in app logs)
- [ ] Privacy policy updated with push notification section
- [ ] GDPR export includes device tokens and preferences
- [ ] GDPR deletion removes all notification data
- [ ] User consent flow tested (permission prompt, category toggles)

---

## Step 10: Multi-Environment Setup

Repeat Steps 1-7 for each environment:

| Environment | Firebase Project | Notification Hub | Function App |
|-------------|------------------|------------------|--------------|
| **Dev** | `asora-dev` | `asora-notifications-dev` | `asora-function-dev` |
| **Staging** | `asora-staging` | `asora-notifications-staging` | `asora-function-staging` |
| **Production** | `asora-prod` | `asora-notifications-prod` | `asora-function-prod` |

**Firebase projects must be separate** to ensure token isolation (dev tokens won't work in prod).

**Use GitHub Secrets** for environment-specific variables:
```yaml
# .github/workflows/deploy-notifications.yml
env:
  NOTIFICATION_HUB_CONNECTION_STRING: ${{ secrets.NOTIF_HUB_CONN_DEV }}
  NOTIFICATION_HUB_NAME: asora-notifications-dev
```

---

## Support & Resources

- **Architecture**: `docs/ADR_001_ADDENDUM_PUSH_NOTIFICATIONS_PRIVACY.md`
- **Backend Docs**: `NOTIFICATIONS_BACKEND_COMPLETE.md`
- **Frontend Docs**: `NOTIFICATIONS_FRONTEND_COMPLETE.md`
- **Cosmos Schema**: `docs/notifications_cosmos_schema.md`
- **Firebase Setup**: `docs/firebase_fcm_setup.md`
- **E2E Testing**: `NOTIFICATIONS_SUBSYSTEM_COMPLETE.md` → "E2E Testing (Manual)"

**Need Help?**
- Check Function App logs: `az functionapp log tail`
- Check Notification Hub metrics: Azure Portal → Monitoring
- Run health check: `curl https://<function-app>.azurewebsites.net/api/health`
- Verify Cosmos containers: Azure Portal → Data Explorer

---

**Last Updated**: January 15, 2025  
**Version**: 1.0  
**Maintained By**: Backend Team
