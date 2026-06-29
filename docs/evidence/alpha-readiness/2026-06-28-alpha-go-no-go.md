# Alpha Go/No-Go Evidence - 2026-06-28

Scope: webapp/API first, internal Android second. Play Console, TestFlight, public store submission, and full store-signing evidence are beta blockers unless separately completed.

Branch: `main`

## Current Decision

- Status: repo-local web/API validation is closed for the current prepared diff; live web/feed/cache smoke passed; DSR queue execution remains an alpha blocker.
- Alpha target: controlled invite/internal alpha, not public launch.
- Primary runtime proof target: `lythaus-web` webapp plus Azure Functions API.
- Secondary runtime proof target: internal Android install/build path.
- Do not commit, push, deploy, or mutate external consoles without explicit approval.

## P0 Alpha Checklist

| Area | Status | Evidence / Command |
|---|---|---|
| Working tree stabilized | Prepared, not committed | Current diff contains generated OpenAPI Dart client updates, alpha auth/profile test fixes, and deterministic generated-client trimming; final commit/push not performed |
| Canonical OpenAPI aligned | Repo-local passed | `npm run openapi:lint`; `npm run openapi:bundle`; `npm run openapi:validate:examples`; `npm run openapi:test:contract` |
| Product policy validated | Repo-local passed | Backend post route tests verify AI-generated blocks with `AI_CONTENT_BLOCKED`; Flutter/authorship tests verify public labels; no public numeric AI score surface added |
| Alpha auth scope locked | Repo-local passed | Guest, Google, and Email enabled by default; Apple and World ID visible as beta-disabled unless build flags enable them |
| Route protection proven | Repo-local passed | `npm run routes:guard`; `npm run test:route-guards` |
| Mobile staff tools gated | Repo-local passed | Profile screen shows staff tools only to moderator/admin roles; Control Panel only to admin |
| Moderation and AI flows proven | Repo-local passed | Full backend suite plus focused Flutter post/moderation tests passed |
| DSR queue execution proven | Blocker | Authenticated export/delete enqueue succeeded in dev, but both requests remained `queued` with `attempt=0` for 18 polls; queue account/name settings match and obvious managed-identity queue RBAC is present; see `2026-06-28-dsr-live-drill.md` and `2026-06-29-dsr-root-cause-and-operator-actions.md` |
| Privacy logging audit | Repo-local passed, live diagnostics weak | Full backend suite includes privacy/redaction tests; live App Insights returned no DSR rows because `host.json` excludes request/trace/exception telemetry |
| Webapp/feed/cache proof | Live smoke passed, perf target pending | Full beta browser smoke passed; edge anonymous discover returns public cache headers and authenticated discover bypasses with `private, no-store`; 200 ms feed p95 remains unproven |
| Internal Android path | Partial proof passed | `flutter doctor -v` reports no issues and Android licenses accepted; `:app:processReleaseMainManifest` passed with a local non-secret Firebase placeholder; installable/internal build still needs real Firebase config and signing/distribution proof |
| Alpha support/rollback plan | Pending | Invite cohort, support channel, rollback owner, known issues, and go/no-go approver recorded |

## Repo-Local Validation Run

- `git diff --check` - passed; Git reported line-ending warnings only.
- `npm run openapi:lint` - passed.
- `npm run openapi:bundle` - passed and updated `api/openapi/dist/openapi.json`.
- `npm run openapi:validate:examples` - passed.
- `npm run openapi:test:contract` - passed; live requests skipped because the configured staging domain was unreachable locally.
- `npm run routes:guard` - passed and updated `route-inventory.json`.
- `npm run test:route-guards` - passed.
- `cd functions; npm run typecheck` - passed.
- `cd functions; npm test` - passed: 196 suites, 2215 passed, 12 skipped.
- `flutter analyze` - passed.
- `flutter test` - passed: 3619 passed, 5 skipped. Non-fatal hit-test warnings remain in custom feed creation tests.
- Focused Flutter auth/profile/feed/post/moderation/P1 tests - passed.
- Flutter web release build with staging API defines - passed; emitted wasm dry-run warnings from `flutter_secure_storage_web`.
- Marketing site build - passed after `npm --prefix apps/marketing-site ci`; npm audit reported 13 dependency findings in that app install.
- `flutter doctor -v` - passed; Android SDK/toolchain clean and all Android licenses accepted.
- Android release manifest processing - passed with a local non-secret Firebase placeholder; the placeholder was removed afterward. Real internal Android distribution remains blocked by absent `android/app/google-services.json`/Firebase secret injection and signing/distribution proof.
- Azure dev DSR live drill - blocker reproduced: authenticated export/delete enqueue returned HTTP 200, but both requests stayed `queued` with `attempt=0` for 18 polls. The queue trigger is registered and the Function managed identity has queue/blob/storage roles on the DSR account, so the remaining blocker is queue-trigger execution, host/runtime diagnostics, or deployment/runtime state.
- DSR diagnostic patch - repo-local only: enqueue now resolves the queue URI from `DSR_QUEUE_CONNECTION` when present, logs queue account/name diagnostics, and the worker logs sanitized receive/resolution/completion/failure markers. `scripts/dsr-drills/live-dsr-queue-drill.mjs` exits non-zero when export/delete remain `queued` with `attempt=0`.
- Full beta browser smoke - passed with `node scripts/beta-smoke.mjs`; report written to `docs/evidence/alpha-readiness/2026-06-28-beta-smoke-report.json`. Non-blocking console noise observed: CSP report-only `upgrade-insecure-requests`, refused browser `User-Agent` override, and one expected unauthorized resource response.
- Live edge cache/CORS probe - passed for the alpha boundary: `https://dev.asora.co.za/api/feed/discover?limit=1` returned `Cache-Control: public, s-maxage=30, stale-while-revalidate=60` for anonymous traffic and `Cache-Control: private, no-store` with `X-Cache: BYPASS` for authenticated traffic; CORS preflight from `https://lythaus-web.pages.dev` returned HTTP 204 with the expected origin.
- k6 smoke/feed - passed using a temporary local k6 binary. Health p95 was 262.75 ms with 0.00% error rate; feed-read p95 was 796.96 ms with 0.00% error rate. This proves live reachability but not the 200 ms feed p95 target.
- Current-head GitHub Actions cannot turn green until the prepared diff is committed and pushed; no commit or push was performed.

## Beta-Deferred Items

- Play Console app record, Data Safety, content rating, graphics, internal testing release evidence.
- App Store Connect/TestFlight setup and App Privacy evidence.
- Public store screenshots and review notes.
- Full signing-material checklist for public store release.
- Representative k6 scale proof and 200 ms feed p95 attainment.
- Feed performance follow-up: current feed-read p95 is above the 200 ms target. Handle in a separate performance task after DSR, likely involving materialized/precomputed feed candidates, anonymous cache validation, and batched reputation lookups.

## Secret Handling

- Do not print tokens, keys, full connection strings, private keys, JWT secrets, OAuth client secrets, database passwords, or API keys.
- If a sensitive value is encountered, record only path, variable/key name, injection/commit status, and concern level.
