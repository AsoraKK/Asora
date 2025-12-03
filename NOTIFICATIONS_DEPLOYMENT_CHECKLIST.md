# Notifications Deployment Checklist

## Quick Reference for Completing Firebase + FCM HTTP v1 Setup

Use this checklist to track progress through the deployment steps outlined in `NOTIFICATIONS_DEPLOYMENT_GUIDE.md`.

> **Note**: As of December 2025, we use direct FCM HTTP v1 API instead of Azure Notification Hubs.
> See `FCM_MIGRATION_COMPLETE.md` for details.

---

## ✅ Phase 1: Firebase Configuration (COMPLETED)

### Android Setup
- [x] Created Firebase project: `asora-dev`
- [x] Added Android app with package: `com.asora.app`
- [x] Downloaded `google-services.json`
- [x] Placed file in `android/app/google-services.json`
- [x] Updated `android/build.gradle.kts` (root) with Google services plugin
- [x] Updated `android/app/build.gradle.kts` with Firebase dependencies
- [x] Disabled Firebase Analytics in `AndroidManifest.xml`
- [x] Verified file exists: `ls -l android/app/google-services.json` (662 bytes)

### iOS Setup
- [ ] Add iOS app to Firebase Console (`com.asora.app`)
- [ ] Download `GoogleService-Info.plist`
- [ ] Place file in `ios/Runner/GoogleService-Info.plist`
- [ ] Add Analytics disable to `ios/Runner/Info.plist`
- [ ] Create APNs key/certificate in Apple Developer Portal
- [ ] Upload APNs credentials to Firebase Console
- [ ] Test iOS build: `flutter build ios --debug`

### Firebase Service Account (for FCM HTTP v1)
- [ ] Firebase Console → Project Settings → Service Accounts
- [ ] Generate new private key (download JSON)
- [ ] Extract `project_id` → `FCM_PROJECT_ID`
- [ ] Extract `client_email` → `FCM_CLIENT_EMAIL`
- [ ] Extract `private_key` → `FCM_PRIVATE_KEY`

**Next Action**: Download iOS config from [Firebase Console](https://console.firebase.google.com/) → asora-dev → Add iOS app

---

## 🔄 Phase 2: Build Verification (PENDING)

### Android Build Test
- [ ] Clean build cache: `flutter clean`
- [ ] Fetch dependencies: `flutter pub get`
- [ ] Build APK: `flutter build apk --debug`
- [ ] Verify Firebase initialization logs in output
- [ ] Check google-services.json processing logs

### iOS Build Test (macOS only)
- [ ] Clean build cache: `flutter clean`
- [ ] Build iOS: `flutter build ios --debug`
- [ ] Verify Firebase initialization logs
- [ ] Check for APNs entitlement in Xcode

**Next Action**: Run `flutter clean && flutter pub get && flutter build apk --debug`

---

## ⏳ Phase 3: Function App Configuration (PENDING)

### FCM Environment Variables
- [ ] Set FCM credentials in Function App:
  ```bash
  az functionapp config appsettings set \
    --name asora-function-dev \
    --resource-group rg-asora-dev \
    --settings \
      FCM_PROJECT_ID="asora-dev" \
      FCM_CLIENT_EMAIL="firebase-adminsdk-xxxxx@asora-dev.iam.gserviceaccount.com" \
      FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
  ```
- [ ] Verify settings: 
  ```bash
  az functionapp config appsettings list -g rg-asora-dev -n asora-function-dev --query "[?name=='FCM_PROJECT_ID']"
  ```
- [ ] Verify health endpoint shows FCM configured

**Next Action**: Run the `az functionapp config appsettings set` command with your Firebase service account credentials

---

## ⏳ Phase 4: Cosmos DB Containers (PENDING)

### Create Notification Containers
- [ ] `user_device_tokens` (Partition key: `/userId`)
- [ ] `notification_events` (Partition key: `/userId`)
- [ ] `notification_history` (Partition key: `/userId`)
- [ ] `notification_preferences` (Partition key: `/userId`)

**Commands**:
```bash
# Via Azure CLI (if Cosmos exists)
az cosmosdb sql container create \
  --account-name asora-cosmos-dev \
  --database-name users \
  --name user_device_tokens \
  --partition-key-path /userId \
  --throughput 400

# Repeat for other 3 containers
```

**Or**: Azure Portal → Cosmos DB → Data Explorer → New Container (4 times)

**Next Action**: Create containers using Azure Portal or CLI commands

---

## ⏳ Phase 5: End-to-End Test (PENDING)

### Test Notification Pipeline
- [ ] Export Cosmos connection string: `export COSMOS_CONNECTION_STRING="..."`
- [ ] Run test script: `./scripts/run-e2e-notification-test.sh user-123 POST_LIKE`
- [ ] Wait 60-90 seconds
- [ ] Verify push notification on device:
  - [ ] Android device receives notification
  - [ ] iOS device receives notification (if configured)
- [ ] Check Function App logs for `[FCM] Push sent successfully`

### Troubleshooting Failed Tests
- [ ] Verify Function App logs: `scripts/diagnostics-v4.sh logs asora-function-dev`
- [ ] Check Cosmos DB for event: Query `notification_events` container
- [ ] Verify device token exists: Query `user_device_tokens` container
- [ ] Check for FCM configuration errors in logs

**Next Action**: Run `./scripts/run-e2e-notification-test.sh user-123 POST_LIKE`

---

## 📋 Current Status Summary

### Completed ✅
- Android Firebase SDK configured
- Android `google-services.json` placed
- Firebase Analytics disabled (manifest)
- FCM HTTP v1 client implemented (replaces Azure Notification Hubs)
- Deployment automation scripts created
- Comprehensive documentation written
- All tests pass (798 tests)

### Pending ⏳
- iOS Firebase configuration
- Build verification (Android + iOS)
- Function App FCM environment variables
- Cosmos DB containers
- End-to-end test

### No Longer Required ❌
- ~~Azure Notification Hub creation~~ (replaced by direct FCM)
- ~~Notification Hub connection string~~ (replaced by FCM credentials)
- ~~Notification Hub credential configuration~~ (replaced by FCM service account)

---

## Time Estimates

| Phase | Estimated Time | Prerequisites |
|-------|----------------|---------------|
| iOS Firebase Setup | 10 min | Firebase Console access, Apple Developer account |
| Build Verification | 5 min | Flutter SDK, Android Studio/Xcode |
| FCM Credentials Setup | 3 min | Firebase service account JSON |
| Cosmos Containers | 5 min | Azure Portal access |
| E2E Test | 5 min | All previous steps complete |
| **Total** | **28 min** | Assumes no blockers |

---

## Priority Order

1. **CRITICAL** (Blocks Everything):
   - [ ] Download iOS `GoogleService-Info.plist` from Firebase Console
   - [ ] Generate Firebase service account JSON for FCM

2. **HIGH** (Validates Config):
   - [ ] Test Android build (`flutter build apk`)
   - [ ] Set FCM environment variables in Function App

3. **MEDIUM** (Deployment):
   - [ ] Create Cosmos DB containers

4. **LOW** (Validation):
   - [ ] Run E2E test
   - [ ] Test on physical devices

---

## Useful Commands

### Quick Status Checks
```bash
# Verify Android config exists
ls -l android/app/google-services.json

# Verify iOS config exists
ls -l ios/Runner/GoogleService-Info.plist

# Check Azure CLI login
az account show

# List Function Apps in resource group
az functionapp list -g rg-asora-dev --query "[].name" -o table

# Check Cosmos DB databases
az cosmosdb sql database list --account-name asora-cosmos-dev --query "[].id" -o table

# Verify FCM configuration
curl https://asora-function-dev.azurewebsites.net/api/health | jq '.fcmConfigured'
```

### Debug Commands
```bash
# View Function App logs
./scripts/diagnostics-v4.sh logs asora-function-dev

# Check Function App settings
az functionapp config appsettings list -g rg-asora-dev -n asora-function-dev -o table

# Test Cosmos DB connection
az cosmosdb show --name asora-cosmos-dev -g rg-asora-dev --query "documentEndpoint"
```

---

## Documentation References

- **FCM Migration**: `FCM_MIGRATION_COMPLETE.md` (migration from Notification Hubs)
- **Android Setup**: `docs/firebase_fcm_setup.md` (section 1-4)
- **iOS Setup**: `docs/firebase_ios_setup.md` (complete guide)
- **Azure Deployment**: `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` (deployment guide)
- **Quick Start**: `NOTIFICATIONS_DEPLOYMENT_QUICKSTART.md` (TL;DR version)
- **Privacy Analysis**: `docs/ADR_001_ADDENDUM_PUSH_NOTIFICATIONS_PRIVACY.md`
- **Cosmos Schema**: `docs/notifications_cosmos_schema.md`
- **Feature Complete**: `NOTIFICATIONS_SUBSYSTEM_COMPLETE.md` (backend implementation)

---

## Next Immediate Action

**What to do right now**:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `asora-dev`
3. **For iOS**: Project Settings → Add app → iOS → Bundle ID: `com.asora.app` → Download `GoogleService-Info.plist`
4. **For FCM**: Project Settings → Service Accounts → Generate new private key

**Then run**:
```bash
cd /home/kylee/asora
flutter clean && flutter pub get && flutter build apk --debug
```

**If build succeeds**, set FCM environment variables:
```bash
az functionapp config appsettings set \
  --name asora-function-dev \
  --resource-group rg-asora-dev \
  --settings \
    FCM_PROJECT_ID="asora-dev" \
    FCM_CLIENT_EMAIL="<from-service-account-json>" \
    FCM_PRIVATE_KEY="<from-service-account-json>"
```

---

## Help & Support

- For Android build issues: See `docs/firebase_fcm_setup.md` → Troubleshooting
- For iOS build issues: See `docs/firebase_ios_setup.md` → Troubleshooting
- For FCM configuration issues: See `FCM_MIGRATION_COMPLETE.md`
- For E2E test failures: See `NOTIFICATIONS_DEPLOYMENT_GUIDE.md`
- For runtime errors: Run `./scripts/diagnostics-v4.sh logs asora-function-dev`
