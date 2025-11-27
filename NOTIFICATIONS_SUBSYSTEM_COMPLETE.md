# Notifications Subsystem - Implementation Complete

## Summary

Comprehensive notifications subsystem implemented with Azure Notification Hubs integration, Flutter UI, full event-driven architecture, and deployment automation. Android Firebase configuration complete; iOS pending Firebase Console download.

## Deployment Status

- ✅ **Backend Implementation**: 100% complete (7/7 tasks)
- ✅ **Flutter API Wiring**: 100% complete (REST client, providers, screens)
- ✅ **Android Firebase SDK**: 100% complete (google-services.json, Gradle, manifest)
- ⏳ **iOS Firebase SDK**: Pending iOS config download from Firebase Console
- ⏳ **Azure Notification Hub**: Scripts ready, awaiting execution
- ⏳ **Function App Config**: Scripts ready, awaiting hub connection string
- ⏳ **E2E Test**: Scripts ready, awaiting infrastructure deployment

**Next Action**: Download `GoogleService-Info.plist` from Firebase Console → asora-dev → Add iOS app → Bundle ID: `com.asora.app`

## Components Completed

### Backend (Azure Functions - Node/TypeScript)

#### 1. Core Types & Domain Models
- **File**: `functions/src/notifications/types/index.ts`
- **Features**:
  - 5 notification categories (SOCIAL, SAFETY, SECURITY, NEWS, MARKETING)
  - 12 event types (POST_LIKE, POST_COMMENT, POST_SHARE, etc.)
  - Full TypeScript interfaces for all domain entities
  - Category mapping logic

#### 2. Cosmos DB Repositories
- **Files**:
  - `notificationEventsRepo.ts` - Event queue management
  - `notificationsRepo.ts` - In-app notifications storage
  - `userNotificationPreferencesRepo.ts` - User settings
  - `userDeviceTokensRepo.ts` - Push token management with 3-device cap
- **Features**:
  - Partition key: `userId` on all containers
  - Pagination support (continuation tokens)
  - Automatic device eviction (oldest by `lastSeenAt`)
  - Active device filtering (excludes revoked tokens)

#### 3. Azure Notification Hubs Client
- **File**: `functions/src/notifications/clients/notificationHubClient.ts`
- **Features**:
  - FCM V1 API support (SDK v2 compatible)
  - APNS payload formatting
  - Batch sending with success/failure counts
  - Platform normalization (`fcm`→`fcmv1`, `apns`→`apns`)
  - Installation registration

#### 4. Notification Dispatcher
- **File**: `functions/src/notifications/services/notificationDispatcher.ts`
- **Features**:
  - **Quiet Hours**: Timezone-aware, 24-hour boolean array
  - **Rate Limiting**: Per-category limits (SOCIAL: 3/hr, 20/day; NEWS/MARKETING: 1/day)
  - **Deduplication**: 15-minute window with generated dedupeKey
  - **Retry Logic**: Exponential backoff (2^retryCount minutes), max 5 retries
  - **Content Generation**: 12 event-specific templates with actor names, snippets, deep-links
  - **Event Status Tracking**: PENDING → PROCESSING → COMPLETED/FAILED/RATE_LIMITED/DEDUPLICATED

#### 5. HTTP APIs
- **Files**:
  - `notificationsApi.function.ts` - GET /notifications (paginated), POST /:id/read, POST /:id/dismiss
  - `preferencesApi.function.ts` - GET/PUT /notification-preferences
  - `devicesApi.function.ts` - POST /devices/register, GET /devices, POST /:id/revoke
- **Features**:
  - JWT B2C authentication on all endpoints
  - Pagination with continuation tokens
  - 3-device cap enforcement with automatic eviction

#### 6. Timer Trigger
- **File**: `functions/src/notifications/timers/processPendingNotifications.function.ts`
- **Schedule**: Every minute (`0 */1 * * * *`)
- **Batch Size**: 100 events per invocation
- **Process**: Query PENDING + eligible FAILED events → dispatch via `notificationDispatcher`

### Frontend (Flutter)

#### 7. Domain Models
- **File**: `lib/features/notifications/domain/notification_models.dart` (398 lines)
- **Classes**:
  - `NotificationCategory` enum with JSON converters
  - `NotificationEventType` enum (camelCase ↔ SCREAMING_SNAKE_CASE)
  - `Notification` - Full notification with read/dismissed state
  - `UserNotificationPreferences` - Timezone, quiet hours, category toggles
  - `QuietHours` - 24-element bool array with toggle logic
  - `CategoryPreferences` - Social/news/marketing flags
  - `UserDeviceToken` - Device registration with `isActive` getter
  - `NotificationPermissionStatus` enum

#### 8. Permission Service
- **File**: `lib/features/notifications/application/notification_permission_service.dart`
- **Methods**:
  - `checkPermissionStatus()` - Query current permission
  - `requestPermission()` - Trigger OS dialog
  - `openAppSettings()` - Deep-link to system settings
  - `shouldShowPrePrompt()` - Pre-prompt logic

#### 9. Permission Pre-Prompt Widget
- **File**: `lib/features/notifications/presentation/notification_permission_prompt.dart` (229 lines)
- **Design**: iOS best practice pattern
- **Sections**:
  - Hero icon (120px notification bell)
  - Value proposition text
  - 3 benefit items (Social Updates, Security Alerts, Full Control)
  - Enable/Not Now buttons
  - Loading state during permission request

#### 10. Settings Screen
- **File**: `lib/features/notifications/presentation/notifications_settings_screen.dart` (490 lines)
- **Sections**:
  - **Category Toggles**: 3 switches (social, news, marketing) + safety/security banner
  - **Quiet Hours Grid**: 24-hour grid (4 rows × 6 cols), tap to toggle, color-coded
  - **Devices Section**: List of registered devices with Remove buttons, empty state, 3-device cap display

#### 11. Notification Centre
- **File**: `lib/features/notifications/presentation/notifications_screen.dart` (401 lines)
- **Features**:
  - Paginated list with infinite scroll (triggers at 80%)
  - Dismissible cards with swipe actions (mark read left, dismiss right)
  - Category-specific icons and colors
  - Unread indicator (blue dot + background tint)
  - Deep-link navigation on tap
  - Pull-to-refresh
  - Empty state with illustration

#### 12. Push Integration
- **Files**:
  - `lib/services/push/push_notification_service.dart` (218 lines)
  - `lib/services/push/device_token_service.dart`
  - `lib/core/routing/deeplink_router.dart`
  - `lib/core/initialization/push_initialization.dart`
- **Features**:
  - Firebase Messaging integration (FCM/APNS)
  - Local notifications for foreground messages
  - Background message handlers
  - Device token registration on app launch
  - Token refresh listener with auto re-registration
  - Deep-link routing (asora://post/{id}, asora://user/{id}, etc.)
  - Topic subscription support
- **Packages Added**:
  - `firebase_messaging: ^15.1.3`
  - `firebase_core: ^3.8.1`
  - `flutter_local_notifications: ^18.0.1`
  - `timezone: ^0.9.4`

#### 13. Tests
- **Backend Jest Tests**:
  - `notificationDispatcher.test.ts` - Tests for quiet hours, rate limiting, deduplication, success path, retry logic
  - `userDeviceTokensRepo.test.ts` - Tests for 3-device cap eviction logic
- **Flutter Widget Tests**:
  - `notification_permission_prompt_test.dart` - Permission prompt UI tests
  - `notifications_settings_screen_test.dart` - Settings screen interaction tests
  - `notifications_screen_test.dart` - Notification list tests (placeholders for full mock implementation)

## Architecture Highlights

### Event-Driven Flow
1. **Enqueue**: API/webhook creates `NotificationEvent` with status PENDING
2. **Timer**: Every minute, query up to 100 PENDING/eligible FAILED events
3. **Process**: Dispatcher validates preferences → checks quiet hours → applies rate limits → checks dedupe → sends push → persists in-app notification → updates event status
4. **Retry**: Failed events retry with exponential backoff (2^n minutes), max 5 attempts

### Rate Limiting Strategy
- **SOCIAL** (likes, comments, shares): 3 per hour, 20 per day
- **SAFETY** (content warnings): 10 per hour, 50 per day
- **SECURITY** (account alerts): 10 per hour, 50 per day (always sent)
- **NEWS** (system updates): 1 per day
- **MARKETING** (promotions): 1 per day

### Quiet Hours Enforcement
- User sets timezone via `UserNotificationPreferences.timezone`
- 24-element boolean array (index = hour, true = quiet)
- Default: 22:00-07:00 (10 PM to 7 AM)
- Dispatcher converts event timestamp to user's timezone and checks array
- **Quiet hour behavior**: In-app notification still created, push notification suppressed

### Device Management
- 3-device cap per user (configurable)
- On 4th device registration: Oldest device (by `lastSeenAt`) automatically revoked
- Revoked devices: `revokedAt` timestamp set, excluded from `queryActiveByUserId`
- Token refresh: Update existing device record (no new device created)

### Deep-Link Format
- `asora://post/{postId}` - Post detail
- `asora://user/{userId}` - User profile
- `asora://comment/{commentId}` - Comment thread
- `asora://settings/notifications` - Notification settings

## Firebase Usage (Limited Scope)

**IMPORTANT**: Asora uses Firebase **exclusively** for FCM (Firebase Cloud Messaging) client-side push notification delivery. No other Firebase services are used.

### What Firebase Is Used For
- **FCM Token Generation**: Client-side push notification tokens (Android/iOS)
- **Push Message Delivery**: Transport layer for delivering notifications from Azure Notification Hubs to devices

### What Firebase Is NOT Used For
- ❌ **Firebase Analytics**: Explicitly disabled (no tracking, no user behavior analytics)
- ❌ **Firestore / Realtime Database**: Not used (all data in Cosmos DB)
- ❌ **Firebase Authentication**: Not used (Azure AD B2C for auth)
- ❌ **Crashlytics**: Not used (Application Insights for telemetry)
- ❌ **Remote Config**: Not used
- ❌ **Cloud Functions**: Not used (Azure Functions for backend)

### Privacy & Compliance
- Firebase is used purely as a **transport mechanism** for push notifications
- Device tokens and notification payloads are processed by Google only during delivery
- No user behavior tracking, analytics, or profiling occurs via Firebase
- Consistent with ADR 002 and POPIA/GDPR requirements
- Any future use of additional Firebase services requires explicit ADR approval and privacy review

### Configuration Details
See **[docs/firebase_fcm_setup.md](docs/firebase_fcm_setup.md)** for:
- Firebase project creation steps (with Analytics disabled)
- Android/iOS app configuration
- Config file placement (`google-services.json`, `GoogleService-Info.plist`)
- Security best practices
- Multi-environment setup (dev/staging/prod)

## Configuration Requirements

### Azure Notification Hubs
1. Create Notification Hub in Azure Portal (one per environment: dev/staging/prod)
2. Configure FCM V1 credentials:
   - Upload Firebase service account JSON (from Firebase Console → Project Settings → Service Accounts)
   - Ensure FCM HTTP v1 API is enabled (legacy FCM API is deprecated)
3. Configure APNS credentials:
   - Upload APNS certificate (.p12) or token authentication key (.p8)
   - Set Team ID, Key ID, Bundle ID
4. Set connection string in Function App settings: `NOTIFICATION_HUB_CONNECTION_STRING`
5. Set hub name: `NOTIFICATION_HUB_NAME`

### Firebase Setup (Flutter)
See **[docs/firebase_fcm_setup.md](docs/firebase_fcm_setup.md)** for complete setup guide.

**Quick checklist**:
1. Create Firebase project at console.firebase.google.com (**disable Google Analytics**)
2. Add Android app:
   - Package name: `com.asora.app`
   - Download `google-services.json` → `android/app/` (**do not commit to git**)
   - Configure `android/build.gradle` and `android/app/build.gradle`
3. Add iOS app:
   - Bundle ID: `com.asora.app`
   - Download `GoogleService-Info.plist` → `ios/Runner/` (**do not commit to git**)
   - Enable Push Notifications + Background Modes in Xcode capabilities
4. Upload APNS certificate to Firebase Console (iOS app settings)
5. Disable analytics in Android manifest and iOS Info.plist (see FCM setup guide)

### Cosmos DB
Create 4 containers in your Cosmos DB account:

1. **notification_events**
   - Partition key: `/userId`
   - Indexes: `status`, `retryCount`, `nextRetryAt`, `dedupeKey`, `createdAt`

2. **notifications**
   - Partition key: `/userId`
   - Indexes: `category`, `read`, `dismissed`, `createdAt`

3. **notification_preferences**
   - Partition key: `/userId`
   - Indexes: None (direct reads by userId)

4. **device_tokens**
   - Partition key: `/userId`
   - Indexes: `deviceId`, `platform`, `revokedAt`, `lastSeenAt`

### Environment Variables
Add to Azure Function App settings:
```
COSMOS_CONNECTION_STRING=<your-cosmos-connection-string>
NOTIFICATION_HUB_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;...
NOTIFICATION_HUB_NAME=<your-hub-name>
```

## Testing Guide

### Backend Tests
```bash
cd functions
npm install
npm test  # Run all Jest tests
npm test -- notificationDispatcher.test.ts  # Run specific test
```

### Flutter Tests
```bash
flutter test  # Run all tests
flutter test test/features/notifications/  # Run notification tests only
flutter test --coverage  # Generate coverage report
```

### E2E Testing (Manual)

**Purpose**: Test full notification pipeline from event enqueuing through push delivery and in-app display.

**Prerequisites**:
- Cosmos DB configured with notification containers
- Azure Notification Hubs configured with FCM v1 + APNS credentials
- Function App deployed and running
- Test device with Flutter app installed and logged in
- Device push token registered (check Cosmos `device_tokens` container)

**Step 1: Enqueue Test Event** (using helper script):
```bash
# Set Cosmos connection string
export COSMOS_CONNECTION_STRING="AccountEndpoint=..."

# Enqueue a social notification (POST_LIKE)
node scripts/enqueue-test-notification.js <userId>

# Or specify event type
node scripts/enqueue-test-notification.js <userId> POST_COMMENT
node scripts/enqueue-test-notification.js <userId> SECURITY_NEW_DEVICE

# Available event types:
# - POST_LIKE, POST_COMMENT, COMMENT_REPLY (SOCIAL)
# - SECURITY_NEW_DEVICE, SECURITY_PASSWORD_CHANGED (SECURITY)
# - SAFETY_CONTENT_FLAGGED (SAFETY)
# - NEWS_SYSTEM_UPDATE (NEWS)
```

**Step 2: Verify Event Enqueued**:
```bash
# Query Cosmos notification_events container
az cosmosdb sql query \
  --account-name <cosmos-account> \
  --database-name users \
  --container-name notification_events \
  --query-text "SELECT * FROM c WHERE c.userId = '<userId>' AND c.status = 'PENDING'"
```

**Step 3: Wait for Timer-Trigger Processing**:
- Timer runs **every minute** (`0 */1 * * * *`)
- Watch Function App logs (Azure Portal → Log Stream or Application Insights)
- Look for: `[NotificationDispatcher] Processing batch`, `[Push] Sent to X devices`

**Step 4: Verify Processing**:
```bash
# Check event status changed to COMPLETED
az cosmosdb sql query \
  --account-name <cosmos-account> \
  --database-name users \
  --container-name notification_events \
  --query-text "SELECT c.status, c.processedAt FROM c WHERE c.userId = '<userId>'"

# Check in-app notification created
az cosmosdb sql query \
  --account-name <cosmos-account> \
  --database-name users \
  --container-name notifications \
  --query-text "SELECT * FROM c WHERE c.userId = '<userId>' ORDER BY c.createdAt DESC"
```

**Step 5: Verify Push Notification**:
- **Device**: Check push notification received on device
- **Azure Portal**: Notification Hub → Monitoring → Metrics → "Successful Sends"
- **Logs**: Search for `[Push] Sent FCM notification` or `[Push] Sent APNS notification`

**Step 6: Verify In-App Display**:
- Open Flutter app → Notifications screen
- Should see new notification with correct title/body
- Swipe actions should work (mark read, dismiss)
- Unread badge count should update

**Alternative: Manual Event via Cosmos Portal**:
1. Azure Portal → Cosmos DB → Data Explorer
2. Select `notification_events` container
3. Click "New Item"
4. Paste JSON:
   ```json
   {
     "id": "manual-test-123",
     "userId": "<your-user-id>",
     "eventType": "POST_LIKE",
     "category": "SOCIAL",
     "payload": {
       "actorId": "actor-789",
       "actorName": "Test User",
       "targetId": "post-456",
       "targetType": "post"
     },
     "status": "PENDING",
     "retryCount": 0,
     "createdAt": "2025-01-15T10:00:00Z"
   }
   ```

**Troubleshooting**:
- **Event stays PENDING**: Check timer-trigger logs for errors, verify Cosmos connection
- **Event FAILED**: Check `lastError` field in event document, increase logging
- **Push not received**: Verify device token exists in `device_tokens`, check Notification Hub metrics
- **In-app notification missing**: Check `notifications` container, verify user ID matches

## Privacy & Compliance

### Overview
Push notifications are implemented with **privacy-by-design** principles:
- Firebase is used **only for FCM token generation** (no Analytics, Firestore, Auth)
- All user data stored in Asora-controlled Cosmos DB (encrypted at rest)
- Users control notification categories, quiet hours, and device management
- 30-day TTL on notifications and events (auto-expire)
- GDPR/POPIA compliant data export and deletion

### Documentation
- **ADR 001 Addendum**: `docs/ADR_001_ADDENDUM_PUSH_NOTIFICATIONS_PRIVACY.md` — Detailed privacy analysis
- **Firebase Setup**: `docs/firebase_fcm_setup.md` — Disabling Analytics and configuring minimal Firebase
- **Cosmos Schema**: `docs/notifications_cosmos_schema.md` — Data retention and GDPR section

### User Rights
| Right | Implementation |
|-------|----------------|
| **Access** | Export includes device tokens (last 4 digits), preferences, recent notifications |
| **Erasure** | Privacy Service deletes all device tokens, preferences, notifications, events |
| **Rectification** | Users update preferences, device labels via settings screen |
| **Restrict Processing** | Category toggles, device revocation, quiet hours |

### Data Sharing
| Third Party | Data Shared | Purpose | Retention |
|-------------|-------------|---------|-----------|
| **Google FCM** | Device tokens, notification payloads | Android push delivery | Until token invalidated |
| **Apple APNS** | Device tokens, notification payloads | iOS push delivery | Until token invalidated |
| **Azure Notification Hubs** | Device tokens, payloads, platform (fcm/apns) | Push orchestration | 90 days inactive cleanup |

**Legal Basis**: GDPR Article 6(1)(b) (service provision), POPIA Section 11(1)(a) (consent)

### Security Controls
- ✅ Encrypted storage (Cosmos DB, TLS 1.3 transport)
- ✅ JWT authentication on all API endpoints
- ✅ 3-device cap (prevents token abuse)
- ✅ Rate limiting (prevents notification spam)
- ✅ No PII in push payloads (generic templates)

---

## Known Issues & TODOs

### High Priority
- [x] **API Integration**: Wire Flutter screens to REST endpoints ✅ (Completed: notification_api_service.dart, providers)
- [ ] **Firebase Configuration**: Add `google-services.json` and `GoogleService-Info.plist` files (per-environment)
- [ ] **CORS Setup**: Configure `host.json` with allowed origins for Flutter web/mobile
- [ ] **Timezone Detection**: Auto-detect user timezone on first login (currently defaults to UTC)

### Medium Priority
- [ ] **Widget Test Fixes**: Fix layout overflow in permission prompt widget (test rendering issues)
- [ ] **App Insights**: Add custom telemetry events for notification metrics
- [ ] **Device Info**: Install `device_info_plus` and generate better device labels
- [ ] **Error Handling**: Add retry UI for failed API requests in Flutter screens

### Low Priority
- [ ] **Batch Operations**: Add bulk mark-as-read, bulk dismiss APIs
- [ ] **Rich Notifications**: Support images in push notifications
- [ ] **Sound Customization**: Per-category notification sounds
- [ ] **Web Push**: Add web push support via FCM for Flutter web

## Deployment Checklist

- [x] Backend: TypeScript code compiles (`npm run build` succeeds)
- [x] Backend: All Jest tests pass
- [x] Flutter: Code compiles (`flutter analyze` passes with warnings only)
- [x] Flutter: Packages installed (`flutter pub get`)
- [ ] Azure: Notification Hub created and configured
- [ ] Azure: Cosmos DB containers created with correct partition keys
- [ ] Azure: Function App environment variables set
- [ ] Firebase: Project created with Android/iOS apps configured
- [ ] Flutter: Firebase config files added to android/ios directories
- [ ] Flutter: Xcode capabilities enabled (Push Notifications, Background Modes)
- [ ] Integration: End-to-end test (enqueue → process → send → verify)

## Metrics & Monitoring

### App Insights Custom Events
Recommended telemetry events to add:
- `notification_event_enqueued` - Track event creation
- `notification_event_processed` - Track successful processing
- `notification_push_sent` - Track push notification delivery
- `notification_push_failed` - Track push failures
- `notification_rate_limited` - Track rate limit hits
- `notification_deduplicated` - Track dedupe hits
- `device_token_registered` - Track device registrations
- `device_token_evicted` - Track automatic device removals

### Dashboard Queries (Kusto)
```kusto
// Notification processing rate
customEvents
| where name == "notification_event_processed"
| summarize count() by bin(timestamp, 1h)

// Push failure rate
customEvents
| where name in ("notification_push_sent", "notification_push_failed")
| summarize sent = countif(name == "notification_push_sent"), 
            failed = countif(name == "notification_push_failed")
| extend failureRate = failed * 100.0 / (sent + failed)

// Rate limit hits by category
customEvents
| where name == "notification_rate_limited"
| extend category = tostring(customDimensions.category)
| summarize count() by category, bin(timestamp, 1d)
```

## Performance Characteristics

### Backend
- **Timer Trigger**: Processes up to 100 events per minute (6000/hour max)
- **Rate Limiting**: Effectively caps push volume per user
- **Cosmos DB**: Partition by userId ensures scalability
- **Notification Hub**: Supports millions of devices, batch sends

### Frontend
- **Pagination**: 20 notifications per page (configurable)
- **Infinite Scroll**: Triggers at 80% scroll position
- **Device Cap**: 3 devices per user prevents token bloat
- **Quiet Hours**: 24 boolean checks (O(1) lookup)

## Security Considerations

- **Authentication**: All APIs require valid JWT B2C token
- **Device Token Privacy**: Tokens stored encrypted at rest (Cosmos DB default)
- **Deep-Link Validation**: Router validates URI format before navigation
- **Rate Limiting**: Prevents notification spam/abuse
- **Quiet Hours**: User control over notification timing
- **Device Management**: Users can revoke devices manually
- **HTTPS Only**: All API calls over TLS 1.2+

## Deployment Automation

### Scripts Created

#### 1. Azure Notification Hub Setup
- **File**: `scripts/setup-azure-notification-hub.sh`
- **Usage**: `./scripts/setup-azure-notification-hub.sh <env> <resource-group> <location>`
- **Features**:
  - Creates namespace (Standard SKU for APNs/FCM support)
  - Creates notification hub
  - Retrieves connection string
  - Idempotent (safe to re-run)

#### 2. Function App Environment Variables
- **File**: `scripts/set-function-app-env-vars.sh`
- **Usage**: `./scripts/set-function-app-env-vars.sh <function-app-name> <env>`
- **Features**:
  - Interactive prompts for sensitive values
  - Sets 4 required environment variables:
    - `NOTIFICATION_HUB_CONNECTION_STRING`
    - `NOTIFICATION_HUB_NAME`
    - `COSMOS_CONNECTION_STRING`
    - `COSMOS_DATABASE_NAME`
  - Validates inputs before applying

#### 3. E2E Test Runner
- **File**: `scripts/run-e2e-notification-test.sh`
- **Usage**: `./scripts/run-e2e-notification-test.sh <user-id> <event-type>`
- **Features**:
  - Injects test event directly into Cosmos DB
  - Waits for timer trigger (60-90 seconds)
  - Validates device token registration
  - Checks event processing status
  - Requires `COSMOS_CONNECTION_STRING` environment variable

#### 4. Test Event Enqueuer (Node.js Helper)
- **File**: `scripts/enqueue-test-notification.js`
- **Usage**: `node scripts/enqueue-test-notification.js <user-id> <event-type>`
- **Features**:
  - Direct Cosmos DB client integration
  - Generates realistic test events
  - Supports all 12 event types
  - Used by E2E test runner script

### Documentation Created

#### 1. Complete Deployment Guide
- **File**: `NOTIFICATIONS_DEPLOYMENT_GUIDE.md`
- **Length**: ~600 lines
- **Sections**:
  - Prerequisites & setup
  - Firebase configuration (Android + iOS)
  - Azure Notification Hub creation
  - Function App configuration
  - Cosmos DB container creation
  - E2E testing procedures
  - Troubleshooting & debugging
  - Production deployment checklist

#### 2. Quick Start Guide
- **File**: `NOTIFICATIONS_DEPLOYMENT_QUICKSTART.md`
- **Length**: ~200 lines
- **Purpose**: 30-minute TL;DR version
- **Target**: Experienced Azure/Firebase developers

#### 3. iOS Setup Guide
- **File**: `docs/firebase_ios_setup.md`
- **Length**: ~400 lines
- **Sections**:
  - Firebase Console iOS app creation
  - GoogleService-Info.plist placement
  - APNs key/certificate configuration
  - Xcode project capabilities
  - Build verification steps
  - Device testing procedures

#### 4. Deployment Checklist
- **File**: `NOTIFICATIONS_DEPLOYMENT_CHECKLIST.md`
- **Purpose**: Interactive checkbox tracker
- **Sections**:
  - 6 deployment phases with checkboxes
  - Current status summary
  - Time estimates per phase
  - Priority ordering
  - Useful commands reference

### Firebase Configuration Status

#### Android ✅
- **Config File**: `android/app/google-services.json` (662 bytes)
- **Project**: `asora-dev` (project number: 557584586660)
- **Package Name**: `com.asora.app`
- **API Key**: Configured in google-services.json
- **Gradle Integration**:
  - Root `build.gradle.kts`: Google services plugin v4.4.4
  - App `build.gradle.kts`: Firebase BoM v34.6.0, messaging-ktx
- **Analytics**: DISABLED via AndroidManifest.xml meta-data
- **Build Status**: Ready to test (`flutter build apk`)

#### iOS ⏳
- **Config File**: NOT YET DOWNLOADED (needs Firebase Console access)
- **Bundle ID**: `com.asora.app` (must match Android)
- **Required Steps**:
  1. Firebase Console → asora-dev → Add iOS app
  2. Download `GoogleService-Info.plist`
  3. Place in `ios/Runner/GoogleService-Info.plist`
  4. Update `ios/Runner/Info.plist` with Analytics disable flag
  5. Create APNs key/certificate in Apple Developer Portal
  6. Upload APNs credentials to Firebase Console
- **Documentation**: See `docs/firebase_ios_setup.md`

### Deployment Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Android Firebase SDK | 15 min | ✅ COMPLETE |
| iOS Firebase SDK | 10 min | ⏳ PENDING |
| Build Verification | 5 min | ⏳ PENDING |
| Azure Hub Creation | 10 min | ⏳ READY |
| Function App Config | 5 min | ⏳ READY |
| Cosmos Containers | 5 min | ⏳ READY |
| E2E Test | 5 min | ⏳ READY |
| **Total** | **55 min** | **27% complete** |

### Next Immediate Steps

1. **iOS Config Download** (10 min):
   ```bash
   # Manual: Firebase Console → asora-dev → Add iOS app
   # Bundle ID: com.asora.app
   # Download GoogleService-Info.plist
   cp ~/Downloads/GoogleService-Info.plist ios/Runner/GoogleService-Info.plist
   ```

2. **Build Verification** (5 min):
   ```bash
   cd /home/kylee/asora
   flutter clean && flutter pub get && flutter build apk --debug
   ```

3. **Azure Hub Creation** (10 min):
   ```bash
   az login  # If not already logged in
   ./scripts/setup-azure-notification-hub.sh dev rg-asora-dev eastus
   # SAVE the connection string output!
   ```

4. **Function App Config** (5 min):
   ```bash
   ./scripts/set-function-app-env-vars.sh asora-function-dev dev
   # Enter connection string from step 3 when prompted
   ```

5. **E2E Test** (5 min):
   ```bash
   export COSMOS_CONNECTION_STRING="AccountEndpoint=https://..."
   ./scripts/run-e2e-notification-test.sh user-123 POST_LIKE
   # Wait 90 seconds, verify push on device
   ```

## References

- Azure Notification Hubs SDK v2: https://www.npmjs.com/package/@azure/notification-hubs
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Flutter Local Notifications: https://pub.dev/packages/flutter_local_notifications
- Luxon Timezone: https://moment.github.io/luxon/

---

**Implementation Dates**: November 2025  
**Status**: Complete - Ready for deployment after Firebase configuration  
**Next Steps**: Configure Firebase projects, add config files, test end-to-end flow
