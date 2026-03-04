# Auth UX Unblock Evidence

Date: 2026-03-02  
Scope: unblock provider reachability and iOS redirect scheme consistency for device auth verification.

## Changes made

1. Email provider added to auth picker UI:
- File: `lib/features/auth/presentation/auth_choice_screen.dart`
- Update: Added `Email` option in provider sheet and mapped tap to `OAuth2Provider.email`.

2. iOS redirect scheme aligned with OAuth config expectation:
- File: `ios/Runner/Info.plist`
- Update: Added URL scheme `asora` to `CFBundleURLSchemes` so `asora://oauth/callback` is registered.
- Existing MSAL scheme retained for compatibility while auth stack is validated on devices.

## Why this unblocks verification

- All four providers are now reachable from the primary auth picker: Google, Apple, World ID, Email.
- iOS now registers the scheme expected by `OAuth2Config.redirectUri` on iOS (`asora://oauth/callback`), preventing scheme-not-registered redirect failures.

## Screenshot checklist

- [ ] Auth picker shows Google, Apple, World ID, Email
- [ ] Email option tap starts real auth flow
- [ ] iOS callback returns to app without redirect-scheme error

## Artifact placeholders

- Android picker screenshot:
- iOS picker screenshot:
- iOS callback success screenshot/log:

