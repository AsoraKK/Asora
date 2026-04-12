# Web Audit Baseline — Phase 0 Evidence Gate

> Generated as part of the Lythaus web-enablement project.
> This document records the baseline state before web modifications.

## Audit Date

Phase 0 completed during the web-enablement work session.

## Baseline Metrics

| Metric | Value |
|---|---|
| `flutter analyze` | 0 issues |
| `flutter test` | All passing (3 354+ tests) |
| `flutter build web --release` | Succeeds |
| Target platforms | Android, iOS, Web |

## Pre-existing Platform Dependencies

The following packages / APIs were identified as **non-web-compatible** and
required guards:

| Package / API | Used In | Guard Strategy |
|---|---|---|
| `flutter_appauth` | `OAuth2Service` | Web delegates to `WebAuthService` |
| `flutter_secure_storage` | `AuthService` | `kIsWeb` guard (skip on web) |
| `local_auth` | `AuthService` | `kIsWeb` guard (skip biometrics) |
| `firebase_messaging` | `AppShell`, `AdaptiveShell` | `kIsWeb` guard |
| TLS cert pinning | `DioClient` | `kIsWeb` guard |
| Device security | `DeviceSecurityService` | `kIsWeb` guard |

## New Files Added

- `lib/core/routing/app_router.dart`
- `lib/features/auth/application/web_auth_service.dart`
- `lib/features/auth/application/web_token_storage.dart`
- `lib/features/auth/application/web_token_storage_real.dart`
- `lib/features/auth/application/web_token_storage_stub.dart`
- `lib/features/auth/presentation/auth_callback_screen.dart`
- `lib/ui/screens/adaptive_shell.dart`
- `web/_redirects`
- `docs/web/WEB_ARCHITECTURE.md`
- `docs/web/WEB_ARCHITECTURE_DECISIONS.md`

## Modified Files

- `lib/main.dart` — `MaterialApp.router` with GoRouter
- `lib/features/auth/application/auth_providers.dart` — `setUser()`, web session restore
- `lib/features/auth/application/oauth2_service.dart` — web auth delegation
- `lib/ui/screens/app_shell.dart` — `kIsWeb` notification guard
- `lib/core/network/dio_client.dart` — TLS pinning guard
- `lib/core/security/device_security_service.dart` — device security guard
- `lib/features/auth/application/auth_service.dart` — biometrics guard
- `lib/features/notifications/application/notification_permission_service.dart` — permissions guard
- `pubspec.yaml` / `pubspec.lock` — `go_router`, `web` dependencies
- `web/index.html`, `web/manifest.json` — branding updates
- `.github/workflows/flutter-ci.yml` — web-build + marketing-site-build jobs

## Conclusion

All platform guards are in place. The web build compiles and runs. Existing
Android/iOS flows are unaffected (guard-not-delete strategy per ADR-W02).
# Web Audit Baseline — Proof Gate (Phase 0)

**Date:** 2025-07-18
**Status:** PASS — proceed to implementation

## 1. Web Build

- `flutter build web --release` → **SUCCESS** (56.7s)
- Output: `build/web/`
- WASM dry-run warnings only (flutter_secure_storage_web uses deprecated `dart:html` / `dart:js_util`). JS target compiles cleanly.

## 2. Cache Safety Audit

**Verdict: SAFE — no code change required.**

`cloudflare/worker.ts` (95 lines) already enforces correct caching behavior:

| Condition | Cache behavior | Header |
|---|---|---|
| `authorization` header present | **Bypass** — forwards to origin | `Cache-Control: private, no-store` |
| Authenticated feed path (not in `ANON_CACHEABLE_FEED_PATHS`) | **Bypass** | `Cache-Control: private, no-store` |
| Unauthenticated + `/api/feed/discover` or `/api/feed/news` | **Edge cache** (30s TTL, 60s SWR) | `public, s-maxage=30, stale-while-revalidate=60` |
| Non-feed request | **Bypass** | `Vary: Authorization` |

The worker checks `auth` (authorization header) early in bypass logic: `if (!isFeed || auth || !cachingEnabled || !isAnonCacheableFeedPath)`. Only two anonymous-only feed paths are cached. All other requests flow through to origin with `no-store`.

**Risk for web launch:** None. Web browsers sending `Authorization` headers for personalized feeds will always bypass caching, same as mobile. The `Vary: Authorization` header is set on all responses.

## 3. Web-Incompatible Dependencies

| Package | Issue | Mitigation |
|---|---|---|
| `flutter_appauth` | Native OAuth only — throws on `kIsWeb` | Custom redirect flow on web (Phase 2) |
| `flutter_jailbreak_detection` | No web equivalent | Platform guard → skip on web (Phase 3) |
| `local_auth` | Biometrics not available on web | Platform guard → skip on web (Phase 3) |
| `permission_handler` | Partial web support | Platform guard for unsupported permissions (Phase 3) |
| `flutter_secure_storage` | Uses IndexedDB on web (not ideal for tokens) | sessionStorage + in-memory on web (Phase 2) |
| `firebase_crashlytics` | Already disabled on web via `crash_reporting.dart` | No action needed |

## 4. Navigation Baseline

- **Current:** Manual `Navigator.push` with `MaterialPageRoute`. No GoRouter.
- **DeeplinkRouter:** Handles `asora://` scheme URIs (post, user, comment, settings, invite, moderation).
- **Impact:** GoRouter migration required (Stage A: top-level routes wrapping existing screens).

## 5. Auth Baseline

- `oauth2_service.dart` already has `kIsWeb` checks and computes web redirect URI: `'${Uri.base.origin}/auth/callback'`.
- `signInWithOAuth2()` throws on web — needs custom authorize URL → callback → token exchange flow.
- `refreshToken()` returns null on web — acceptable since sessionStorage tokens die on tab close.
- B2C redirect URI `{origin}/auth/callback` must be registered in Azure AD B2C tenant (external dependency).

## 6. Responsive Baseline

- Minimal responsive code: LayoutBuilder in moderation console (760px breakpoint), admin control panel (1200px breakpoint).
- No unified responsive shell. Bottom nav (`AsoraBottomNav`) is mobile-only.
- Need adaptive shell: side rail on ≥768px, bottom nav on <768px.

## 7. Branding Baseline

- `web/index.html`: title "asora", description "A new Flutter project" → needs update.
- `web/manifest.json`: name/short_name "asora" → needs update.
- `main.dart`: title already "Lythaus" ✓.
- Design system: `LythausTheme` ✓, `LythWordmark` ✓.

## 8. Feature Parity Assessment

All features are **expected to port cleanly** (not "fully implemented on web"):

| Feature | Assessment | Notes |
|---|---|---|
| Feed rendering | Expected to port cleanly | Pure Dart + Flutter widgets |
| Post creation | Expected to port cleanly | `image_picker` has web support |
| Comments/threads | Expected to port cleanly | Pure Dart |
| Notifications (in-app) | Expected to port cleanly | Pure Dart UI |
| Notifications (push) | Needs web-specific work | FCM web requires service worker |
| Profile | Expected to port cleanly | Pure Dart |
| Moderation console | Expected to port cleanly | Already has responsive layout |
| Auth | Needs web-specific work | Custom redirect flow (Phase 2) |
| Device integrity | Not applicable on web | Platform guard skip |
| Biometric auth | Not applicable on web | Platform guard skip |

## 9. Blockers

| Blocker | Type | Status |
|---|---|---|
| B2C redirect URI registration | External dependency | Not started — must be done before web auth works |
| GoRouter migration | Implementation | Phase 1 |
| Web auth flow | Implementation | Phase 2 |

## 10. Decision Record

- **Token storage on web:** sessionStorage + in-memory. Tab close = logout. This is an explicit product decision, not a limitation.
- **Mobile impact:** None. Web is added as a second surface. No changes to mobile flows.
- **Router migration:** Staged. Stage A = top-level routes only. Stage B = nested flows (deferred).
