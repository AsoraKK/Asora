# Crash Reporting Runbook (Android)

Version: 1.0  
Last Updated: 2026-02-05  
Owners: Mobile + Platform

## 1. Scope

- Crash reporting is enabled for Android builds through Firebase Crashlytics.
- iOS setup is intentionally deferred and out of current scope.

## 2. Implementation References

- Startup wiring: `lib/main.dart`
- Crash service: `lib/core/observability/crash_reporting.dart`
- Android plugin setup: `android/build.gradle.kts`, `android/app/build.gradle.kts`
- Dependency: `pubspec.yaml` (`firebase_crashlytics`)

## 3. Verification Steps

1. Run:

```bash
flutter pub get
flutter test test/core/observability/crash_reporting_test.dart
```

2. Build Android debug and release:

```bash
flutter build apk --debug
flutter build apk --release
```

3. Trigger a non-fatal test exception in a QA build and verify arrival in Crashlytics dashboard.

## 4. Operational Notes

- Crash collection is disabled in debug by default and enabled for non-debug builds.
- Uncaught Flutter framework and runtime errors are forwarded to crash reporting.
- If Firebase initialization fails, app startup continues and logs a warning.
