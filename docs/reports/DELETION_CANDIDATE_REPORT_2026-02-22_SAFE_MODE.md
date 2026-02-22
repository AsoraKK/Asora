# Lythaus (formerly Asora) Deletion Candidate Report (Safe Mode)

Date: 2026-02-22  
Mode: No in-place source edits, report + reviewable patches only.

## 1) Summary

- Total candidates reviewed: 16
- Candidate recommendations:
  - `SAFE DELETE`: 0
  - `QUARANTINE`: 8
  - `KEEP`: 8
- Risk profile:
  - Low: 5
  - Medium: 7
  - High: 4
- Blocked by uncertainty:
  - Full Flutter test suite currently has baseline failures (`flutter test --coverage` showed `-1` running failures and shutdown errors in this environment).
  - Control Panel baseline tests are failing (`src/test/adminApi.test.js` has 1 failing test before any deletion patch).
  - Dynamic/runtime discovery exists in Functions (`require(...)`, `await import(...)`) and test runners (Vitest/Jest discovery), reducing static certainty.

### Evidence commands run (no repo writes)

- `flutter analyze` -> PASS
- `flutter test --coverage` -> FAIL/unstable baseline in current environment
- `bash scripts/check_coverage_gates.sh` -> PASS (Total/P1/P2/P3 >= 80)
- `cd functions && npm run build && npm test -- --runInBand` -> PASS
- `npm --prefix apps/control-panel run build` -> PASS
- `npm --prefix apps/control-panel run test` -> FAIL (1 failing test baseline)
- Targeted `rg` reference scans for each candidate path/class.

## 2) Candidate Table

| Candidate ID | Path(s) | Category | Why It Appears Unused (Static Evidence) | Risk Flags | Recommendation | Required Validation Commands | Notes |
|---|---|---|---|---|---|---|---|
| DC-001 | `lib/core/utils/content_type_helper.dart` | Dart | No import references found; active imports use `lib/features/core/utils/content_type_helper.dart` | None | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Duplicate helper with narrower behavior than active feature helper. |
| DC-002 | `lib/core/utils/date_formatter.dart` | Dart | No import references found; active imports use `lib/features/core/utils/date_formatter.dart` | None | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Duplicate formatter with different method surface. |
| DC-003 | `lib/data/mock/mock_feeds.dart` | Dart | No references found outside file; release runbook notes system feed metadata moved out of this mock file | Docs mention historical usage | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Low runtime risk, but quarantined due current Flutter test instability. |
| DC-004 | `lib/data/mock/mock_moderation.dart` | Dart | No references found outside file | Policy context (contains legacy confidence fields), historical test data risk | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Quarantine preferred over delete due moderation-policy churn. |
| DC-005 | `lib/ui/components/feed_carousel_indicator.dart` | Dart | No imports and no class references found in `lib/` or `test/` | UI reuse uncertainty | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Candidate for deletion after one release cycle with no regressions. |
| DC-006 | `lib/screens/appeal_history_page.dart` | Dart | No imports; only self-reference + migration docs | Migration docs reference path | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Legacy wrapper around feature screen. |
| DC-007 | `lib/screens/appeal_history_page_v2.dart` | Dart | No imports; only self-reference + migration docs | Migration docs reference path | QUARANTINE | `flutter analyze`; `flutter test --coverage`; `bash scripts/check_coverage_gates.sh` | Duplicate of `appeal_history_page.dart`. |
| DC-008 | `apps/control-panel/src/pages/Moderation.jsx` | Web/JS | No route import in `App.jsx`; no imports elsewhere; `/moderation` route currently maps to `Flags` page | Web test baseline currently failing | QUARANTINE | `npm --prefix apps/control-panel run build`; `npm --prefix apps/control-panel run test` | High confidence orphan, but quarantined due failing baseline tests. |
| DC-009 | `workers/feed-cache/src/index.js` | Config/Edge | Appears duplicative, but wraps canonical worker and documented as compatibility entrypoint | Edge routing/runtime binding by string; deployment coupling | KEEP | N/A | Do not delete without Cloudflare route binding proof from deployed env. |
| DC-010 | `lib/generated/api_client/**` | Generated/codegen | Large zero-indegree surface in static pass, but codegen outputs are high-risk to remove | Codegen/discovery risk | KEEP | N/A | Explicitly protected by guardrails. |
| DC-011 | `apps/control-panel/src/pages/Appeals.test.jsx` | Test | Not imported by app graph, but discovered and executed by Vitest | Dynamic test discovery | KEEP | N/A | Do not remove via import-graph logic. |
| DC-012 | `apps/control-panel/src/test/adminApi.test.js` | Test | Not imported by app graph, but discovered by Vitest | Dynamic test discovery | KEEP | N/A | Also currently failing baseline; needs fix, not deletion. |
| DC-013 | `lib/design_system/components/index.dart` | Dart/barrel | Not imported by runtime files, but referenced in design-system docs/guides | Docs + future reuse risk | KEEP | N/A | Keep until explicit design-system cleanup project. |
| DC-014 | `lib/design_system/components/lyth_confirm_dialog.dart` | Dart/UI | No active imports found | Shared component library risk | KEEP | N/A | Keep pending component inventory decision. |
| DC-015 | `lib/design_system/components/lyth_empty_state.dart` | Dart/UI | No active imports found | Shared component library risk | KEEP | N/A | Keep pending design-system pruning pass. |
| DC-016 | `lib/design_system/components/lyth_list_row.dart`, `lib/design_system/components/lyth_skeleton.dart`, `lib/design_system/components/lyth_icon.dart` | Dart/UI | No active imports found | Shared component library risk | KEEP | N/A | Grouped keep; prune only with explicit design-system ownership signoff. |

## 3) Security Findings (Redacted)

- Secret-like placeholders and test-only secret literals found:
  - `ios/Runner/GoogleService-Info.plist.example`
  - `android/app/google-services.json.example`
  - `functions/tests/auth/*.test.ts`
  - `functions/tests/shared/startup-validation.test.ts`
  - `functions/src/shared/services/receiptEvents.test.ts`
- No active production secret values were emitted in this report.
- Recommended remediation:
  1. Keep placeholders with obvious `REPLACE_WITH...` markers.
  2. Ensure CI secret scanning includes full history for release branches.
  3. Rotate any token that was ever shared outside secret stores.

## 4) Patch Artifacts Produced

- `patches/0001-dart-quarantine-unused-utils-and-mocks.patch`
- `patches/0002-dart-quarantine-legacy-appeal-pages.patch`
- `patches/0003-dart-quarantine-unused-feed-carousel.patch`
- `patches/0004-web-quarantine-control-panel-moderation-page.patch`

## 5) Post-Apply Review Checklist

Run after applying patches in a review branch:

1. `flutter analyze`
2. `flutter test --coverage`
3. `bash scripts/check_coverage_gates.sh`
4. `cd functions && npm run build && npm test -- --runInBand`
5. `npm --prefix apps/control-panel run build`
6. `npm --prefix apps/control-panel run test`
7. Smoke critical flows:
   - Auth sign-in/sign-out and guest browse
   - Discover/news/custom feed navigation
   - Post create + moderation block/appeal entry points
   - Privacy export/delete entry points
   - Moderation console queue/audit views

## 6) Do-Not-Touch Areas Inferred

- Functions dynamic route registration and lazy imports:
  - `functions/src/index.ts`
  - `functions/src/**/routes/*.ts` using `await import(...)`
- Generated clients and codegen inputs/outputs:
  - `lib/generated/api_client/**`
  - `docs/openapi.yaml`
- Edge/runtime bindings:
  - `cloudflare/worker.ts`
  - `workers/feed-cache/**`
  - `cloudflare/wrangler.toml`
- Critical P1/P2 feature paths:
  - Auth, feed, post, moderation, privacy, reputation.

