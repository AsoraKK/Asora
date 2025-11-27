# Firebase FCM Setup for Asora

## Purpose

Asora uses Firebase Cloud Messaging (FCM) **exclusively** for client-side push notification token generation and message delivery. No other Firebase services are used.

## Important Privacy Constraints

- **Firebase Usage**: FCM only (token generation, push delivery)
- **Not Used**: Firestore, Realtime Database, Firebase Authentication, Firebase Analytics, Crashlytics, Remote Config, etc.
- **Analytics**: Firebase Analytics is explicitly disabled and must remain disabled
- **Privacy**: Consistent with ADR 002 and POPIA/GDPR requirements

## Firebase Console Setup

### Prerequisites

- Google Cloud account with billing enabled (free tier sufficient for dev/staging)
- Access to Azure Portal (for Notification Hubs configuration)

### Creating the Firebase Project

1. **Navigate to Firebase Console**: https://console.firebase.google.com/

2. **Create Project** (per environment: dev, staging, prod):
   - Project name: `asora-notifications-dev` (or stage/prod)
   - **CRITICAL**: Disable Google Analytics when prompted
     - Uncheck "Enable Google Analytics for this project"
     - If already enabled, disable in Project Settings → Integrations → Google Analytics → Disable

3. **Add Android App**:
   - Android package name: `com.asora.app` (must match Flutter app ID)
   - App nickname: `Asora Android (Dev)`
   - Debug signing certificate SHA-1: (optional, only needed for debug builds with auth)
   - Download `google-services.json`
   - Place file at: `android/app/google-services.json`

4. **Add iOS App**:
   - iOS bundle ID: `com.asora.app` (must match Flutter app ID)
   - App nickname: `Asora iOS (Dev)`
   - Download `GoogleService-Info.plist`
   - Place file at: `ios/Runner/GoogleService-Info.plist`

5. **Enable FCM V1 API** (required for Azure Notification Hubs):
   - Project Settings → Cloud Messaging
   - Under "Cloud Messaging API (Legacy)", note the deprecation warning
   - Ensure "Cloud Messaging API (V1)" is enabled
   - Generate a new service account key:
     - Project Settings → Service Accounts
     - Click "Generate new private key"
     - Save JSON file securely (needed for Azure Notification Hubs)

### Configuration File Locations

```
android/
  app/
    google-services.json          # Android FCM config (NOT committed to git)
    
ios/
  Runner/
    GoogleService-Info.plist      # iOS FCM config (NOT committed to git)
```

**Security**: Add these files to `.gitignore`. Never commit FCM config files to version control.

### Xcode iOS Configuration

1. **Add GoogleService-Info.plist to Xcode**:
   - Open `ios/Runner.xcworkspace` in Xcode
   - Drag `GoogleService-Info.plist` into Xcode project navigator
   - Ensure "Copy items if needed" is checked
   - Add to "Runner" target

2. **Enable Push Notifications Capability**:
   - Select Runner target → Signing & Capabilities
   - Click "+ Capability" → Push Notifications

3. **Enable Background Modes**:
   - Click "+ Capability" → Background Modes
   - Check "Remote notifications"

4. **APNS Certificate/Key**:
   - Apple Developer Portal → Certificates, Identifiers & Profiles
   - Create APNS Authentication Key or Certificate
   - Upload to both Firebase Console (Cloud Messaging → iOS → APNS) and Azure Notification Hubs

### Android Configuration

The `google-services.json` file is automatically processed by the Google Services Gradle plugin. Ensure `android/build.gradle` includes:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

And `android/app/build.gradle` applies the plugin:

```gradle
apply plugin: 'com.google.gms.google-services'
```

## Disabling Firebase Analytics

### Method 1: Manifest (Android)

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    <meta-data
        android:name="google_analytics_automatic_screen_reporting_enabled"
        android:value="false" />
    <meta-data
        android:name="firebase_analytics_collection_enabled"
        android:value="false" />
    <meta-data
        android:name="google_analytics_adid_collection_enabled"
        android:value="false" />
</application>
```

### Method 2: Info.plist (iOS)

Add to `ios/Runner/Info.plist`:

```xml
<key>FIREBASE_ANALYTICS_COLLECTION_ENABLED</key>
<false/>
<key>GOOGLE_ANALYTICS_ADID_COLLECTION_ENABLED</key>
<false/>
```

### Method 3: Runtime (Flutter)

In `main.dart` after Firebase initialization:

```dart
await Firebase.initializeApp();
await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(false);
```

## Linking Firebase to Azure Notification Hubs

After setting up Firebase:

1. **Get FCM V1 Service Account Key**:
   - Firebase Console → Project Settings → Service Accounts
   - Generate private key (JSON)

2. **Configure in Azure Notification Hubs**:
   - Azure Portal → Your Notification Hub → Settings → Google (FCM V1)
   - Upload the service account JSON file
   - Save configuration

3. **Test Configuration**:
   - Use Azure Portal "Test Send" feature
   - Send to a registered device token
   - Verify delivery

## Verification Checklist

- [ ] `google-services.json` placed in `android/app/` (not committed)
- [ ] `GoogleService-Info.plist` placed in `ios/Runner/` (not committed)
- [ ] Both files added to `.gitignore`
- [ ] Firebase Analytics disabled in console
- [ ] Analytics disabled in manifest/Info.plist/runtime
- [ ] FCM V1 service account key generated
- [ ] Azure Notification Hubs configured with FCM credentials
- [ ] Push Notifications capability enabled in Xcode
- [ ] Background Modes enabled in Xcode
- [ ] APNS certificate/key uploaded to Firebase and Azure

## Testing FCM Token Generation

Run the app on a physical device or emulator with Google Play Services:

```bash
flutter run --debug
```

Check logs for:

```
FCM Token: [long token string]
Device token registered with backend
```

If token is null:
- Verify `google-services.json` / `GoogleService-Info.plist` are present
- Check Firebase project has FCM enabled
- Ensure Google Play Services installed (Android)
- Check Xcode capabilities (iOS)

## Troubleshooting

### Android: Token not generated

- Verify `google-services.json` is present and valid
- Check `package_name` in JSON matches Flutter app ID
- Ensure Google Play Services installed on device/emulator
- Check logs: `adb logcat | grep -i firebase`

### iOS: Token not generated

- Verify `GoogleService-Info.plist` is added to Xcode project
- Check `BUNDLE_ID` in plist matches Flutter app ID
- Ensure APNS certificate/key is valid and uploaded
- Check device has internet connection
- Verify push entitlements in provisioning profile

### General: Token registered but push not received

- Verify Azure Notification Hubs has correct FCM credentials
- Check backend logs for notification dispatch
- Test send from Azure Portal directly
- Ensure device token was successfully registered (check backend logs)
- Verify notification permissions granted on device

## Multi-Environment Strategy

For dev/staging/prod:

1. Create separate Firebase projects:
   - `asora-notifications-dev`
   - `asora-notifications-staging`
   - `asora-notifications-prod`

2. Use Flutter flavors to switch configurations:
   ```
   android/app/src/dev/google-services.json
   android/app/src/staging/google-services.json
   android/app/src/prod/google-services.json
   ```

3. Configure separate Azure Notification Hubs per environment

4. Use different bundle IDs per environment (iOS):
   - `com.asora.app.dev`
   - `com.asora.app.staging`
   - `com.asora.app` (prod)

## Security Notes

- **Never commit** FCM config files to version control
- **Rotate service account keys** if compromised
- **Restrict APNS keys** to push notification scope only
- **Monitor** Firebase usage metrics for unexpected activity
- **Audit** Firebase project members regularly

## References

- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- FCM HTTP v1 API: https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Azure Notification Hubs FCM Setup: https://learn.microsoft.com/en-us/azure/notification-hubs/configure-google-firebase-cloud-messaging
- APNS Configuration: https://developer.apple.com/documentation/usernotifications

---

**Last Updated**: November 20, 2025  
**Maintained by**: Asora Backend Team
