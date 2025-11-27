# Notifications Deployment Checklist

## Quick Reference for Completing Firebase + Azure Setup

Use this checklist to track progress through the deployment steps outlined in `NOTIFICATIONS_DEPLOYMENT_GUIDE.md`.

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

## ⏳ Phase 3: Azure Notification Hub Setup (PENDING)

### Development Environment
- [ ] Ensure Azure CLI logged in: `az login`
- [ ] Create notification hub: `./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus`
- [ ] Save connection string from output
- [ ] Configure FCM credentials in Azure Portal:
  - [ ] Upload Firebase service account JSON (from Firebase Console → Service Accounts)
- [ ] Configure APNs credentials in Azure Portal:
  - [ ] Upload APNs key (.p8) OR certificate (.p12)

### Production Environment (Later)
- [ ] Create notification hub: `./scripts/setup-azure-notification-hub.sh prod rg-asora-prod eastus`
- [ ] Save connection string
- [ ] Configure FCM credentials
- [ ] Configure APNs credentials (production certificate)

**Next Action**: Run `./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus`

---

## ⏳ Phase 4: Function App Configuration (PENDING)

### Environment Variables
- [ ] Run interactive setup: `./scripts/set-function-app-env-vars.sh asora-function-dev dev`
- [ ] Enter when prompted:
  - [ ] `NOTIFICATION_HUB_CONNECTION_STRING` (from Phase 3)
  - [ ] `NOTIFICATION_HUB_NAME` (e.g., `asora-notifications-dev`)
  - [ ] `COSMOS_CONNECTION_STRING` (existing value)
  - [ ] `COSMOS_DATABASE_NAME` (`users`)
- [ ] Verify settings: `az functionapp config appsettings list -g rg-asora-dev -n asora-function-dev --query "[?name=='NOTIFICATION_HUB_NAME']"`

**Next Action**: Run `./scripts/set-function-app-env-vars.sh asora-function-dev dev`

---

## ⏳ Phase 5: Cosmos DB Containers (PENDING)

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

## ⏳ Phase 6: End-to-End Test (PENDING)

### Test Notification Pipeline
- [ ] Export Cosmos connection string: `export COSMOS_CONNECTION_STRING="..."`
- [ ] Run test script: `./scripts/run-e2e-notification-test.sh user-123 POST_LIKE`
- [ ] Wait 60-90 seconds
- [ ] Verify push notification on device:
  - [ ] Android device receives notification
  - [ ] iOS device receives notification (if configured)
- [ ] Check Function App logs: `az monitor activity-log list --resource-group rg-asora-dev`

### Troubleshooting Failed Tests
- [ ] Verify Function App logs: `scripts/diagnostics-v4.sh logs asora-function-dev`
- [ ] Check Cosmos DB for event: Query `notification_events` container
- [ ] Verify device token exists: Query `user_device_tokens` container
- [ ] Test direct notification hub send (see `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` Step 9)

**Next Action**: Run `./scripts/run-e2e-notification-test.sh user-123 POST_LIKE`

---

## 📋 Current Status Summary

### Completed ✅
- Android Firebase SDK configured
- Android `google-services.json` placed
- Firebase Analytics disabled (manifest)
- Deployment automation scripts created
- Comprehensive documentation written

### Pending ⏳
- iOS Firebase configuration
- Build verification (Android + iOS)
- Azure Notification Hub creation
- Function App environment variables
- Cosmos DB containers
- End-to-end test

### Blocked 🚫
- **iOS config download** (requires manual Firebase Console access)
- **Azure resources** (requires Azure CLI login, already logged in ✅)

---

## Time Estimates

| Phase | Estimated Time | Prerequisites |
|-------|----------------|---------------|
| iOS Firebase Setup | 10 min | Firebase Console access, Apple Developer account |
| Build Verification | 5 min | Flutter SDK, Android Studio/Xcode |
| Azure Hub Creation | 10 min | Azure CLI logged in ✅ |
| Function App Config | 5 min | Hub connection string |
| Cosmos Containers | 5 min | Azure Portal access |
| E2E Test | 5 min | All previous steps complete |
| **Total** | **40 min** | Assumes no blockers |

---

## Priority Order

1. **CRITICAL** (Blocks Everything):
   - [ ] Download iOS `GoogleService-Info.plist` from Firebase Console

2. **HIGH** (Validates Config):
   - [ ] Test Android build (`flutter build apk`)
   - [ ] Create Azure Notification Hub

3. **MEDIUM** (Deployment):
   - [ ] Set Function App environment variables
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

- **Android Setup**: `docs/firebase_fcm_setup.md` (section 1-4)
- **iOS Setup**: `docs/firebase_ios_setup.md` (complete guide)
- **Azure Deployment**: `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` (10-step guide)
- **Quick Start**: `NOTIFICATIONS_DEPLOYMENT_QUICKSTART.md` (TL;DR version)
- **Privacy Analysis**: `docs/ADR_001_ADDENDUM_PUSH_NOTIFICATIONS_PRIVACY.md`
- **Cosmos Schema**: `docs/notifications_cosmos_schema.md`
- **Feature Complete**: `NOTIFICATIONS_SUBSYSTEM_COMPLETE.md` (backend implementation)

---

## Next Immediate Action

**What to do right now**:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `asora-dev`
3. Project Settings → Add app → iOS
4. Bundle ID: `com.asora.app`
5. Download `GoogleService-Info.plist`
6. Run: `cp ~/Downloads/GoogleService-Info.plist ios/Runner/GoogleService-Info.plist`

**Then run**:
```bash
cd /home/kylee/asora
flutter clean && flutter pub get && flutter build apk --debug
```

**If build succeeds**, proceed to Azure Notification Hub setup:
```bash
./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus
```

---

## Help & Support

- For Android build issues: See `docs/firebase_fcm_setup.md` → Troubleshooting
- For iOS build issues: See `docs/firebase_ios_setup.md` → Troubleshooting
- For Azure deployment issues: See `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` → Step 9 (Troubleshooting)
- For E2E test failures: See `NOTIFICATIONS_DEPLOYMENT_GUIDE.md` → Step 8
- For runtime errors: Run `./scripts/diagnostics-v4.sh logs asora-function-dev`
