# Copilot Instructions

## What to know first
- Start with [`docs/ADR_001_TLDR.md`](../docs/ADR_001_TLDR.md) for the product vision, target KPIs, and how the Flutter front end aligns with Azure Functions + Cosmos.
- The repo is split: Flutter app in `lib/` (Riverpod-based clean architecture) and Node.js 20 Azure Functions in `functions/` (TypeScript → CJS build output under `dist/`).

## Architecture hot points
- **Flutter**: Features live under `lib/features/<feature>` with `domain/`, `application/`, `presentation/` layers. Navigation is gated by `lib/features/auth/presentation/auth_gate.dart`. Critical security/privacy flows sit in `lib/p1_modules/` and must keep ≥80 % coverage (enforced via `check_p1_coverage.sh`).
- **Azure Functions (Flex Consumption)**: Source in `functions/src/`, compiled via `npm run build` to `dist/`. Entrypoint wiring is handled by `functions/index.js` (generated during deploy). Shared helpers (auth, Cosmos, validation) live under `functions/shared/`.
- **Data**: Cosmos DB connection string is injected at deploy time (see workflow env `COSMOS_CONNECTION_STRING`). Redis is accessed via services in `lib/services/cache/`.
- **Moderation pipeline**: Hive AI (primary) then Azure Content Safety fallback; workflows and components live under `lib/features/moderation/` with a demo screen at `lib/screens/moderation_demo_page.dart`.

## Build, test, and debug
- **Flutter**: `flutter test --coverage` (then `bash check_p1_coverage.sh`). Use `lib/debug_sql.dart` for SQL visualization when debugging feeds.
- **Functions**: From `functions/`, run `npm ci && npm run build` to produce `dist/`, `npm test` for Jest, `npm start` for the local runtime (7072). Avoid ESM—`package.json` is locked to CommonJS.
- **CI helpers**: `quick-check.sh` executes format + targeted tests; `quick_coverage_demo.sh` is a minimal coverage smoke.

## Deployment workflow essentials
- `.github/workflows/deploy-asora-function-dev.yml` builds from `functions/`, uploads to blob storage, and deploys to Flex Consumption via ARM `/publish` API (no Kudu). Uses storage-based deployment with OIDC authentication. The PATCH step merges `functionAppConfig` to preserve `deployment.storage` and other critical fields. Flex apps must **not** set `FUNCTIONS_WORKER_RUNTIME`, `WEBSITE_RUN_FROM_PACKAGE`, or Kudu-related settings; runtime is configured via ARM PATCH (`node@20`, `instanceMemoryMB: 2048`).
- Scripts like `.github/scripts/normalize_flex.sh` and `fix-flex-settings.sh` exist to clean legacy settings—rely on ARM patches rather than app-setting writes.
- PR validations: `canary.yml` handles prerelease tagging, `e2e-integration.yml` fetches admin keys post-deploy and runs smoke requests.

## Patterns worth copying
- Services expose typed methods via providers in `lib/services/service_providers.dart`; prefer composing new features by wiring providers instead of manual singletons.
- API clients live under `lib/core/network/` using Dio with pinned certs—extend `dio_client.dart` for new HTTP stacks.
- For Functions, each endpoint is structured as `<feature>/<trigger>.function.ts` exporting a handler registered in `functions/src/index.ts`. New endpoints should follow existing logging/error handling helpers in `functions/shared/logger.ts` and `functions/shared/errors.ts`.

## Useful references
- `functions/jest.config.ts` – Jest + ts-jest setup mirroring the build pipeline.
- `docs/FEED_IMPLEMENTATION.md` – Explains feed ranking, Redis usage, and moderation hooks.
- `AZURE_FUNCTIONS_V4_PITFALLS.md` – Historical pitfalls; skim to avoid reverting to forbidden settings.
- `scripts/diagnostics-v4.sh` – One-stop commands for tailing logs, querying runtime config, and checking admin host health.

## Tooling tips
- If a terminal command returns no output via the automation tools, fall back to `run_in_terminal` followed by `get_terminal_output` (or request user pasteback) as noted in `AGENTS.md`.
- Secrets are managed through Azure Key Vault references; never hard-code secrets in Functions—use the `@Microsoft.KeyVault(...)` pattern visible in existing app settings.
