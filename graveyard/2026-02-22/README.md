# Graveyard Quarantine - 2026-02-22

This folder contains code quarantined by a safe-mode unused-code pass.

## Why quarantined

- Static scans (`rg`, `flutter analyze`, import-graph analysis) found zero runtime or test references.
- Duplicate replacements exist in active paths under `lib/features/...` (DC-001, DC-002).
- Mock data files have no consumers (DC-003, DC-004).
- Legacy screen wrappers listed for removal in MIGRATION_GUIDE.md (DC-006, DC-007).
- Orphan Control Panel page not wired in App.jsx routes (DC-008).
- UI component with zero import references across `lib/` and `test/` (DC-005).

## Signals to monitor after patch apply

- Missing imports or runtime class resolution errors.
- UI regressions in feed/moderation/privacy flows.
- CI failures in Flutter tests or coverage gates.
- Control Panel build or routing failures.

## Files quarantined

| ID | Original Path | Category |
|---|---|---|
| DC-001 | `lib/core/utils/content_type_helper.dart` | Dart util (duplicate) |
| DC-002 | `lib/core/utils/date_formatter.dart` | Dart util (duplicate) |
| DC-003 | `lib/data/mock/mock_feeds.dart` | Dart mock data |
| DC-004 | `lib/data/mock/mock_moderation.dart` | Dart mock data |
| DC-005 | `lib/ui/components/feed_carousel_indicator.dart` | Dart UI component |
| DC-006 | `lib/screens/appeal_history_page.dart` | Dart legacy wrapper |
| DC-007 | `lib/screens/appeal_history_page_v2.dart` | Dart legacy wrapper |
| DC-008 | `apps/control-panel/src/pages/Moderation.jsx` | Web/React page |

## Deletion criteria

- One full release cycle passes with no regressions.
- Full build/test/coverage checks pass in CI after quarantine.
- No reintroduction of references to quarantined paths.

## Rollback

Restore any file by moving it back to its original path from this directory.

## Full report

See `docs/reports/DELETION_CANDIDATE_REPORT_2026-02-22_SAFE_MODE.md` for evidence details.
