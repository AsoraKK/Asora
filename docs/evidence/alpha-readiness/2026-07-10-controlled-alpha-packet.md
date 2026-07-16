# Controlled Alpha Go/No-Go Packet — 2026-07-10

Status: **NO-GO**
Canonical scope: Lythaus web/API, moderation/control panel, and operational tooling
Candidate branch: `codex/alpha-release-candidate`
Release commit: **not frozen**
Deployed environment: **not deployed**
Enabled stage: **none**
Maximum cohort: **not enabled; configured hard ceiling is 250**

This is the only current Alpha launch packet. Earlier packets in this directory are historical evidence and cannot authorize launch.

## Gate status

| Gate | Status | Current evidence |
| --- | --- | --- |
| Repository secret remediation | Executed and passed locally | History, tracked-file, evidence, and archive scans found no committed value in the inspected repository state; exact release artifact scan is CI-enforced |
| Provider credential rotation | Requires Kyle action; failed launch gate | Rotation register remains unverified |
| Public categorical AI labels | Executed and passed locally | Public DTO, feed, creation, appeal, and Flutter label tests; numeric evidence remains internal |
| Free/Premium/Black server entitlements | Executed and passed locally | Canonical backend matrix, stale-JWT override, custom-feed, News Board, reward, media, and tier-grant tests |
| Invite and cohort enforcement | Executed and passed locally; deployment preflight pending | Hashed codes, expiry/revocation/redemption, capacity transaction, hard stage caps; `003_alpha_cohort_members.sql` must be applied and preflighted |
| Feed performance | Executed against current dev; failed | Warm current-dev discovery p95 `658.73 ms`; legacy guest p95 `844.97 ms`; exact candidate matrix not run |
| Exact-SHA full CI | Not run | Candidate SHA has not been frozen or pushed |
| Live contracts | Skipped locally; failed launch gate | Local suite passed 26 non-live contracts and skipped 11 live checks because the previously configured host was unreachable; release workflow now forbids skips |
| Browser smoke | Not run | Exact web artifact has not been deployed |
| DSR regression | Prior deployment evidence passed; exact candidate not run | Release workflow now requires export/delete queue transitions and sanitized evidence |
| Rollback | Workflow implemented; not tested | Manual protected-environment rehearsal remains required |
| Operational safety | Executed and passed locally | Approval policy, 16 machine-readable runbooks, kill switches, read-only mode, daily aggregate report workflow |
| Navigation | Executed and passed locally | Full Flutter suite passed 3,623 tests with 5 skipped; exact deployed browser smoke remains pending |

## Local validation snapshot

These results validate the working tree only. They are not exact-SHA GitHub Actions or deployment evidence.

| Surface | Command | Result |
| --- | --- | --- |
| Backend | `npm --prefix functions run test:coverage` | Passed: 202 suites, 2,244 tests passed, 12 skipped; 87.36% statements, 74.95% branches, 86.56% functions, 87.33% lines |
| Backend compile | `npm --prefix functions run typecheck` and `npm --prefix functions run build` | Passed |
| Flutter | `flutter analyze` | Passed with zero issues |
| Flutter | `flutter test --coverage` | Passed: 3,623 tests, 5 skipped |
| Flutter coverage | `bash scripts/check_coverage_gates.sh` | Passed: total 89.90% against 89.87%; P1 89%, P2 91%, P3 89% |
| Web builds | Control panel, marketing site, and `flutter build web --release` | Passed |
| Static contracts | OpenAPI lint/examples and non-live contracts | Passed: 26 contracts; 11 live cases skipped and remain a failed release gate |
| Route/security inventory | Node validator tests, Cosmos contract, route guard, route drift | Passed: 129 routes, 76 writes, zero missing guards; 7 documented phantom spec paths remain informational |
| Secret hygiene | Gitleaks history and artifact scans | Passed: 1,387 commits, Flutter web artifact, Functions package, OpenAPI bundle, and docs/config; no leaks detected |
| Dependencies | `node scripts/check-npm-audit.js` for root, Functions, control panel, and marketing | Passed blocking policy: zero high or critical findings; moderate/low advisories remain tracked |
| Infrastructure | `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate` | Passed with AzureRM 4.41.0 |

## Implemented release controls

- CI builds immutable Functions and Flutter web artifacts, scans them, records artifact digests, and fails the release summary if required jobs are skipped or failed.
- Deployment requires an exact 40-character SHA, a successful CI run for that SHA, a protected environment, Key Vault-backed runtime secrets, live contracts, cohort-schema/capacity preflight, DSR queue regression, and a release manifest.
- Alpha stages are explicit administrative state. There is no metric-triggered or automatic cohort expansion.
- `alpha-rollback.yml` restores only an exact previously validated artifact after protected-environment approval and a matching confirmation phrase.
- The daily operations report reads aggregate telemetry and sanitized admin snapshots; it cannot deploy, roll back, change thresholds, alter cohorts, or mutate data.

## Launch decision

No Alpha stage may open from this repository state. Technical Alpha may be reconsidered only after provider rotations are verified, the cohort migration is applied, an exact candidate SHA passes full CI, that exact artifact is deployed, strict live contracts and browser/DSR smoke pass, representative feed p95 is below the approved threshold, and rollback is rehearsed with evidence.

## Evidence index

- `2026-07-10-feed-performance.md`
- `2026-07-10-live-contract-report.md`
- `2026-07-10-dsr-regression.md`
- `2026-07-10-web-browser-smoke.md`
- `2026-07-10-exact-sha-ci-deployment.md`
- `../../security/alpha-credential-exposure-register.md`
- `../../alpha/known-risk-register.md`
- `../../alpha/deferred-beta-register.md`
- `../../runbooks/alpha-rollback.md`
- `../../alpha/support-and-incident-response.md`
