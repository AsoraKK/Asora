# Alpha Go/No-Go Evidence - 2026-06-28

Scope: webapp/API first, internal Android second. Play Console, TestFlight, public store submission, and full store-signing evidence are beta blockers unless separately completed.

Branch: `main`

## Current Decision

- Status: repo-local web/API validation is partially closed; live staging proof is still required before alpha.
- Alpha target: controlled invite/internal alpha, not public launch.
- Primary runtime proof target: `lythaus-web` webapp plus Azure Functions API.
- Secondary runtime proof target: internal Android install/build path.
- Do not commit, push, deploy, or mutate external consoles without explicit approval.

## P0 Alpha Checklist

| Area | Status | Evidence / Command |
|---|---|---|
| Working tree stabilized | In progress | `git status --short --branch`; `git diff --stat`; final diff summary required |
| Canonical OpenAPI aligned | Repo-local passed | `npm run openapi:lint`; `npm run openapi:bundle`; `npm run openapi:validate:examples`; `npm run openapi:test:contract` |
| Product policy validated | Repo-local passed | Backend post route tests verify AI-generated blocks with `AI_CONTENT_BLOCKED`; Flutter/authorship tests verify public labels; no public numeric AI score surface added |
| Alpha auth scope locked | Repo-local passed | Guest, Google, and Email enabled by default; Apple and World ID visible as beta-disabled unless build flags enable them |
| Route protection proven | Repo-local passed | `npm run routes:guard`; `npm run test:route-guards` |
| Mobile staff tools gated | Repo-local passed | Profile screen shows staff tools only to moderator/admin roles; Control Panel only to admin |
| Moderation and AI flows proven | Repo-local passed | Full backend suite plus focused Flutter post/moderation tests passed |
| DSR queue execution proven | Blocked by staging/live proof | Need staged export/delete request to move beyond queued; prior evidence points to queue-trigger consumption gap |
| Privacy logging audit | Repo-local passed, live pending | Full backend suite includes privacy/redaction tests; live App Insights/log review still required |
| Webapp/feed/cache proof | Repo-local passed, live pending | Flutter web release build and marketing build passed; live beta browser smoke/CORS proof still required |
| Internal Android path | Blocked by local SDK | `flutter build apk --debug` failed because Android SDK Build Tools 35.0.0 is reported corrupted locally |
| Alpha support/rollback plan | Pending | Invite cohort, support channel, rollback owner, known issues, and go/no-go approver recorded |

## Repo-Local Validation Run

- `git diff --check` - passed.
- `npm run openapi:lint` - passed.
- `npm run openapi:bundle` - passed and updated `api/openapi/dist/openapi.json`.
- `npm run openapi:validate:examples` - passed.
- `npm run openapi:test:contract` - passed; live requests skipped because the configured staging domain was unreachable locally.
- `npm run routes:guard` - passed and updated `route-inventory.json`.
- `npm run test:route-guards` - passed.
- `cd functions; npm run typecheck` - passed.
- `cd functions; npm test` - passed: 196 suites, 2215 passed, 12 skipped.
- Focused Flutter auth/profile/feed/post/moderation/P1 tests - passed.
- Flutter web release build with staging API defines - passed; emitted wasm dry-run warnings from `flutter_secure_storage_web`.
- Marketing site build - passed after `npm --prefix apps/marketing-site ci`; npm audit reported 13 dependency findings in that app install.
- Internal Android debug build - failed due local SDK Build Tools 35.0.0 corruption; no repo code failure proven.
- Live beta smoke, k6 smoke/feed, Cloudflare Access allow-path, and DSR queue proof were not run locally because the required smoke/access credentials were not present in environment variables.

## Beta-Deferred Items

- Play Console app record, Data Safety, content rating, graphics, internal testing release evidence.
- App Store Connect/TestFlight setup and App Privacy evidence.
- Public store screenshots and review notes.
- Full signing-material checklist for public store release.
- k6 scale proof beyond alpha smoke unless credentials and staging target are available during alpha validation.

## Secret Handling

- Do not print tokens, keys, full connection strings, private keys, JWT secrets, OAuth client secrets, database passwords, or API keys.
- If a sensitive value is encountered, record only path, variable/key name, injection/commit status, and concern level.
