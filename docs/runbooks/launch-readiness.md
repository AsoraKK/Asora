# Lythaus Launch-Readiness Checklist

> **Purpose**: Machine-checkable gate list for GA launch.
> **Updated**: 2026-05-02
> **Owner**: Platform lead + product lead joint sign-off required.
> **Automation script**: [`scripts/check-launch-readiness.sh`](../../scripts/check-launch-readiness.sh)

Run the full automated suite:

```bash
bash scripts/check-launch-readiness.sh
```

Each item is tagged:
- **AUTO** — checked by `check-launch-readiness.sh` or the CI workflow listed.
- **MANUAL** — human sign-off required; document evidence in the linked file.

---

## CI Badges

| Workflow | Badge |
|---|---|
| CI | `![CI](https://github.com/AsoraKK/Asora/actions/workflows/ci.yml/badge.svg?branch=main)` |
| Flutter CI | `![Flutter CI](https://github.com/AsoraKK/Asora/actions/workflows/flutter-ci.yml/badge.svg?branch=main)` |
| OpenAPI | `![OpenAPI](https://github.com/AsoraKK/Asora/actions/workflows/openapi.yml/badge.svg?branch=main)` |
| Mobile Release | `![Mobile Release](https://github.com/AsoraKK/Asora/actions/workflows/mobile-release-build.yml/badge.svg?branch=main)` |
| Launch Readiness Gate | `![Launch Gate](https://github.com/AsoraKK/Asora/actions/workflows/launch-readiness-gate.yml/badge.svg)` |
| Canary SLO | `![Canary SLO](https://github.com/AsoraKK/Asora/actions/workflows/canary-k6.yml/badge.svg)` |
| Infra | `![Infra](https://github.com/AsoraKK/Asora/actions/workflows/infra.yml/badge.svg?branch=main)` |

---

## 1. Auth and Guest Browsing

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 1.1 | All write endpoints (`POST`/`PUT`/`PATCH`/`DELETE`) carry an auth guard | AUTO | `node scripts/validate-functions-route-guards.js` | |
| 1.2 | Guest (unauthenticated) read of public feed returns HTTP 200 | AUTO | Run `bash scripts/check_api_health.sh` + `bash scripts/smoke-trust-endpoints.sh` against the exact preview Worker URL | |
| 1.3 | Auth-required endpoints return HTTP 401 without token | AUTO | `node scripts/validate-functions-route-guards.js` (also covered by `e2e-integration.yml`) | |
| 1.4 | JWT clock-skew tolerance set to ≤ 60 s | AUTO | `grep MAX_CLOCK_SKEW functions/src/auth/config.ts` | |
| 1.5 | PKCE S256 enforced for mobile OAuth flow | AUTO | `grep S256 functions/src/auth/service/tokenService.ts` | |
| 1.6 | Sign-in/sign-out smoke through an exact preview with the live auth environment | MANUAL | Use an isolated test identity against the exact preview Worker/Pages artifacts; attach sanitized evidence | |

---

## 2. Feed p95 and Pagination

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 2.1 | Feed p95 latency < 200 ms under approved canary load | AUTO | `canary-k6.yml` requires `ALLOW_SHARED_MVP_LOAD_TESTS=true`; thresholds: `p95<200ms`, `p99<400ms`, `error_rate<1%` | |
| 2.2 | Pagination cursor returns correct next page without duplicates | AUTO | Jest integration: `tests/feed/postCreate.integration.test.ts` | |
| 2.3 | Feed read test produces zero errors in k6 run | AUTO | `canary-k6.yml` → k6 artifact `k6-canary-*` | |
| 2.4 | Redis cache TTL headers present on anonymous feed requests | AUTO | `bash scripts/validate_edge_cache.sh` | |
| 2.5 | Edge-cache hit ratio > 50 % on canary run | AUTO | `cache-check.yml` | |

---

## 3. Moderation / Hive / Appeals

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 3.1 | Hive AI primary path reachable through preview | MANUAL | Use an isolated test post through the exact preview and verify the sanitized health signal | |
| 3.2 | Azure Content Safety fallback activates when Hive times out | MANUAL | Prove with dependency-injection tests; do not disable live keys or run chaos against the shared MVP origin without explicit approval | |
| 3.3 | Appeal submission endpoint returns 200 and queues review task | AUTO | `functions/src/__tests__/reviewAppealedContent.focused.test.ts` | |
| 3.4 | Black-tier user sees zero feed content (limit enforced) | AUTO | `functions/src/feed/ranking/rankingConfig.test.ts` | |
| 3.5 | Hive DPA signed / vendor contract in legal register | MANUAL | See `docs/compliance/privacy-audit-packet.md` §2; check `docs/legal/README.md` vendor register | |
| 3.6 | Moderation queue SLA ≤ 24 h for Tier-1 content | MANUAL | Review `docs/runbooks/moderation-ops.md` SLA table; confirm on-call rotation set | |

---

## 4. Privacy DSR Export / Delete

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 4.1 | DSR runbook keys match deploy workflow | AUTO | `bash scripts/check-dsr-runbook-consistency.sh` (also in `ci.yml`) | |
| 4.2 | `GET /api/user/export` returns valid JSON export within 72 h SLA | AUTO | `functions/src/` privacy tests; manual: trigger export, verify receipt | |
| 4.3 | `DELETE /api/user/delete` soft-deletes immediately, hard-deletes ≤ 30 days | MANUAL | Use an isolated shared-MVP test account through preview; verify soft-delete and scheduled hard-delete evidence | |
| 4.4 | PII redaction active in telemetry (no raw user IDs in App Insights) | AUTO | `tests/privacy/redaction.test.ts` | |
| 4.5 | Privacy policy and terms of service live at public URL | MANUAL | Navigate to `https://lythaus.co/privacy` and `https://lythaus.co/terms`; confirm content is current | |
| 4.6 | GDPR/POPIA article mapping complete | MANUAL | Review `docs/compliance/privacy-audit-packet.md` §1; all rights must show ✅ | |
| 4.7 | **[LAUNCH BLOCKER]** Admin/operational DSR queue worker healthy, or an internal-only exception is explicitly signed off | MANUAL | If external/public launch: attach [2026-06-29-dsr-queue-listener-investigation.md](../evidence/observability/2026-06-29-dsr-queue-listener-investigation.md) proving the queue listener is fixed. If internal-only alpha exception: attach [2026-06-29-dsr-alpha-decision.md](../evidence/observability/2026-06-29-dsr-alpha-decision.md) and [dsr-internal-alpha-fallback.md](./dsr-internal-alpha-fallback.md). | |

---

## 5. Rate Limits

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 5.1 | Rate-limit store unit tests pass | AUTO | `tests/rate-limit/store.test.ts` | |
| 5.2 | Abuse-class rate limit enforced on write endpoints | AUTO | `node scripts/validate-functions-route-guards.js` (rate-limit column in inventory) | |
| 5.3 | 429 response includes `Retry-After` header | AUTO | Jest: search `Retry-After` in `functions/src/` tests | |
| 5.4 | Load test confirms no 5xx burst at 2× peak traffic | AUTO | `canary-k6.yml` chaos scenarios; `error_rate < 1%` threshold | |

---

## 6. OpenAPI

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 6.1 | Spectral lint passes on `api/openapi/openapi.yaml` | AUTO | `openapi.yml` CI workflow: `npx spectral lint api/openapi/openapi.yaml` | |
| 6.2 | Bundled `api/openapi/dist/openapi.json` is up to date (no git diff) | AUTO | `openapi.yml` CI: `git diff --quiet api/openapi/dist/openapi.json` | |
| 6.3 | Route inventory matches OpenAPI spec (no drift) | AUTO | `ci.yml` → "Validate route auth/rate-limit inventory" step; `node scripts/contract-validate.js` | |
| 6.4 | API title shows `Lythaus` (not `Asora`) | AUTO | `grep 'title:' api/openapi/openapi.yaml | grep -i lythaus` | |

---

## 7. CI Gates

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 7.1 | `ci.yml` green on `main` | AUTO | CI badge above | |
| 7.2 | `flutter-ci.yml` green on `main` | AUTO | Flutter CI badge above | |
| 7.3 | `openapi.yml` green on `main` | AUTO | OpenAPI badge above | |
| 7.4 | `canary-k6.yml` green post last deploy | AUTO | Canary SLO badge above | |
| 7.5 | `launch-readiness-gate.yml` green | AUTO | Launch Gate badge above; run: `gh workflow run launch-readiness-gate.yml` | |
| 7.6 | `mobile-release-build.yml` green (Android AAB + iOS archive artifacts uploaded) | AUTO | Mobile Release badge above | |
| 7.7 | `e2e-integration.yml` green after the last exact MVP deployment | AUTO | Check Actions for the run tied to the exact deployment SHA | |
| 7.8 | actionlint + shellcheck pass on all workflows | AUTO | `ci.yml` → "Lint workflows" step | |
| 7.9 | No high/critical CVEs in dependency review | AUTO | `ci.yml` → "Dependency CVE review" step | |

---

## 8. Coverage

Controlled beta uses 80% as the minimum per-phase gate for P1, P2, and P3.
The current measured overall Flutter coverage is 89.87%, so the recorded total baseline is 89.87%.
Keep 95% as a future GA/public-launch target unless leadership changes it.

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 8.1 | Flutter P1 modules ≥ 80 % line coverage | AUTO | `bash check_p1_coverage.sh` (requires `flutter test --coverage` first) | |
| 8.2 | Flutter overall coverage ≥ 89.87 % | AUTO | `bash scripts/check_flutter_coverage.sh 89.87 coverage/lcov.info` (current measured coverage: 89.87 %) | |
| 8.3 | Functions statements/lines/functions ≥ 85 %, branches ≥ 72 % | AUTO | `cd functions && npm run test -- --coverage` (thresholds in `functions/jest.config.ts`) | |
| 8.4 | Coverage gates enforced in `flutter-ci.yml` | AUTO | `flutter-ci.yml` coverage job; `bash scripts/check_coverage_gates.sh` | |

---

## 9. Security Hardening

> Pin lifecycle: ephemeral preview hosts remain `planned`; the MVP public API remains `planned` until `api.lythaus.co` is provisioned and both primary and backup pins are captured. The Azure resource hostname is internal origin context only.

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 9.1 | No secrets committed to repo (gitleaks scan) | AUTO | `bash scripts/secret-scan.sh` | |
| 9.2 | No secrets in docs/markdown (doc secret hygiene) | AUTO | `bash scripts/scan-doc-secrets.sh` (also in `ci.yml`) | |
| 9.3 | TLS pinning: dev cert pin files present and verified | AUTO | `python3 scripts/verify_pins.py` (fails if a configured host resolves but has no expected pins) | |
| 9.4 | TLS pinning rotation runbook reviewed | MANUAL | `docs/runbooks/tls-pinning-rotation.md` — confirm current pins match production certs | |
| 9.5 | `Cache-Control: no-store, no-cache, private` on auth endpoints | AUTO | `grep 'no-store' functions/shared/utils/http.ts` | |
| 9.6 | JWT minimum secret length ≥ 32 bytes enforced | AUTO | `grep MIN_JWT_SECRET_BYTES functions/src/auth/config.ts` | |
| 9.7 | Mobile security checks pass (obfuscation, root detection) | AUTO | `mobile-security-check.yml` validates explicit preview/MVP SPKI lifecycle states | |
| 9.8 | Android obfuscation mapping file uploaded as CI artifact | AUTO | `mobile-release-build.yml` → `android-release` artifact | |
| 9.9 | External penetration test completed (pre-GA) | MANUAL | Attach pentest report or sign-off letter to `docs/compliance/`; record finding count and resolution status | |
| 9.10 | Secret rotation runbook reviewed by on-call | MANUAL | `docs/runbooks/secret-rotation.md` — confirm Key Vault rotation schedule is active | |
| 9.11 | **[PLANNED]** Preview security profile verified | MANUAL | Preview uses exact ephemeral Cloudflare URLs and the existing MVP backend; it does not provision a staging host. Verify the release build contains no Azure hostname and run the domain contract. | |
| 9.12 | **[PLANNED]** MVP API SPKI pins provisioned (leaf + backup) | MANUAL | After `api.lythaus.co` is live, run `./scripts/extract-spki-pins.sh api.lythaus.co` and `CERT_INDEX=1 ./scripts/extract-spki-pins.sh api.lythaus.co`, then update the production pin configuration and `mobile-expected-pins.json`. | |

---

## 10. Observability

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 10.1 | Existing `appi-asora-dev` is connected to the shared MVP Function App | MANUAL | Verify the app-setting state and live telemetry without exposing the connection string | |
| 10.2 | Health, 5xx, latency, throttling, and DSR alert paths are proven for the shared MVP origin | MANUAL | Attach sanitized Azure alert and telemetry evidence | |
| 10.3 | On-call recipients and action groups are populated | MANUAL | Inspect names/state only; never commit recipient values | |
| 10.4 | Alerting drill completed without endangering shared MVP users | MANUAL | Use controlled probes and dependency injection; destructive chaos requires separate approval | |
| 10.5 | Application Insights correlation works through the preview Worker | MANUAL | Trace a synthetic correlation ID from Worker to Azure telemetry | |
| 10.6 | Azure retirement hardening checks pass | AUTO | `ci.yml` → "Azure Retirement Hardening Checks" step; `bash scripts/validate-azure-retirement.sh` | |
| 10.7 | Budget alert configured in Azure subscription | MANUAL | Log in to Azure Portal → Cost Management → Budgets; confirm alert threshold and recipient email set | |

---

## 11. Store Readiness

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 11.1 | Store submission evidence checklist complete | AUTO | `bash scripts/validate-store-submission-evidence.sh` (also in `launch-readiness-gate.yml`) | |
| 11.2 | Android signing secrets present and keystore valid | AUTO | `bash scripts/validate-signing-material.sh` (also in `launch-readiness-gate.yml`) | |
| 11.3 | iOS signing secrets present and provisioning profile valid | AUTO | `bash scripts/validate-signing-material.sh` (iOS path) | |
| 11.4 | iOS Privacy Manifest (`PrivacyInfo.xcprivacy`) present and complete | AUTO | `test -f ios/Runner/PrivacyInfo.xcprivacy` (checked in `mobile-release-build.yml`) | |
| 11.5 | Android `AndroidManifest.xml` does not declare disallowed permissions | AUTO | `bash scripts/check-bom.sh` (BOM validation) | |
| 11.6 | TestFlight build uploaded and approved for internal testing | MANUAL | Log in to App Store Connect; confirm TestFlight build active; attach build number to `docs/runbooks/store-submission-evidence.md` | |
| 11.7 | Play internal track release uploaded and available to testers | MANUAL | Log in to Google Play Console; confirm internal testing release active; attach release ID to `docs/runbooks/store-submission-evidence.md` | |
| 11.8 | Play Data Safety form and content rating submitted | MANUAL | Log in to Google Play Console; confirm Data Safety and Content Rating show ✅; see `docs/runbooks/mobile-store-checklist.md` | |
| 11.9 | App Store Privacy details and review notes completed | MANUAL | Log in to App Store Connect → App Privacy; confirm all data-type questions answered; see `docs/runbooks/mobile-store-checklist.md` | |
| 11.10 | Store listing assets (screenshots, icon, description) uploaded for both stores | MANUAL | Verify in Play Console and App Store Connect; confirm "Lythaus" branding in all copy | |

---

## 12. Branding

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 12.1 | No "Asora" in user-visible UI strings (Flutter) | AUTO | `bash scripts/check-branding.sh` (also in `ci.yml`) | |
| 12.2 | OpenAPI `title` field shows `Lythaus` | AUTO | `grep 'title:' api/openapi/openapi.yaml \| grep -i lythaus` | |
| 12.3 | Notification push title/body strings use `Lythaus` | AUTO | `grep -r 'Lythaus' functions/src/notifications/` | |
| 12.4 | App Store / Play Store listing copy uses `Lythaus` | MANUAL | Review store listing preview in both consoles; no "Asora" in user-visible fields | |
| 12.5 | Landing site / marketing site uses `Lythaus` | MANUAL | Browse `https://lythaus.app`; confirm no "Asora" in headings, meta titles, or body copy | |

---

## 13. Infrastructure Readiness

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 13.1 | Cosmos container contract validated (no schema drift) | AUTO | `node scripts/validate-cosmos-contract.js` (also in `ci.yml`) | |
| 13.2 | Cosmos indexes match canonical contract | AUTO | `bash scripts/compare-cosmos-indexes.sh` | |
| 13.3 | Terraform `infra.yml` passes on `main` | AUTO | Infra badge above | |
| 13.4 | No `terraform destroy` in CI (safety check) | AUTO | `bash scripts/tf-no-destroy-check.sh` | |
| 13.5 | Flex Consumption runtime: Node 22, `instanceMemoryMB: 2048` | AUTO | `bash scripts/diagnostics-v4.sh` → ARM config check | |
| 13.6 | `FUNCTIONS_WORKER_RUNTIME`, `WEBSITE_RUN_FROM_PACKAGE`, Kudu settings absent | AUTO | `bash scripts/check-flex-settings.sh` | |
| 13.7 | DSR runbook consistent with deploy workflow | AUTO | `bash scripts/check-dsr-runbook-consistency.sh` | |
| 13.8 | Azure retirement validation passes (no deprecated SKUs) | AUTO | `bash scripts/validate-azure-retirement.sh` | |
| 13.9 | Flutter toolchain pinned via `.fvmrc` (no hardcoded version in workflows) | AUTO | `bash scripts/validate-flutter-toolchain-pinning.sh` | |
| 13.10 | Beta browser smoke passes (shell, routes, feed, auth, admin) | AUTO | `.github/workflows/beta-smoke.yml` -> `node scripts/beta-smoke.mjs` | |
| 13.11 | Extension bundle version valid in all `host.json` files | AUTO | `bash scripts/validate-extension-bundle.sh` | |

---

## 14. Payments (Deferred — Soft Launch)

> **Status: DEFERRED.** No payment provider is wired for launch. Payments are intentionally
> excluded from the initial soft launch. Black tier is granted manually by an admin for
> invited testers.

| # | Item | Type | Command / Evidence | Status |
|---|------|------|--------------------|--------|
| 14.1 | No paywall or purchase UI route is reachable by end users | AUTO | `grep -rn 'paywall\|startPurchase\|PurchaseScreen' lib/ --include="*.dart"` must return zero app-layer hits | |
| 14.2 | `BackendSubscriptionService.startPurchase()` returns `PROVIDER_NOT_CONFIGURED` (not `UnimplementedError`) | AUTO | `flutter test test/services/subscription/subscription_service_test.dart` | |
| 14.3 | `BackendSubscriptionService.restorePurchases()` returns `PROVIDER_NOT_CONFIGURED` | AUTO | same as 14.2 | |
| 14.4 | `BackendSubscriptionService.getProducts()` returns empty list | AUTO | same as 14.2 | |
| 14.5 | Admin can manually grant Black tier via `PATCH /api/admin/users/:userId/tier` | AUTO | `npm test -- --testPathPattern=users_set_tier` (from `functions/`) | |
| 14.6 | Manual Black tier is reflected by `GET /api/subscription/status` without JWT re-issuance | MANUAL | Set tier via admin endpoint; verify status endpoint returns `"tier":"black"` | |
| 14.7 | Webhook endpoint returns `501 Not Implemented` when no provider is wired | AUTO | `curl -X POST .../api/payments/webhook` returns `{ "error": "not_implemented" }` | |

### Manual Black Tier Assignment (Soft Launch Process)

To grant Black tier to a tester during soft launch:

```bash
# Requires an admin JWT (role: admin) in AUTH_TOKEN
curl -X PATCH "https://admin-api.lythaus.co/api/admin/users/<USER_ID>/tier" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier":"black"}'
```

The user's tier is persisted in their Cosmos document. `GET /api/subscription/status`
reads Cosmos tier with priority over the JWT claim, so the change is effective immediately
without requiring the user to sign out and back in.

### When Payments Are Ready

Remove or supersede items 14.1–14.7 once a payment provider is wired:
1. Choose provider (RevenueCat / StoreKit 2 / Google Billing Library)
2. Implement `PaymentProviderAdapter` in `functions/src/payments/adapters/`
3. Set `PAYMENT_PROVIDER` env var and provider-specific secrets in Key Vault
4. Create Cosmos `subscriptions` container (`/userId` partition key)
5. Wire `subscription_status` to Cosmos subscriptions container (replace user-doc tier override)
6. Remove the `admin_set_user_tier` endpoint or gate it behind a feature flag

---

## 15. Known Residual Risks

These items are **accepted risks** for GA. Each has a mitigation plan and owner.

| Risk | Severity | Mitigation | Owner | Target Resolution |
|------|----------|-----------|-------|-------------------|
| **jose v6 upgrade blocked** — ESM-only; CJS `require()` needs Node ≥ 22.12 in Flex Consumption; exact runtime patch unconfirmed | MEDIUM | Current jose v5 has no known critical CVEs; upgrade when Node 22.12+ confirmed in Flex runtime | Backend lead | W16+, post-GA |
| **uuid v14 CJS blocker** — uuid v12+ removed CJS; project is CJS-locked; GHSA-w5hq-g745-h8pq does not affect our `v4`/`v7` usage | LOW | Not vulnerable with current usage patterns; revisit on ESM migration | Backend lead | ESM migration sprint |
| **TypeScript 6 held** — `"moduleResolution": "node"` removed in TS6; `overrides` pin at `5.5.4`; migration needs tsconfig audit | LOW | TS5 is fully supported; pin is intentional | Backend lead | Dedicated TS6 sprint |
| **nock v14 interception semantics** — v14 replaced monkey-patching with `@mswjs/interceptors`; existing mocks need validation | LOW | nock v13 has no active CVEs; hold for test sprint | QA lead | W17+ |
| **Hive AI DPA** — vendor contract and DPA not yet signed; Hive processes content text | HIGH | Do not send PII to Hive (enforced); legal to prioritise DPA signing before GA | Legal / DPO | Pre-GA blocker |
| **External penetration test** — no third-party pen test completed yet | HIGH | Internal security hardening done (W13); schedule external test; do not launch without pentest sign-off | Security lead | Pre-GA blocker |
| **Budget alert not confirmed** — Azure cost overrun alert not validated in production subscription | MEDIUM | Configure in Azure Portal before traffic ramp; see §10.7 | Platform lead | Pre-GA |
| **astro v6 marketing site** — major upgrade held; marketing site may carry outdated JS deps | LOW | Marketing site is separate from app backend; no user data processed | Web team | Marketing-site workstream |

---

## Sign-off

All AUTO items must be green in CI. All MANUAL items must have evidence attached to the linked documents.

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Lead | | | |
| Platform Lead | | | |
| Security Lead | | | |
| Data Protection Officer | | | |
| Legal | | | |
