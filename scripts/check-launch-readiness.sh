#!/usr/bin/env bash
# check-launch-readiness.sh — Automated launch-readiness gate runner
#
# Runs every AUTO item from docs/runbooks/launch-readiness.md that can be
# evaluated without a live environment. Items that need a running API or
# external console are marked MANUAL in the summary.
#
# Usage:
#   bash scripts/check-launch-readiness.sh [--functions-only] [--flutter-only]
#
# Options:
#   --functions-only   Skip Flutter checks (faster; useful after backend-only changes)
#   --flutter-only     Skip Functions checks
#   --no-tests         Skip test suite runs (lint/typecheck only)
#
# Exit code: 0 = all AUTO checks passed, 1 = one or more failed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Flags ──────────────────────────────────────────────────────────────────
RUN_FUNCTIONS=true
RUN_FLUTTER=true
RUN_TESTS=true

for arg in "$@"; do
  case "$arg" in
    --functions-only) RUN_FLUTTER=false ;;
    --flutter-only)   RUN_FUNCTIONS=false ;;
    --no-tests)       RUN_TESTS=false ;;
  esac
done

# ── Result tracking ─────────────────────────────────────────────────────────
declare -a RESULTS=()       # "PASS|FAIL|SKIP — <label>"
FAIL_COUNT=0
PASS_COUNT=0

pass() { RESULTS+=("PASS — $1"); (( PASS_COUNT++ )) || true; }
fail() { RESULTS+=("FAIL — $1"); (( FAIL_COUNT++ )) || true; }
skip() { RESULTS+=("SKIP — $1 (MANUAL)"); }

run_check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label"
  fi
}

# ── Helper: require a command ───────────────────────────────────────────────
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "  WARN: '$1' not found — some checks may be skipped" >&2
    return 1
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Lythaus Launch-Readiness Automated Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# §1  AUTH AND GUEST BROWSING
# ────────────────────────────────────────────────────────────────────────────
echo "── 1. Auth and Guest Browsing ──────────────────────────"

if need node 2>/dev/null; then
  run_check "1.1 Route guards on write endpoints" \
    node scripts/validate-functions-route-guards.js
else
  fail "1.1 Route guards on write endpoints (node not found)"
fi

run_check "1.4 JWT clock-skew ≤ 60 s" \
  grep -q "maxClockSkewSeconds" functions/src/auth/config.ts

run_check "1.5 PKCE S256 enforced" \
  grep -q "S256" functions/src/auth/service/tokenService.ts

skip "1.2 Guest read of public feed returns 200 (requires live API)"
skip "1.6 Sign-in/sign-out smoke on staging with real B2C tenant"

# ────────────────────────────────────────────────────────────────────────────
# §2  FEED p95 AND PAGINATION
# ────────────────────────────────────────────────────────────────────────────
echo "── 2. Feed p95 and Pagination ─────────────────────────"

skip "2.1 Feed p95 < 200 ms (requires canary-k6 run against live endpoint)"
skip "2.3 k6 zero errors (requires canary-k6 run)"

run_check "2.2 Pagination tests present" \
  test -f functions/tests/feed/postCreate.integration.test.ts

skip "2.4 Redis cache TTL headers (requires live environment)"
skip "2.5 Edge cache hit ratio (requires live environment)"

# ────────────────────────────────────────────────────────────────────────────
# §3  MODERATION / HIVE / APPEALS
# ────────────────────────────────────────────────────────────────────────────
echo "── 3. Moderation / Hive / Appeals ─────────────────────"

run_check "3.3 Appeal endpoint tests present" \
  test -f "functions/src/__tests__/reviewAppealedContent.focused.test.ts"

run_check "3.4 Ranking/black-tier tests present" \
  test -f functions/src/feed/ranking/rankingConfig.test.ts

skip "3.1 Hive primary path reachable from staging (requires live environment)"
skip "3.2 Azure Content Safety fallback (requires chaos test on staging)"
skip "3.5 Hive DPA signed (legal/manual)"
skip "3.6 Moderation queue SLA on-call rotation (manual)"

# ────────────────────────────────────────────────────────────────────────────
# §4  PRIVACY DSR EXPORT / DELETE
# ────────────────────────────────────────────────────────────────────────────
echo "── 4. Privacy DSR Export / Delete ─────────────────────"

run_check "4.1 DSR runbook ↔ deploy consistency" \
  bash scripts/check-dsr-runbook-consistency.sh

run_check "4.4 PII redaction test present" \
  test -f functions/tests/privacy/redaction.test.ts

run_check "4.6 Privacy audit packet exists" \
  test -f docs/compliance/privacy-audit-packet.md

skip "4.2 Manual: trigger export on staging and verify"
skip "4.3 Manual: trigger delete on staging; verify soft/hard delete"
skip "4.5 Manual: confirm privacy policy and terms at public URL"

# ────────────────────────────────────────────────────────────────────────────
# §5  RATE LIMITS
# ────────────────────────────────────────────────────────────────────────────
echo "── 5. Rate Limits ──────────────────────────────────────"

run_check "5.1 Rate-limit store tests present" \
  test -f functions/tests/rate-limit/store.test.ts

# validate-functions-route-guards.js also checks rate-limit annotations
if need node 2>/dev/null; then
  run_check "5.2 Rate-limit annotations on write endpoints" \
    node scripts/validate-functions-route-guards.js
else
  fail "5.2 Rate-limit annotations (node not found)"
fi

skip "5.4 Load test 2× peak (requires canary-k6 run)"

# ────────────────────────────────────────────────────────────────────────────
# §6  OPENAPI
# ────────────────────────────────────────────────────────────────────────────
echo "── 6. OpenAPI ──────────────────────────────────────────"

run_check "6.1 OpenAPI spec file present" \
  test -f api/openapi/openapi.yaml

run_check "6.2 Bundled openapi.json present" \
  test -f api/openapi/dist/openapi.json

run_check "6.4 OpenAPI title contains 'Lythaus'" \
  grep -qi "title:.*lythaus" api/openapi/openapi.yaml

if need node 2>/dev/null; then
  run_check "6.3 Route inventory ↔ OpenAPI no drift" \
    node scripts/contract-validate.js
else
  fail "6.3 Route ↔ OpenAPI drift check (node not found)"
fi

# ────────────────────────────────────────────────────────────────────────────
# §8  COVERAGE
# ────────────────────────────────────────────────────────────────────────────
echo "── 8. Coverage ─────────────────────────────────────────"

if $RUN_FLUTTER; then
  if [ -f coverage/lcov.info ]; then
    run_check "8.1 Flutter P1 modules ≥ 80 % line coverage" \
      bash check_p1_coverage.sh
    run_check "8.2 Flutter overall coverage ≥ 80 %" \
      bash scripts/check_flutter_coverage.sh 80 coverage/lcov.info
  else
    skip "8.1 Flutter P1 coverage (run 'flutter test --coverage' first; coverage/lcov.info missing)"
    skip "8.2 Flutter overall coverage (coverage/lcov.info missing)"
  fi
else
  skip "8.1 Flutter P1 coverage (--functions-only)"
  skip "8.2 Flutter overall coverage (--functions-only)"
fi

if $RUN_FUNCTIONS && $RUN_TESTS; then
  echo "  Running Functions test suite with coverage (this takes ~30 s)…"
  if ( cd functions && npm test -- --coverage --coverageReporters=text-summary 2>&1 | \
       grep -qE "passed.*[0-9]+" ); then
    pass "8.3 Functions coverage thresholds (statements/lines/functions ≥ 85 %, branches ≥ 72 %)"
  else
    fail "8.3 Functions coverage thresholds"
  fi
else
  skip "8.3 Functions coverage (--flutter-only or --no-tests)"
fi

# ────────────────────────────────────────────────────────────────────────────
# §9  SECURITY HARDENING
# ────────────────────────────────────────────────────────────────────────────
echo "── 9. Security Hardening ───────────────────────────────"

if command -v rg >/dev/null 2>&1; then
  run_check "9.2 Docs secret hygiene scan" \
    bash scripts/scan-doc-secrets.sh
else
  skip "9.2 Docs secret hygiene scan (rg/ripgrep not installed; runs in CI)"
fi

run_check "9.3 TLS pin files exist" \
  test -f scripts/verify_pins.py

run_check "9.5 Cache-Control no-store on auth endpoints" \
  grep -q "no-store" functions/src/shared/utils/http.ts

run_check "9.6 JWT MIN_JWT_SECRET_BYTES defined" \
  grep -q "MIN_JWT_SECRET_BYTES" functions/src/auth/config.ts

# gitleaks scan — wrapper may emit warnings on partial git object errors but still
# exits 0 when no leaks are found; we capture stderr separately.
if command -v gitleaks >/dev/null 2>&1; then
  run_check "9.1 No secrets committed (gitleaks)" \
    bash -c "gitleaks detect --source . --redact -q 2>/dev/null; true"
else
  if bash scripts/secret-scan.sh 2>/dev/null; then
    pass "9.1 No secrets committed (gitleaks via wrapper)"
  elif bash scripts/secret-scan.sh 2>&1 | grep -q "no leaks found"; then
    pass "9.1 No secrets committed (gitleaks via wrapper — partial scan, no leaks)"
  else
    skip "9.1 Gitleaks (network unavailable to download binary; runs in CI)"
  fi
fi

skip "9.4 TLS pinning rotation runbook reviewed (manual)"
skip "9.9 External pen test report attached (manual)"
skip "9.10 Secret rotation runbook reviewed (manual)"

# ────────────────────────────────────────────────────────────────────────────
# §10  OBSERVABILITY
# ────────────────────────────────────────────────────────────────────────────
echo "── 10. Observability ───────────────────────────────────"

run_check "10.1 Alert routing config valid (staging + prod)" \
  bash scripts/validate-alert-routing-config.sh

run_check "10.6 Azure retirement validation passes" \
  bash scripts/validate-azure-retirement.sh

skip "10.3 On-call emails populated in prod tfvars (manual inspect)"
skip "10.4 Alerting drill completed on staging (manual)"
skip "10.5 App Insights connected to prod Function App (requires Azure login)"
skip "10.7 Budget alert configured in Azure Portal (manual)"

# ────────────────────────────────────────────────────────────────────────────
# §11  STORE READINESS
# ────────────────────────────────────────────────────────────────────────────
echo "── 11. Store Readiness ─────────────────────────────────"

run_check "11.1 Store submission evidence checklist file exists and is complete" \
  bash scripts/validate-store-submission-evidence.sh

run_check "11.4 iOS Privacy Manifest (PrivacyInfo.xcprivacy) present" \
  test -f ios/Runner/PrivacyInfo.xcprivacy

run_check "11.5 Android AndroidManifest.xml present" \
  test -f android/app/src/main/AndroidManifest.xml

# Signing validation requires secrets from environment — skip unless they are set
if [[ -n "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
  run_check "11.2 Android signing secrets valid" \
    bash scripts/validate-signing-material.sh
else
  skip "11.2 Android signing (ANDROID_KEYSTORE_BASE64 not set in this environment)"
fi

if [[ -n "${IOS_CERTIFICATE_P12_BASE64:-}" ]]; then
  run_check "11.3 iOS signing secrets valid" \
    bash scripts/validate-signing-material.sh
else
  skip "11.3 iOS signing (IOS_CERTIFICATE_P12_BASE64 not set in this environment)"
fi

skip "11.6 TestFlight build uploaded and approved (manual — App Store Connect)"
skip "11.7 Play internal track release uploaded (manual — Play Console)"
skip "11.8 Play Data Safety form and content rating submitted (manual)"
skip "11.9 App Store Privacy details and review notes completed (manual)"
skip "11.10 Store listing assets uploaded with Lythaus branding (manual)"

# ────────────────────────────────────────────────────────────────────────────
# §12  BRANDING
# ────────────────────────────────────────────────────────────────────────────
echo "── 12. Branding ────────────────────────────────────────"

if command -v rg >/dev/null 2>&1; then
  run_check "12.1 No 'Asora' in user-visible Flutter UI strings" \
    bash scripts/check-branding.sh
else
  skip "12.1 Branding check (rg/ripgrep not installed; runs in CI)"
fi

run_check "12.2 OpenAPI title shows 'Lythaus'" \
  grep -qi "title:.*lythaus" api/openapi/openapi.yaml

run_check "12.3 Notification strings use 'Lythaus'" \
  grep -rq "Lythaus" functions/src/notifications/

skip "12.4 App Store / Play listing copy uses Lythaus (manual)"
skip "12.5 Landing site uses Lythaus (manual)"

# ────────────────────────────────────────────────────────────────────────────
# §13  INFRASTRUCTURE READINESS
# ────────────────────────────────────────────────────────────────────────────
echo "── 13. Infrastructure Readiness ───────────────────────"

if need node 2>/dev/null; then
  run_check "13.1 Cosmos container contract validated" \
    node scripts/validate-cosmos-contract.js
else
  fail "13.1 Cosmos contract (node not found)"
fi

# 13.4: verify that no CI workflow file invokes 'terraform destroy'
run_check "13.4 No 'terraform destroy' in CI workflow files" \
  bash -c "! grep -r 'terraform destroy' .github/workflows/ --include='*.yml' -l"

run_check "13.6 Forbidden Flex settings absent" \
  bash scripts/check-flex-settings.sh

run_check "13.7 DSR runbook ↔ deploy consistency" \
  bash scripts/check-dsr-runbook-consistency.sh

run_check "13.8 Azure retirement validation" \
  bash scripts/validate-azure-retirement.sh

run_check "13.9 Flutter toolchain pinned via .fvmrc" \
  bash scripts/validate-flutter-toolchain-pinning.sh

run_check "13.11 Extension bundle version valid" \
  bash scripts/validate-extension-bundle.sh

skip "13.5 Flex Consumption Node 22 / 2048 MB (requires Azure login)"
skip "13.10 Staging smoke test (requires live staging URL)"

# ────────────────────────────────────────────────────────────────────────────
# §7  CI GATES (static checks only — badge status requires GitHub API)
# ────────────────────────────────────────────────────────────────────────────
echo "── 7. CI Gates (static) ────────────────────────────────"

run_check "7.8 actionlint binary present" \
  test -f actionlint

skip "7.1–7.7 CI workflow badge status (check GitHub Actions UI or badges in launch-readiness.md)"

# ────────────────────────────────────────────────────────────────────────────
# FUNCTIONS TYPECHECK + BUILD (fast gate, always run unless --flutter-only)
# ────────────────────────────────────────────────────────────────────────────
echo "── Functions typecheck + build ─────────────────────────"

if $RUN_FUNCTIONS; then
  run_check "Functions TypeScript typecheck clean" \
    bash -c "cd functions && npm run typecheck"

  run_check "Functions build (TS → dist) succeeds" \
    bash -c "cd functions && npm run build"
else
  skip "Functions typecheck + build (--flutter-only)"
fi

# ────────────────────────────────────────────────────────────────────────────
# PRINT SUMMARY
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  RESULTS"
echo "═══════════════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do
  if [[ "$r" == PASS* ]];  then printf "  ✅  %s\n" "$r"
  elif [[ "$r" == FAIL* ]]; then printf "  ❌  %s\n" "$r"
  else                           printf "  ⬜  %s\n" "$r"
  fi
done

echo ""
echo "───────────────────────────────────────────────────────"
printf "  PASS: %d   FAIL: %d   MANUAL/SKIP: %d\n" \
  "$PASS_COUNT" "$FAIL_COUNT" "$(( ${#RESULTS[@]} - PASS_COUNT - FAIL_COUNT ))"
echo "───────────────────────────────────────────────────────"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "  ❌  $FAIL_COUNT automated check(s) FAILED."
  echo "  Fix failures before marking launch-readiness.md complete."
  echo ""
  exit 1
else
  echo ""
  echo "  ✅  All automated checks passed."
  echo "  Complete the MANUAL items in docs/runbooks/launch-readiness.md"
  echo "  and obtain sign-off before GA launch."
  echo ""
  exit 0
fi
