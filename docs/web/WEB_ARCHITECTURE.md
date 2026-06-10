# Lythaus Web Architecture

> Authoritative reference for the Flutter web target of the Lythaus app.

## Overview

Lythaus ships as a single Flutter codebase targeting Android, iOS, and web on
Cloudflare Pages. The web target adds:

- GoRouter for URL-addressable routes.
- PKCE auth via browser redirects against the custom OAuth2 server.
- A responsive shell with NavigationRail on desktop and BottomNav on mobile.
- Platform guards so FCM, biometrics, and TLS pinning degrade safely on web.

## Trust Boundaries

| Traffic class | Entry points | Guard | Cache policy | State |
|---|---|---|---|---|
| Public | Marketing site, public legal pages, app login screens | No user JWT | Not cacheable as personalized content | Live |
| Authenticated | Flutter app routes and user APIs | `Authorization: Bearer <token>` + `requireAuth` | `private, no-store` | Live |
| Admin | Control panel and `/_admin/*` APIs | Admin JWT / Cloudflare Access | `private, no-store` | Planned for the Access gate |
| Anonymous-cacheable | `GET /api/feed/discover`, `GET /api/feed/news` | No `Authorization` header | `public, s-maxage=30, stale-while-revalidate=60` | Live |

Only the anonymous-cacheable boundary is allowed through the feed-cache Worker.
Public, authenticated, and admin traffic must bypass that edge cache path.

## Production URLs

| Surface | URL |
|---|---|
| Flutter web app | `https://app.lythaus.asora.co.za` |
| Marketing site | `https://lythaus.asora.co.za` |

## Architecture Diagram

```
Browser
  |
  |-- / (AdaptiveShell)        - Discover, Create, Alerts, Profile
  |-- /login                   - AuthChoiceScreen
  |-- /auth/callback           - AuthCallbackScreen
  |-- /user/test               - ProfileScreen(test)
  |-- /post/test               - PostDetailScreen(test)
  |-- /post/:postId            - PostDetailScreen
  |-- /user/:userId            - ProfileScreen
  |-- /invite/:code            - InviteRedeemScreen
  |-- /moderation              - ModerationConsoleScreen
  |-- /moderation/appeal       - AppealHistoryScreen
  `-- /settings/notifications  - NotificationsSettingsScreen
```

## Authentication

### OAuth2 Configuration

| Field | Value |
|---|---|
| Authorization endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/authorize` |
| Token endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/token` |
| UserInfo endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/userinfo` |
| Client ID | `asora-mobile-app` |
| Redirect URI | `${Uri.base.origin}/auth/callback` |
| Scopes | `openid email profile offline_access` |

The browser callback URI must match the deployed web origin. Release builds
fail fast if the callback or API origins resolve to localhost, private IPs, or
other non-public hosts.

### PKCE Flow

1. `WebAuthService.startSignIn(provider)` builds an authorization URL with
   `response_type=code`, PKCE `code_challenge` (S256), and `state`.
2. `WebTokenStorage` persists `code_verifier` and `state` in `sessionStorage`.
3. Browser navigates to the authorization endpoint.
4. The authorization server redirects back to `/auth/callback?code=XXX&state=YYY`.
5. `AuthCallbackScreen` calls `WebAuthService.handleCallback(Uri.base)`.
6. `AuthStateNotifier.setUser(user)` updates Riverpod state.
7. GoRouter redirects the user to `/`.

### Session Restore

On page reload, `AuthStateNotifier._loadCurrentUser()` checks
`WebAuthService().getStoredUser()` and `getAccessToken()` from sessionStorage.

## Key Files

| File | Purpose |
|---|---|
| `lib/features/auth/application/web_auth_service.dart` | PKCE browser redirect flow |
| `lib/features/auth/application/web_token_storage.dart` | Conditional export (real vs stub) |
| `lib/features/auth/application/web_token_storage_real.dart` | sessionStorage implementation |
| `lib/features/auth/application/web_token_storage_stub.dart` | No-op stubs for native platforms |
| `lib/features/auth/presentation/auth_callback_screen.dart` | OAuth2 callback UI |
| `lib/features/auth/application/auth_providers.dart` | Auth state and token refresh wiring |
| `lib/core/routing/app_router.dart` | GoRouter configuration with auth redirect |
| `lib/main.dart` | `MaterialApp.router` with `appRouterProvider` |
| `web/_redirects` | Cloudflare Pages SPA catch-all |

## Component States

| Component | State | Note |
|---|---|---|
| Flutter web app | Live | Authenticated browser experience |
| Marketing site | Live | Public, crawlable surface |
| `cloudflare/worker.ts` | Partial | Only anonymous discover/news traffic is cached |
| `functions/src/admin/accessAuth.ts` | Planned | Separate admin gate, not enabled yet |
| `workers/feed-cache/src/index.js` | Deprecated | Compatibility wrapper for the legacy route binding |

## Build And Deploy

### Local Development

```bash
flutter run -d chrome
```

### Production Build

```bash
bash scripts/cf-pages-build.sh
```

The build script sources `cloudflare/pages-release.sh`, which is the tracked
source of truth for the release-web origins used by both Cloudflare Pages and
GitHub Actions.

## Deployment Readiness

### Environment Variables

| Variable | Where | Purpose | Example |
|---|---|---|---|
| `CORS_ALLOWED_ORIGINS` | Azure Functions app settings | Allow web origin for API CORS | `https://app.lythaus.asora.co.za` |
| `OAUTH2_AUTHORIZATION_ENDPOINT` | Build-time config | OAuth2 authorization endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/authorize` |
| `OAUTH2_TOKEN_ENDPOINT` | Build-time config | OAuth2 token endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/token` |
| `OAUTH2_USERINFO_ENDPOINT` | Build-time config | OAuth2 userinfo endpoint | `https://asora-function-flex.azurewebsites.net/api/auth/userinfo` |
| `OAUTH2_CLIENT_ID` | Build-time config | OAuth2 client ID | `asora-mobile-app` |
| `OAUTH2_SCOPE` | Build-time config | OAuth2 scopes | `openid email profile offline_access` |
| `API_BASE_URL` | Build-time config | Functions API endpoint | `https://asora-function-dev.azurewebsites.net/api` |

Build-time values are baked into the JS bundle. They are not secrets.

### DNS Assumptions

| Record | Value | Purpose |
|---|---|---|
| `app.lythaus.asora.co.za` | CNAME to static host | Flutter web app |
| `lythaus.asora.co.za` / `www.lythaus.asora.co.za` | CNAME to marketing host | Astro marketing site |
| Both domains must have HTTPS | Managed by hosting provider | PKCE redirect and secure cookies |

The web app and marketing site are separate origins. No cookie sharing or
cross-origin SSO is required.

### Pre-Deploy Checklist

1. Confirm `WebAuthService.redirectUri` resolves to the deployed web origin.
2. Set `CORS_ALLOWED_ORIGINS=https://app.lythaus.asora.co.za` in Azure Functions.
3. Run `bash scripts/cf-pages-build.sh` from the repo root.
4. Deploy `build/web/` to the static hosting target.
5. Deploy the marketing site separately from `apps/marketing-site`.
6. Keep the release-web origins in `cloudflare/pages-release.sh` in sync with
   the deployed API and auth endpoints.

### Post-Deploy Smoke Checklist

Run these manually against the deployed web app after each release:

| # | Test | URL / Action | Expected |
|---|---|---|---|
| 1 | Landing loads | `https://app.lythaus.asora.co.za/` | Redirects to `/login` when unauthenticated |
| 2 | Login screen | `/login` | AuthChoiceScreen renders |
| 3 | Guest mode | Click "Continue as guest" | Redirects to `/`, Discover tab loads |
| 4 | Auth callback | `/auth/callback` with no params | Shows an error and a back button |
| 5 | Public test routes | `/user/test` and `/post/test` | Both load directly and survive refresh |
| 6 | Desktop layout | Resize browser >= 768px | NavigationRail appears |
| 7 | Mobile layout | Resize browser < 768px | BottomNavigationBar appears |
| 8 | Full auth flow | Sign in via PKCE redirect, refresh page | Session restores |
| 9 | Sign out | Sign out and return to `/login` | sessionStorage is cleared |

### Rollback Path

1. Revert the previous `build/web/` deployment.
2. Restore the prior DNS target if the web app was moved.
3. Roll back the Azure Functions deployment independently if needed.

## Known Post-Launch Items

| Item | Severity | Action |
|---|---|---|
| Token refresh | High | Implement silent renew to reduce session expiry during long sessions |
| FCM web push | Medium | Add Firebase web config and a service worker |
| WASM target | Low | Blocked by `flutter_secure_storage_web` deprecated APIs |
