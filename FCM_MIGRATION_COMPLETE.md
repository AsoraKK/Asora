# FCM HTTP v1 Migration Complete

## Summary

Successfully migrated from Azure Notification Hubs to direct Firebase Cloud Messaging (FCM) HTTP v1 API. This eliminates the Azure Notification Hubs dependency and simplifies the push notification architecture by sending directly to FCM.

## What Changed

### Dependencies

**Removed**:
- `@azure/notification-hubs` (was ^2.0.2)

**Added**:
- `google-auth-library` (^9.0.0) - For OAuth2 JWT authentication with FCM

### Files Modified

1. **`functions/src/notifications/clients/fcmClient.ts`** (NEW - 605 lines)
   - OAuth2 JWT-based authentication using Firebase service account
   - Token caching with 55-minute expiry (before 60-minute FCM token expiry)
   - Direct FCM HTTP v1 API calls to `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
   - Error classification: `UNREGISTERED`, `NOT_FOUND`, `INVALID_ARGUMENT` → token invalid
   - Retryable errors: `UNAVAILABLE`, `INTERNAL`, `QUOTA_EXCEEDED`
   - Android notification channel support per category
   - Batch sending with aggregated results

2. **`functions/shared/configService.ts`**
   - Changed `NotificationConfig` from Notification Hub config to FCM config
   - New env vars: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`
   - Health summary updated to show `fcmProjectId` and `fcmConfigured`

3. **`functions/src/notifications/services/notificationDispatcher.ts`**
   - Replaced `getNotificationHubsClient` with `sendToDevices` from fcmClient
   - Added automatic token invalidation: when FCM returns invalid token errors, the device is automatically revoked via `userDeviceTokensRepo.revoke()`
   - Updated metrics tracking for FCM-specific results

4. **`functions/src/notifications/http/devicesApi.function.ts`**
   - Removed Notification Hub registration/deletion calls
   - Device tokens are now managed directly in Cosmos DB
   - FCM uses device tokens directly (no hub registration needed)

5. **`functions/src/notifications/__tests__/fcmClient.test.ts`** (NEW - 175 lines)
   - Tests configuration detection (all env vars present/missing scenarios)
   - Tests interface type checking (FcmSendRequest, FcmSendResult, FcmBatchResult)
   - Tests error code classification (retryable vs token-invalid)
   - Tests config status reporting

6. **`functions/src/notifications/__tests__/notificationDispatcher.test.ts`**
   - Updated mock from `notificationHubClient` to `fcmClient`
   - Mock returns `sendToDevices` function with configurable results

### Files Deleted

- `functions/src/notifications/clients/notificationHubClient.ts` - Obsolete Azure Notification Hubs client

## Environment Variables

### Removed
```
NOTIFICATION_HUB_CONNECTION_STRING
NOTIFICATION_HUB_NAME
```

### Added
```
FCM_PROJECT_ID        # Firebase project ID (e.g., 'asora-dev')
FCM_CLIENT_EMAIL      # Service account email (e.g., 'firebase-adminsdk-xxxxx@asora-dev.iam.gserviceaccount.com')
FCM_PRIVATE_KEY       # PEM-formatted private key from Firebase service account JSON
```

## Firebase Service Account Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" to download JSON file
3. Extract these values from the JSON:
   - `project_id` → `FCM_PROJECT_ID`
   - `client_email` → `FCM_CLIENT_EMAIL`  
   - `private_key` → `FCM_PRIVATE_KEY`

**Important**: The private key contains literal `\n` characters. When setting in Azure App Settings:
- The fcmClient handles both raw newlines and escaped `\\n` automatically
- For Azure portal: paste the key as-is from the JSON
- For CLI: use quotes and escape properly

## Architecture Comparison

### Before (Azure Notification Hubs)
```
App → Azure Function → Notification Hubs → FCM/APNs → Device
                       ↑
                       Device registration via SDK
```

### After (Direct FCM)
```
App → Azure Function → FCM HTTP v1 → Device
                       ↑
                       OAuth2 JWT auth
                       Device tokens in Cosmos DB
```

## Benefits

1. **Simpler Architecture**: Direct FCM calls, no intermediate hub
2. **Cost Reduction**: No Azure Notification Hubs charges
3. **Fewer Dependencies**: Removed `@azure/notification-hubs` package
4. **Better Error Handling**: Direct FCM error codes for precise token invalidation
5. **Faster Iteration**: No hub configuration changes needed for testing
6. **Token Management**: Device tokens in Cosmos DB, auto-revoked on FCM errors

## Test Results

```
Test Suites: 85 passed, 85 total (2 skipped)
Tests:       798 passed, 798 total (9 skipped, 2 todo)
```

All tests pass including:
- `fcmClient.test.ts` - 18 tests
- `notificationDispatcher.test.ts` - 12 tests  
- `userDeviceTokensRepo.test.ts` - 10 tests

## Verification Checklist

- [x] TypeScript compiles without errors (`npm run typecheck`)
- [x] All 798 tests pass (`npm test`)
- [x] `@azure/notification-hubs` removed from package.json
- [x] `google-auth-library` added to package.json
- [x] FCM client handles OAuth2 token caching
- [x] Dispatcher sends via FCM and handles errors
- [x] Invalid tokens auto-revoked in Cosmos DB
- [x] Configuration detection works (isFcmConfigured)
- [x] Health check reports FCM status

## Deployment Steps

1. **Update Azure Function App Settings**:
   ```bash
   az functionapp config appsettings set \
     --name asora-function-dev \
     --resource-group rg-asora-dev \
     --settings \
       FCM_PROJECT_ID="asora-dev" \
       FCM_CLIENT_EMAIL="firebase-adminsdk-xxxxx@asora-dev.iam.gserviceaccount.com" \
       FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

2. **Remove Old Settings** (if present):
   ```bash
   az functionapp config appsettings delete \
     --name asora-function-dev \
     --resource-group rg-asora-dev \
     --setting-names NOTIFICATION_HUB_CONNECTION_STRING NOTIFICATION_HUB_NAME
   ```

3. **Deploy Functions**:
   ```bash
   cd functions
   npm run build
   # Deploy via GitHub Actions or Azure CLI
   ```

4. **Verify Health**:
   ```bash
   curl https://asora-function-dev.azurewebsites.net/api/health
   # Should show: "fcmConfigured": true, "fcmProjectId": "asora-dev"
   ```

## E2E Testing

1. Install Asora dev app on Android device
2. Log in and enable notifications
3. Verify `user_device_tokens` record exists in Cosmos DB
4. Enqueue test notification:
   ```bash
   node scripts/enqueue-test-notification.js <userId> POST_LIKE
   ```
5. Wait for timer trigger (runs every minute)
6. Verify:
   - Push notification received on device
   - `notification_events` status = COMPLETED
   - `notifications` record created in Cosmos DB

## Rollback Plan

If issues arise:
1. Re-add `@azure/notification-hubs` to package.json
2. Restore `notificationHubClient.ts` from git history
3. Revert `notificationDispatcher.ts` changes
4. Re-add Notification Hub env vars
5. Deploy

## Future Enhancements

1. **iOS APNs Support**: Currently Android FCM only. iOS can use FCM proxy or direct APNs.
2. **FCM Topics**: Subscribe devices to topics for broadcast notifications
3. **Retry Queue**: Add Redis-backed retry queue for failed sends
4. **Metrics Dashboard**: FCM-specific metrics in Application Insights

---

**Migration Date**: December 2025
**Implemented By**: GitHub Copilot (Claude Opus 4.5)
**Status**: Complete - Ready for deployment
