# Exact-SHA CI and Deployment Evidence — 2026-07-10

Status: **not run / unverified**

- Working branch: `codex/alpha-release-candidate`
- Base commit inspected: `ad9936ace00d6da2634ac036f8354386dcc0fce8`
- Release commit: not frozen
- Full GitHub Actions on release commit: not run
- Immutable artifact digests: unavailable
- Deployment identifier: unavailable
- Live contracts: not run on release
- Browser smoke: not run on release
- DSR queue regression: not run on release
- Rollback rehearsal: not run

Do not update this file to `passed` from local tests. The generated release manifest and GitHub Actions run for the exact deployed SHA are the authoritative evidence.

## Pre-freeze local evidence

Status: **executed locally; not exact-SHA release evidence**

- Backend: 202/202 suites passed; 2,244 tests passed and 12 skipped; all configured coverage thresholds passed.
- Flutter: analysis passed; 3,623 tests passed and 5 skipped; total coverage 89.90% passed the 89.87% ratchet.
- Builds: Functions, control panel, marketing site, and Flutter web release builds passed.
- OpenAPI: Redocly lint and example validation passed; Spectral reported zero errors and 105 warnings. Static contracts passed 26 tests; 11 live tests skipped because the configured Alpha hostname did not resolve.
- Security: Gitleaks found no leaks in 1,387 commits, the Flutter web bundle, Functions package, OpenAPI bundle, or docs/config.
- Dependencies: blocking audit policy passed with zero high or critical production findings.
- Infrastructure: Terraform formatting and validation passed after backend-disabled provider initialization.
- Generated-artifact drift checks remain pending until the regenerated bundle and Dart client are committed and tested from a clean exact-SHA checkout.
