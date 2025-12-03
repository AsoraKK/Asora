# Notifications Deployment Notes

_Owner: Notifications / FCM enablement for `asora-function-dev`_

## 1. Current Build & Deploy Flow (as implemented in repo)
- `npm run build` inside `functions/` performs `tsc`, `tsc-alias`, then runs `scripts/write-dist-entry.cjs`.
- `write-dist-entry.cjs` copies `host.json`/`package.json`/`package-lock.json` into `dist/`, installs production dependencies, preserves the compiled `src/**` + `shared/**`, and writes a CommonJS `index.js` that simply `require('./src/index.js')`.
- The workflow `.github/workflows/deploy-asora-function-dev.yml` gates for the **v4 programmatic model** (ensures no `function.json`, confirms `index.js` requires `src/index.js`, and smoke-loads the entrypoint). It zips the **contents** of `functions/dist`, uploads the archive to storage, and publishes it to `asora-function-dev` through the existing blob + Kudu flow.
- The compiled entry (`functions/dist/src/index.js`) eagerly registers `health` + `ready` and lazily imports the rest of the feature areas (auth, feed, moderation, privacy, notifications, etc.) via `app.http()`/`app.timer()`.

### Why only the health function is currently live
- The storage blob `functionapp.zip` that `asora-function-dev` runs today predates the programmatic bundle; it still contains only `index.js`, `host.json`, and `health/**` generated from the legacy file-based app. That archive stays untouched until the workflow runs end-to-end against `asora-function-dev`.
- Because that legacy zip does not include the compiled `src/**` tree, Azure only surfaces the `health` route. The newer notifications code exists locally (and builds into `dist/`) but has never been published to the dev Function App.

### Minimal repo-side steps to ship notifications
1. Ensure `npm run build` keeps emitting the full programmatic `dist/` bundle (already wired up).
2. Double-check `src/index.ts` imports/registers every notification HTTP handler and timer (HTTP routes already referenced; the timer import still needs to be added so the job is indexed).
3. Extend health reporting to surface FCM readiness so `/api/health` remains the contract used by app probes.
4. Re-run the existing workflow so the **same** blob-deploy path for `asora-function-dev` now uploads the richer bundle (no infra or ARM changes required).

## 2. Deployment Strategy Options

### Option A — File-based discovery (function.json per trigger)
- **Pros**
  - Very explicit per-function configuration.
  - Mirrors the currently running health-only package, so it feels familiar.
- **Cons**
  - Requires reintroducing generated `function.json` files for every notification endpoint + timer, fighting the current code layout and CI gates that mandate programmatic registration.
  - `write-dist-entry.cjs` would need to start shredding `src/**` again, undoing the work done for Flex/Future parity.
  - Higher risk of divergence (different model between `main` and what actually runs if we mix discovery styles).
- **Impact/Risk to `/api/health`**
  - Would need to migrate health back to file-based as well or run a hybrid; hybrid adds risk because the CI currently forbids `function.json` (warning today, but expectation is 0 files).
- **Required Code Changes (rough)**
  - Scaffold `notifications/**/function.json` definitions, ensure bundler copies them.
  - Rework `write-dist-entry.cjs` + workflow gates to allow/generate file-based metadata.

### Option B — Keep v4 programmatic model (current code)
- **Pros**
  - Aligns with the codebase today (`src/index.ts`, programmatic imports, CI gates, Flex parity).
  - Minimal changes: just guarantee notifications modules (HTTP + timer) are imported, error-handled, and present in `dist/`.
  - Easier to extend/guard (FCM validation, structured logging) in TypeScript rather than scattered `function.json`.
- **Cons**
  - Must ensure the Azure Functions host for `asora-function-dev` happily loads the larger bundle; requires confidence in the CI packaging.
  - Need to keep the build artifact size manageable (already handled by installing prod deps only).
- **Impact/Risk to `/api/health`**
  - Very low: health stays the synchronous import at the top of `src/index.ts`. Additional notification modules load asynchronously and are isolated behind `tryImport` guards.
- **Required Code Changes (rough)**
  1. Import/register the notification timer in `src/index.ts` (currently missing) and ensure HTTP handlers expose the desired routes (`devices`, `preferences`, `send`).
  2. Harden the FCM client + config service to expose `fcmConfigured`/diagnostics for health without throwing during startup.
  3. Add a local verification script that inspects the built ZIP and confirms the notifications handlers exist (per Task 6).
  4. Document build/deploy steps so the existing workflow can be re-run safely against `asora-function-dev`.

### Chosen Strategy: **Option B — Stick with v4 programmatic model**
Rationale: the repo, build scripts, and CI pipeline are already optimized for programmatic registration, and the notifications modules in `src/` follow that pattern. Reverting to file-based metadata would multiply risk, while keeping the current model only requires finishing the wiring + documentation so the already-working `/api/health` keeps returning 200 and the new endpoints/timers deploy through the same zip pipeline.

## 3. Next Implementation Steps (code-only)
1. Wire notifications HTTP routes and `processPendingNotifications` timer into `src/index.ts` (programmatic registration).
2. Ensure the FCM client validates env vars and surfaces status flags consumable by `/api/health`.
3. Update health output to include `fcmConfigured` + error reason without impacting the 200 status for the happy path.
4. Extend build artifacts + helper scripts to verify the packaged ZIP before using the existing blob/Kudu publish path to refresh `asora-function-dev`.

## 4. Local build + artifact verification
Run these from the repo root to produce the exact bundle the workflow deploys:

1. `cd functions && npm ci && npm run build`
  - Produces `functions/dist/` with the programmatic entrypoint and installs prod-only deps.
2. `rm -f functions-dist.zip && cd functions/dist && zip -r ../../functions-dist.zip .`
  - Creates the zip that matches what the workflow uploads to Flex (zip the **contents** of `dist`).
3. `cd functions && npm run verify:dist`
  - Executes `scripts/verify-dist-structure.cjs`, unzips `../functions-dist.zip`, ensures `host.json`, `index.js`, `src/index.js`, `shared/` all exist, and asserts that the notifications HTTP handlers plus `processPendingNotifications` timer are present in the artifact.

`npm run verify:dist` is now an explicit guard in `.github/workflows/deploy-asora-function-dev.yml` (runs immediately after the zip step) so any missing handler/timer fails CI before we touch Azure.

## 5. Triggering the deploy workflow
- Preferred path: push the notifications changes to `main` (or merge the PR) so the workflow runs automatically with the correct SHA.
- For manual redeploys without a new commit: `gh workflow run deploy-asora-function-dev.yml --ref main` (requires GitHub CLI auth). Monitor the run in GitHub Actions until both `deploy` and `acceptance` jobs succeed.
- The workflow publishes `functions-dist.zip` to the Flex storage container with a SHA-scoped filename, syncs triggers, restarts the app, and performs the health/404/function-count gates automatically.

## 6. Post-deploy verification (manual spot checks)
1. `curl https://asora-function-dev.azurewebsites.net/api/health | jq '.'`
  - Ensure `notifications.fcmConfigured` is `true` (or inspect `notifications.failureReason` when false). Any misconfiguration surfaces here without breaking the 200 unless health itself fails.
2. `curl -i -X POST https://asora-function-dev.azurewebsites.net/api/notifications/send -H "x-functions-key: <admin-key>" -H "Content-Type: application/json" -d '{"eventType":"admin:test","payload":{}}'`
  - Confirms the admin send endpoint is reachable; use a dry-run eventType in dev.
3. `curl -s https://asora-function-dev.azurewebsites.net/api/__bogus__ -o /dev/null -w "%{http_code}"`
  - Should stay `404`, matching the workflow acceptance gate.

These steps mirror the workflow’s runtime gates and give fast feedback if Flex indexing or notifications wiring regresses before running end-to-end tests.
