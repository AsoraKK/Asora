# Mobile Store Checklist (Android)

Version: 1.0  
Last Updated: 2026-02-06  
Scope: Android only (iOS deferred)

## 1. Build and signing

- Confirm `android/app/build.gradle.kts` release signing uses `key.properties`.
- Confirm `key.properties` exists in CI and is not committed.
- Confirm these GitHub repository secrets exist:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
- Confirm local files remain git-ignored:
- `android/key.properties`
- `android/app/upload-keystore.jks`
- `android/app/upload-keystore.base64.txt`
- Build signed artifact:

```bash
flutter build appbundle --release
```

## 2. Crash reporting

- Confirm crash reporting wiring in `lib/main.dart`.
- Confirm Android plugins/dependencies in:
- `android/build.gradle.kts`
- `android/app/build.gradle.kts`
- `pubspec.yaml`
- Run:

```bash
flutter test test/core/observability/crash_reporting_test.dart
```

## 3. Privacy and policy links

- Privacy policy source: `docs/legal/public/privacy-policy.md`
- Terms source: `docs/legal/public/terms-of-service.md`
- Publish both to public URLs before submission.
- Ensure in-app links resolve to published URLs.

## 4. Google Play submission artifacts

- Data safety worksheet: `docs/compliance/google-play-data-safety.md`
- App content questionnaire answers prepared (UCG, moderation, reporting).
- Screenshots, short description, full description, support email finalized.

## 5. Release validation

- Smoke test auth, feed, post create, appeals, notifications.
- Verify notifications device registration endpoint responds `201`.
- Verify moderation block responses include neutral appeal path copy.

## 6. Go/No-Go

- CI green on default branch.
- Security checklist reviewed.
- Legal register check passes:

```bash
bash scripts/check_legal_registers.sh
```
