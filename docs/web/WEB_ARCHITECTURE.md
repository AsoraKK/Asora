# Lythaus Web Architecture

> Authoritative reference for the Flutter-web target of the Lythaus app.
> Updated as part of the web-enablement project (Phases 0–11).

## Overview

Lythaus ships as a **single Flutter codebase** targeting Android, iOS, and
**Web** (Cloudflare Pages). The web target adds:

- **GoRouter** for URL-addressable, shareable routes.
- **PKCE auth** via browser redirects (no `flutter_appauth` on web).
- **Responsive shell** — NavigationRail on desktop, BottomNav on mobile.
- **Platform guards** — FCM, biometrics, TLS pinning gracefully skipped on web.

## Production URLs

| Surface | URL |
|---|---|
| Flutter web app | `https://app.lythaus.asora.co.za` |
| Marketing site | `https://lythaus.asora.co.za` |

## Architecture Diagram

```
Browser
  │
  ├─ / (AdaptiveShell)       – Discover · Create · Alerts · Profile
  ├─ /login                   – AuthChoiceScreen (provider picker)
  ├─ /auth/callback           – AuthCallbackScreen (PKCE code exchange)
  ├─ /post/:postId            – PostDetailScreen
  ├─ /user/:userId            – ProfileScreen
  ├─ /invite/:code            – InviteRedeemScreen
  ├─ /moderation              – ModerationConsoleScreen
  ├─ /moderation/appeal       – AppealHistoryScreen
  └─ /settings/notifications  – NotificationsSettingsScreen
```

## Authentication (Web)

### Azure AD B2C Configuration

| Field | Value |
|---|---|
| Tenant | `asoraauthlife.onmicrosoft.com` |
| Authority host | `asoraauthlife.ciamlogin.com` |
| Client ID | `c07bb257-aaf0-4179-be95-fce516f92e8c` |
| Policy | `B2C_1_signupsignin` |

### B2C Redirect URI Setup

Register these redirect URIs in Azure Portal → App registrations →
`c07bb257-…` → Authentication → Platform: SPA:

```
https://app.lythaus.asora.co.za/auth/callback
http://localhost:8080/auth/callback          (local dev)
```

### PKCE Flow

1. `WebAuthService.startSignIn(provider)` builds an authorization URL with
   `response_type=code`, PKCE `code_challenge` (S256), and `state`.
2. `WebTokenStorage` persists `code_verifier` and `state` in
   `sessionStorage` (tab-scoped, cleared on close).
3. Browser navigates to B2C.
4. B2C redirects back to `/auth/callback?code=XXX&state=YYY`.
5. `AuthCallbackScreen` calls `WebAuthService.handleCallback(Uri.base)`:
   - Validates `state` (CSRF protection).
   - Exchanges `code` + `code_verifier` for tokens at the token endpoint.
   - Fetches user profile with the access token.
   - Stores tokens + user JSON in `sessionStorage`.
6. `AuthStateNotifier.setUser(user)` updates Riverpod state.
7. GoRouter redirect moves the user to `/`.

### Session Restore

On page reload, `AuthStateNotifier._loadCurrentUser()` checks
`WebAuthService().getStoredUser()` and `getAccessToken()` from
`sessionStorage`, avoiding an unnecessary network call.

## Key Files

| File | Purpose |
|---|---|
| `lib/core/routing/app_router.dart` | GoRouter configuration with auth redirect |
| `lib/features/auth/application/web_auth_service.dart` | PKCE browser redirect flow |
| `lib/features/auth/application/web_token_storage.dart` | Conditional export (real vs stub) |
| `lib/features/auth/application/web_token_storage_real.dart` | sessionStorage impl via `package:web` |
| `lib/features/auth/application/web_token_storage_stub.dart` | No-op stubs for native platforms |
| `lib/features/auth/presentation/auth_callback_screen.dart` | OAuth2 callback UI |
| `lib/ui/screens/adaptive_shell.dart` | Responsive shell (NavigationRail / BottomNav) |
| `lib/main.dart` | `MaterialApp.router` with `appRouterProvider` |
| `web/_redirects` | Cloudflare Pages SPA catch-all |

## Build & Deploy

### Local Development

```bash
flutter run -d chrome --dart-define=OAUTH2_REDIRECT_URI=http://localhost:8080/auth/callback
```

### Production Build

```bash
flutter build web --release
cp web/_redirects build/web/_redirects
```

### Cloudflare Pages

1. Build output directory: `build/web`
2. The `_redirects` file handles SPA routing: `/* /index.html 200`
3. Configure custom domain `app.lythaus.asora.co.za` in Cloudflare dashboard.

### CI (flutter-ci.yml)

The `web-build` job:
1. Runs `flutter build web --release`
2. Copies `web/_redirects` to `build/web/_redirects`
3. Uploads the `build/web` artifact

## Platform Guards

These features are gracefully disabled on web:

- **FCM push notifications** — `kIsWeb` guard in `AdaptiveShell` and `AppShell`
- **Biometric auth** — guard in `AuthService`
- **Crash reporting** — Firebase Crashlytics initializes only on Android
- **TLS certificate pinning** — shared Dio factories fall back to the browser adapter on web
- **Device security checks** — guard in `DeviceSecurityService`

## Pre-deploy Checklist

- [ ] `flutter analyze` reports no issues
- [ ] `flutter test` passes
- [ ] `flutter build web --release` succeeds
- [ ] `build/web/_redirects` exists with `/* /index.html 200`
- [ ] B2C redirect URIs registered for target domain
- [ ] `OAUTH2_*` dart-define values set for production
# Lythaus Web App — Architecture & Deployment Guide

## Overview

The Lythaus web app is a secondary surface built from the same Flutter codebase as the mobile app. It shares core business logic, UI components, and state management while adding web-specific routing, authentication, and responsive layout.

## Architecture

### Routing — GoRouter (`lib/core/routing/app_router.dart`)

Declarative routing via `go_router` replaces manual `Navigator.push` calls. Routes:

| Path | Screen | Auth required |
|------|--------|---------------|
| `/login` | AuthChoiceScreen | No |
| `/auth/callback` | AuthCallbackScreen | No |
| `/` | AdaptiveShell (Discover) | Yes or Guest |
| `/post/:postId` | PostDetailScreen | Yes or Guest |
| `/user/:userId` | ProfileScreen | Yes or Guest |
| `/invite/:code` | InviteRedeemScreen | Yes or Guest |
| `/moderation` | ModerationConsoleScreen | Yes |
| `/moderation/appeal` | AppealHistoryScreen | Yes |
| `/settings/notifications` | NotificationsSettingsScreen | Yes |

The `redirect` callback in `appRouterProvider` enforces auth:
- Unauthenticated + non-guest → redirect to `/login`
- Authenticated or guest on `/login` → redirect to `/`
- `/auth/callback` is always reachable (handles OAuth2 redirect)

### Authentication — PKCE Redirect Flow

Mobile uses `flutter_appauth` for OAuth2 PKCE. On web, the browser-native redirect flow is used instead:

1. **`WebAuthService.startSignIn()`** — Generates PKCE code_verifier/challenge, stores verifier + state in `sessionStorage`, redirects browser to the authorization endpoint.
2. **Browser navigates to B2C** — User authenticates.
3. **B2C redirects to `/auth/callback`** — `AuthCallbackScreen` reads the code from the URL.
4. **`WebAuthService.handleCallback()`** — Exchanges code for tokens via HTTP POST, stores tokens in `sessionStorage`, fetches user profile.
5. **Auth state updated** — `AuthStateNotifier.setUser()` is called, GoRouter redirects to `/`.

Key files:
- `lib/features/auth/application/web_auth_service.dart`
- `lib/features/auth/application/web_token_storage.dart` (conditional export)
- `lib/features/auth/application/web_token_storage_real.dart` (sessionStorage impl)
- `lib/features/auth/application/web_token_storage_stub.dart` (no-op stubs for native)
- `lib/features/auth/presentation/auth_callback_screen.dart`

**Product decision:** Tokens are stored in `sessionStorage` — closing the tab logs out the user. This is intentional for security (no persistent auth cookies on shared machines).

### Responsive Layout — AdaptiveShell (`lib/ui/screens/adaptive_shell.dart`)

`LayoutBuilder` switches between:
- **< 768px width**: `BottomNavigationBar` (existing `AsoraBottomNav`)
- **≥ 768px width**: `NavigationRail` with vertical divider

Four tabs: Discover, Create, Alerts, Profile. Guest mode blocks the Create tab with a snackbar.

### Platform Guards

Web-incompatible features are guarded with `kIsWeb`:

| Feature | File | Web behavior |
|---------|------|-------------|
| TLS cert pinning | `dio_client.dart` | Skipped (browser handles TLS) |
| Device security | `device_security_service.dart` | Always reports secure |
| Biometric auth | `auth_service.dart` | Returns false |
| Push notifications | `adaptive_shell.dart`, `notification_permission_service.dart` | Skipped/returns not-determined |

### CORS

The Azure Functions API handles CORS in application code:
- **General API** (`functions/src/shared/utils/http.ts`): Uses `CORS_ALLOWED_ORIGINS` env var, defaults to `*`. All necessary headers (`Authorization`, `Content-Type`) are in the allowlist.
- **Admin API** (`functions/src/admin/cors.ts`): Separate strict allowlist for the control panel. Not used by the consumer web app.

### API Base URL

Configured in `lib/core/config/environment_config.dart`:
- **Debug (web)**: `http://localhost:7072/api`
- **Debug (Android emulator)**: `http://10.0.2.2:7072/api`
- **Release**: `https://asora-function-dev-...azurewebsites.net/api`

## Build & Deploy

### Local development

```bash
# Run web in Chrome
flutter run -d chrome

# Build web release (includes SPA fallback for Cloudflare Pages)
flutter build web --release
cp web/_redirects build/web/_redirects
```

### CI

The `flutter-ci.yml` workflow includes a `web-build` job that runs `flutter build web --release` on every push/PR to `main`.

### Production deployment

The built output in `build/web/` can be deployed to any static hosting (Cloudflare Pages, Azure Static Web Apps, etc.).

**Required configuration before deploying:**
1. Register `{origin}/auth/callback` as a redirect URI in Azure AD B2C
2. Set `CORS_ALLOWED_ORIGINS` in Azure Functions to include the web app's origin (if not using wildcard)

## External Blockers

| Blocker | Status | Owner |
|---------|--------|-------|
| B2C redirect URI registration | Pending | Azure AD admin |
| Web domain DNS / hosting | Pending | Infrastructure |

## Files Created/Modified

### New files
- `lib/core/routing/app_router.dart` — GoRouter configuration
- `lib/features/auth/application/web_auth_service.dart` — PKCE redirect flow
- `lib/features/auth/application/web_token_storage.dart` — conditional export
- `lib/features/auth/application/web_token_storage_real.dart` — sessionStorage
- `lib/features/auth/application/web_token_storage_stub.dart` — no-op stubs
- `lib/features/auth/presentation/auth_callback_screen.dart` — OAuth2 callback
- `lib/ui/screens/adaptive_shell.dart` — responsive shell
- `web/_redirects` — Cloudflare Pages SPA fallback (`/* → /index.html 200`)
- `docs/evidence/web/web-audit-baseline.md` — Phase 0 proof gate
- `test/core/routing/app_router_test.dart`
- `test/ui/screens/adaptive_shell_test.dart`
- `test/features/auth/application/web_token_storage_test.dart`

### Modified files
- `lib/main.dart` — MaterialApp.router integration
- `lib/core/network/dio_client.dart` — kIsWeb guard for TLS pinning
- `lib/core/config/environment_config.dart` — localhost for web debug
- `lib/features/auth/application/oauth2_service.dart` — web auth delegation
- `lib/features/auth/application/auth_providers.dart` — setUser() method
- `lib/features/auth/application/auth_service.dart` — biometrics guard
- `lib/core/security/device_security_service.dart` — device security guard
- `lib/features/notifications/application/notification_permission_service.dart` — permissions guard
- `lib/ui/screens/app_shell.dart` — notification init guard
- `web/index.html` — Lythaus branding, OG tags, noscript
- `web/manifest.json` — Lythaus branding
- `.github/workflows/flutter-ci.yml` — web-build job
- `pubspec.yaml` — go_router, web dependencies

## Deployment Readiness

### Environment Variables

| Variable | Where | Purpose | Example |
|----------|-------|---------|---------|
| `CORS_ALLOWED_ORIGINS` | Azure Functions app settings | Allow web origin for API CORS | `https://app.lythaus.asora.co.za` |
| `B2C_TENANT_NAME` | Build-time config (`environment_config.dart`) | Azure AD B2C tenant | `lythausauth` |
| `B2C_CLIENT_ID` | Build-time config | OAuth2 client ID | `xxxxxxxx-xxxx-...` |
| `B2C_POLICY_NAME` | Build-time config | B2C sign-in/sign-up policy | `B2C_1_signupsignin` |
| `API_BASE_URL` | Build-time config | Functions API endpoint | `https://asora-function-dev.azurewebsites.net/api` |

Build-time values are baked into the JS bundle. They are not secrets (the client ID and tenant are public OAuth2 metadata). Actual secrets (client secrets) are never in the web bundle.

### DNS Assumptions

| Record | Value | Purpose |
|--------|-------|---------|
| `app.lythaus.asora.co.za` | CNAME → static host | Flutter web app |
| `lythaus.asora.co.za` / `www.lythaus.asora.co.za` | CNAME → marketing host | Astro marketing site |
| Both domains must have HTTPS (TLS) | Managed by hosting provider | PKCE redirect and secure cookies |

The web app and marketing site are separate origins. No cookie sharing or cross-origin SSO is required.

### Pre-Deploy Checklist

1. **Azure AD B2C:** Register `https://app.lythaus.asora.co.za/auth/callback` as a redirect URI under *Single-page application (SPA)* in the **client** app registration (not the backend/API registration). See [B2C Setup Steps](#b2c-redirect-uri-setup) below.
2. **CORS:** Set `CORS_ALLOWED_ORIGINS=https://app.lythaus.asora.co.za` in Azure Functions app settings (or keep `*` for dev).
3. **Build:** `flutter build web --release && cp web/_redirects build/web/_redirects` from the repo root.
4. **Upload:** Deploy `build/web/` to the static hosting target. Ensure the hosting provider returns `index.html` for all 404s (SPA fallback routing).
5. **Marketing site:** `cd apps/marketing-site && npm ci && npx astro build` → deploy `dist/` to marketing host.
6. **Canonical URL:** The marketing site domain is set in `astro.config.mjs` (`site` field). Currently `https://lythaus.asora.co.za`. Also update the URLs in `public/sitemap.xml` if the domain changes.
7. **Localhost callback:** If developing locally, also register `http://localhost:<port>/auth/callback` in B2C (matching the actual `flutter run -d chrome` port).

### Post-Deploy Smoke Checklist

Run these manually against the deployed web app after each release:

| # | Test | URL / Action | Expected |
|---|------|-------------|----------|
| 1 | Landing loads | `https://app.lythaus.asora.co.za/` | Redirects to `/login` (unauthenticated) |
| 2 | Login screen | `/login` | AuthChoiceScreen renders, sign-in buttons visible |
| 3 | Guest mode | Click "Continue as guest" | Redirects to `/`, Discover tab loads, Create tab shows snackbar |
| 4 | Auth callback (no code) | `/auth/callback` (no params) | Shows error with "Back to sign in" button |
| 5 | Post direct link | `/post/nonexistent-id` | PostDetailScreen loads (shows error for invalid ID) |
| 6 | Profile direct link | `/user/some-user-id` | ProfileScreen loads (may show error for unknown user) |
| 7 | Desktop layout | Resize browser ≥ 768px | NavigationRail appears instead of bottom nav |
| 8 | Mobile layout | Resize browser < 768px | BottomNavigationBar appears |
| 9 | Browser back | Navigate to a post, click back | Returns to previous route |
| 10 | Full auth flow | Sign in via B2C → verify feed loads → refresh page → verify session restores | User remains signed in after reload |
| 11 | Sign out | Sign out → verify redirect to `/login` | sessionStorage cleared, back button does not restore session |

### Rollback Path

1. **Static assets:** Revert to the previous `build/web/` deployment. If using blob storage or CDN, swap the blob container or purge the CDN cache to point to the prior build.
2. **DNS cutover:** If the web app was deployed with a DNS change, revert the CNAME to the previous target.
3. **Azure Functions:** Functions are independently deployed and versioned. Rolling back the web app does not require rolling back the API.
4. **B2C redirect URI:** The redirect URI can be left registered — it does not affect mobile apps. Only remove it if the web deployment is being permanently retired.

### Known Post-Launch Items

| Item | Severity | Action |
|------|----------|--------|
| Token refresh | HIGH | Implement silent renew (iframe or service worker) to avoid session expiry during long sessions |
| FCM web push | MEDIUM | Add Firebase web config + `firebase-messaging-sw.js` service worker |
| WASM target | LOW | Blocked by `flutter_secure_storage_web` deprecated APIs; JS target is fine |

---

## B2C Redirect URI Setup

Step-by-step instructions for registering the web app callback in Azure AD B2C.

### Prerequisites — Confirm Before Starting

| # | Item | Confirmed Value |
|---|------|----------------|
| 1 | **B2C Tenant** | `asoraauthlife.onmicrosoft.com` (authority host: `asoraauthlife.ciamlogin.com`) |
| 2 | **Client App Registration** | The **client** registration used by the Flutter login flow — **not** the backend/API registration. Client ID: `c07bb257-aaf0-4179-be95-fce516f92e8c` |
| 3 | **Sign-in Policy** | `B2C_1_signupsignin` |
| 4 | **Platform Type** | Single-page application (SPA) — browser-based Flutter web app using PKCE redirect flow |
| 5 | **Callback Path** | `/auth/callback` — hardcoded in `OAuth2Config.redirectUri` (returns `${Uri.base.origin}/auth/callback` on web) |
| 6 | **Production Host** | `app.lythaus.asora.co.za` (HTTPS) |

### Step 1 — Switch to the B2C Tenant

1. Open [Azure Portal](https://portal.azure.com)
2. Click **Directories + subscriptions** (top-right filter icon)
3. Switch into the B2C tenant that owns `asoraauthlife.onmicrosoft.com`

> This matters — changes made in the wrong tenant appear to succeed but have no effect on auth.

### Step 2 — Open the Client App Registration

1. Search for and open **Azure AD B2C**
2. Click **App registrations**
3. Select the client application with ID `c07bb257-aaf0-4179-be95-fce516f92e8c`

> Verify you are editing the **client** registration (the one the browser login uses), not the Functions API registration.

### Step 3 — Open Authentication Settings

1. Click **Authentication** in the left menu
2. Under **Platform configurations**, check what already exists

### Step 4 — Add SPA Redirect URIs

If a **Single-page application** platform exists, click **Add URI** in that section.
If not, click **Add a platform** → **Single-page application**.

Add these redirect URIs:

```
https://app.lythaus.asora.co.za/auth/callback
```

For local development, also add (matching the actual port you use):

```
http://localhost:3000/auth/callback
http://localhost:8080/auth/callback
```

If you have a staging host, add it too:

```
https://staging.lythaus.asora.co.za/auth/callback
```

**Do NOT register** any of these (they look close but will fail on exact match):
- `https://app.lythaus.asora.co.za` (missing `/auth/callback`)
- `https://lythaus.asora.co.za/auth/callback` (wrong subdomain)
- `https://app.asora.co.za/auth/callback` (wrong host)
- Any `http://` production URI (must be HTTPS)

### Step 5 — Save

Click **Save**. Do not navigate away without saving.

### Step 6 — Record the Change

After saving, record:

- App registration name: __________
- Client ID: `c07bb257-aaf0-4179-be95-fce516f92e8c`
- Exact redirect URIs added: __________
- Date/time of change: __________
- Changed by: __________

### Verification

1. Open `https://app.lythaus.asora.co.za` in a browser
2. Click **Sign in**
3. Complete the B2C login flow
4. Confirm the browser returns to `https://app.lythaus.asora.co.za/auth/callback`
5. Confirm the app enters the signed-in experience (Discover tab)
6. **Refresh the page** — confirm session restore works (user stays signed in)
7. **Sign out** — confirm redirect to `/login` and `sessionStorage` is cleared

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| B2C shows "redirect URI not registered" | Wrong URI or wrong app registration | Compare the exact URI in browser dev tools Network tab with what is registered |
| Login completes but app shows error | URI registered on API app, not client app | Move the URI to the client app registration |
| Works on localhost but not production | HTTP registered instead of HTTPS, or production URI not added | Add the exact HTTPS production URI |
| Works on one browser tab but not another | Expected — `sessionStorage` is tab-scoped | Each tab requires its own sign-in (by design, see ADR-W01) |
| DNS not resolving | CNAME not configured yet | Create `app.lythaus.asora.co.za` CNAME to your static host |
