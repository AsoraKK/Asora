# Web Architecture Decision Records

> ADRs for the Lythaus Flutter-web enablement project.

---

## ADR-W01: sessionStorage for Auth Tokens

**Status:** Accepted

**Context:** Web apps need to store OAuth2 tokens client-side. Options:
`localStorage`, `sessionStorage`, cookies, in-memory.

**Decision:** Use `sessionStorage` via `WebTokenStorage`.

**Rationale:**
- Tab-scoped — tokens are not shared across tabs or windows.
- Automatically cleared when the tab closes — no stale tokens.
- Not sent with HTTP requests (unlike cookies) — no CSRF via token leakage.
- Sufficient for a session-based auth model with B2C.

**Consequences:** Users must re-authenticate when opening a new tab. Acceptable
for an invite-only beta where security > convenience.

---

## ADR-W02: Guard-Not-Delete for Legacy Platform Code

**Status:** Accepted

**Context:** Existing code uses `flutter_appauth`, `flutter_secure_storage`,
`local_auth`, and FCM — none of which work on web.

**Decision:** Wrap platform-specific calls with `kIsWeb` / `Platform` guards
instead of removing or refactoring them.

**Rationale:**
- Minimises diff size and regression risk on Android/iOS.
- Guards are cheap one-liners (`if (kIsWeb) return;`).
- The mobile paths remain unchanged and fully tested.

**Consequences:** Slight code duplication (guard + web alternative). Acceptable
given the shared codebase model.

---

## ADR-W03: GoRouter for Web Navigation

**Status:** Accepted

**Context:** Flutter's default `Navigator` produces opaque URLs (`/#/`). The web
target needs clean, shareable URLs.

**Decision:** Adopt `go_router` with hash-free path-based routing.

**Rationale:**
- Officially maintained by the Flutter team.
- Declarative redirect logic integrates cleanly with Riverpod auth state.
- Named routes (`AppRoutes.*`) keep navigation type-safe.

**Consequences:** Mobile navigation also routes through GoRouter. The existing
`AsoraAppShell` bottom-nav is replaced by `AdaptiveShell` for the web entry
point.

---

## ADR-W04: Adaptive Shell (Responsive Layout)

**Status:** Accepted

**Context:** A mobile-first bottom nav bar wastes space on wide viewports.

**Decision:** `AdaptiveShell` uses `LayoutBuilder` with a 768 px breakpoint:
- ≥ 768 px → `NavigationRail` + `VerticalDivider` + content
- < 768 px → `AsoraBottomNav` + `IndexedStack`

**Rationale:**
- Material 3 pattern (rail for desktop, bottom bar for mobile).
- Single widget replaces both layouts, reducing maintenance.
- `IndexedStack` + `TickerMode` preserves tab state while hiding inactive tabs.

---

## ADR-W05: PKCE Browser Redirect (No flutter_appauth on Web)

**Status:** Accepted

**Context:** `flutter_appauth` only supports Android/iOS/macOS. Web needs a
different OAuth2 flow.

**Decision:** `WebAuthService` implements the Authorization Code + PKCE flow
using browser redirects:
1. Build auth URL with `code_challenge` (S256).
2. Store `code_verifier` + `state` in `sessionStorage`.
3. Redirect browser to B2C.
4. On `/auth/callback`, exchange code for tokens via HTTP POST.

**Rationale:**
- PKCE is the recommended flow for public (SPA) clients.
- No client secret required — safe for browser environments.
- State parameter prevents CSRF.

---

## ADR-W06: Conditional Export for Platform Abstraction

**Status:** Accepted

**Context:** `WebTokenStorage` uses `package:web` (sessionStorage), which fails
to compile on native platforms.

**Decision:** Use Dart conditional exports:
```dart
export 'web_token_storage_stub.dart'
    if (dart.library.js_interop) 'web_token_storage_real.dart';
```

**Rationale:**
- Official Dart mechanism for platform-specific code.
- No build flags or code generation required.
- Stub compiles on all platforms; real impl only loaded on web.

---

## ADR-W07: Cloudflare Pages with _redirects

**Status:** Accepted

**Context:** SPA routing requires all paths to serve `index.html`. Cloudflare
Pages supports a `_redirects` file for this.

**Decision:** Place `web/_redirects` with `/* /index.html 200` and copy it into
`build/web/` during the build step.

**Rationale:**
- Simpler than configuring a custom server or edge worker.
- The `200` status (rewrite, not redirect) preserves the URL for GoRouter.
- CI copies the file automatically (`cp web/_redirects build/web/_redirects`).
# Lythaus Web — Architecture Decision Records

**Last updated:** 2026-04-01

---

## ADR-W01: sessionStorage for Web Token Storage

**Status:** Accepted
**Context:** The mobile app stores OAuth2 tokens in `FlutterSecureStorage` (iOS Keychain / Android Keystore). On web, `FlutterSecureStorage` uses IndexedDB, which is persistent and accessible to any JS running on the same origin.
**Decision:** Store tokens in `sessionStorage` via `package:web`. Tokens are scoped to the browser tab and cleared on tab close.
**Consequences:**
- Closing the tab logs out the user (intentional for shared-machine security).
- No cross-tab session sharing — each tab requires its own sign-in.
- Token refresh must happen within the same tab session.

---

## ADR-W02: No Background Token Refresh on Web

**Status:** Accepted (post-launch reliability limitation)
**Context:** Mobile apps can refresh tokens silently via `flutter_appauth`. On web, there is no equivalent background mechanism without a service worker or iframe-based silent renew.
**Decision:** Accept that web tokens expire with the session. Users must re-authenticate when tokens expire.
**Consequences:**
- Long-lived sessions may experience API failures when the access token expires.
- This is a **real post-launch reliability limitation**, not just a documentation note.
- Mitigation: session-scoped tokens limit blast radius; Dio interceptor returns to login on 401.

---

## ADR-W03: Surface Separation (Flutter SPA vs Marketing Site)

**Status:** Accepted
**Context:** Flutter compiles to a single-page application with a hash-based or path-based router. SPAs are not crawlable by search engines without server-side rendering or prerendering.
**Decision:** Maintain two separate surfaces:
1. **Flutter web app** (`lib/`, `web/`) — authenticated browser experience.
2. **Marketing site** (`apps/marketing-site/`, Astro 4.15) — static, crawlable SEO surface.

`robots.txt`, `sitemap.xml`, and OG meta tags live in the marketing site. The Flutter SPA does **not** serve SEO content.
**Consequences:**
- Clean separation of concerns — the app is an app, the marketing site is a website.
- Two deployment pipelines.
- Deep links into the app (e.g., `/post/:postId`) are not crawlable; the marketing site can link to the app for authenticated content.

---

## ADR-W04: Conditional Exports for Web-Only Code

**Status:** Accepted
**Context:** Dart's `dart:io` and `dart:html` are mutually exclusive — `dart:io` is unavailable on web, `dart:html` is unavailable on native. Some code (token storage, PKCE flow) must differ by platform.
**Decision:** Use Dart conditional exports:
```dart
export 'web_token_storage_stub.dart'
    if (dart.library.js_interop) 'web_token_storage_real.dart';
```
The `_real` file imports `package:web` for `sessionStorage` access. The `_stub` file provides no-op implementations that throw on access, ensuring native code never accidentally calls web APIs.
**Consequences:**
- Single import path (`web_token_storage.dart`) works on all platforms.
- Compile-time platform selection — no runtime overhead.
- Stub throws immediately if web code leaks into native context.

---

## ADR-W05: kIsWeb Runtime Guards (Not Import Guards)

**Status:** Accepted
**Context:** Several packages (`dart:io`, `path_provider`, `share_plus`, `flutter_jailbreak_detection`) import fine on web (Dart's web stubs satisfy the compiler) but throw at runtime.
**Decision:** Use `kIsWeb` runtime guards rather than conditional imports for platform-specific UI behavior. The `dart:io` import compiles to a web stub; runtime access is prevented by `if (kIsWeb) return;` checks.
**Consequences:**
- Simpler code — no conditional import boilerplate for every guarded feature.
- Must be disciplined about guard placement (before any `Platform.isX` or `File()` call).
- Tree-shaking removes the dead native code paths from the web build.

---

## ADR-W06: GoRouter for Web-Compatible Navigation

**Status:** Accepted
**Context:** The existing app used imperative `Navigator.push` calls. Web apps need URL-addressable routes, browser back-button support, and deep linking.
**Decision:** Adopt `go_router` with declarative routes and an auth redirect callback. All top-level navigation is URL-addressable.
**Consequences:**
- Browser back/forward buttons work correctly.
- URLs are shareable and deep-linkable.
- Auth redirect logic centralised in one place (`appRouterProvider`).
- Existing `Navigator.push` calls for sub-navigation (e.g., settings → sub-screen) remain as-is — GoRouter handles top-level routing only.

---

## ADR-W07: Responsive Breakpoint at 768px

**Status:** Accepted
**Context:** The mobile app uses `BottomNavigationBar`. On desktop-width browsers, a side navigation rail provides better UX.
**Decision:** `AdaptiveShell` uses a `LayoutBuilder` with a 768px breakpoint. Below: bottom nav. At or above: `NavigationRail`.
**Consequences:**
- Tablets in portrait may hit either layout depending on exact width.
- Single breakpoint keeps logic simple; additional breakpoints can be added later.
- Guest mode blocks the Create tab with a snackbar on both layouts.

---

## ADR-W08: FCM Web Push Deferred

**Status:** Deferred
**Context:** Firebase Cloud Messaging on web requires: (1) Firebase web config in `index.html`, (2) `firebase-messaging-sw.js` service worker, (3) browser notification permission flow. The current codebase uses native FCM via `firebase_messaging` package.
**Decision:** Defer web push notifications to post-launch. The in-app notification tab provides the core notification experience on web.
**Consequences:**
- Web users do not receive push notifications.
- Reduces launch scope and complexity.
- Can be added later without architectural changes (additive service worker + config).

---

## ADR-W09: Legacy OAuth2Service Guard

**Status:** Accepted
**Context:** `lib/services/oauth2_service.dart` wraps `FlutterAppAuth`, which throws on web. It is still imported by `auth_controller.dart` and `service_providers.dart`.
**Decision:** Guard, don't delete. Changed `FlutterAppAuth` from eager `const` initialization to a lazy getter with `assert(!kIsWeb)`. On web, the `WebAuthService` PKCE flow is used instead; the legacy service is never invoked.
**Consequences:**
- No import-graph disruption.
- Clear assertion failure if accidentally called on web.
- Legacy service remains available for mobile.

---

## ADR-W10: Profile Route Parameter

**Status:** Accepted
**Context:** The `/user/:userId` route existed but `ProfileScreen` ignored the path parameter, always showing the current user's profile.
**Decision:** Add optional `userId` parameter to `ProfileScreen`. When `userId` is provided and differs from the current user, show a read-only profile (no settings, admin, or moderation links). When `null` or matching the current user, show the full owner view.
**Consequences:**
- Deep-linkable user profiles: `https://app.lythaus.asora.co.za/user/abc123` shows that user's profile.
- Follow/unfollow works on other users' profiles.
- Owner-only actions (settings, control panel, moderation hub) are hidden for non-owners.
