# Step 5 Verification Checklist

Last updated: 2026-02-08
Purpose: Close repo-verifiable launch questions and separate external dependencies.

## Status model

- `COMPLETE (in-repo)`: fully verifiable from code/docs/tests.
- `PARTIAL (in-repo + external)`: code path exists, live environment proof required.
- `EXTERNAL`: cannot be completed from repository alone.

## 1) App store account setup

Status: `EXTERNAL`

Required manual checks:
- Apple Developer Program account active.
- Google Play Console account active.
- App records created with correct package/bundle identifiers.

Repo references:
- `docs/runbooks/mobile-store-checklist.md`
- `docs/compliance/google-play-data-safety.md`

## 2) Third-party service credentials

Status: `PARTIAL (in-repo + external)`

Verified in repo:
- Startup validation exists: `functions/src/shared/startup-validation.ts`
- Auth config asserts B2C env vars: `functions/src/auth/config.ts`
- FCM config validation exists: `functions/src/notifications/clients/fcmClient.ts`

External checks required:
- Ensure cloud environment has required values set and resolvable.
- Confirm no silent fallback in target launch environment.

## 3) Email and communication channels

Status: `PARTIAL (product decision)`

Verified in repo:
- Push + in-app notification rails exist (device tokens, dispatcher, APIs).
- No dedicated transactional email pipeline for welcome/appeal decisions found.

Decision required:
- Confirm whether launch requires email notifications beyond identity-provider flows.

## 4) Invite system end-to-end

Status: `COMPLETE (in-repo)` for implementation, `PARTIAL` for live operations

Verified in repo:
- Public validate route: `functions/src/auth/routes/invite_validate.function.ts`
- Redeem flow: `functions/src/auth/service/redeemInvite.ts`
- Admin create/list/revoke runbook: `docs/runbooks/admin-ops.md`
- Invite tests exist under `functions/tests/auth/*invite*`

External checks required:
- Run production-like operator flow: create -> distribute -> redeem -> audit trail review.

## 5) Moderation outcome automation

Status: `COMPLETE (in-repo)`

Verified in repo:
- Vote route active: `functions/src/moderation/routes/voteOnAppeal.ts`
- Quorum + decision resolution: `functions/src/moderation/service/voteService.ts`
- Expiry resolver timer: `functions/src/moderation/timers/resolveExpiredAppeals.function.ts`
- Admin override path with audit support: `functions/src/admin/routes/appeals_override.function.ts`

## 6) Device integrity on real hardware

Status: `PARTIAL (in-repo + external execution)`

Verified in repo:
- Automated test coverage exists for integrity guards/services.
- Manual QA checklist exists: `docs/mobile-security-qa-checklist.md`
- Support handling runbook exists: `docs/runbooks/handle-rooted-device-complaints.md`

External checks required:
- Execute rooted/jailbroken real-device test matrix before launch.

## 7) Performance under load

Status: `PARTIAL (in-repo + external execution)`

Verified in repo:
- k6 smoke/feed/chaos scripts: `load/k6/*`
- Canary workflow with thresholds: `.github/workflows/canary-k6.yml`

External checks required:
- Run against target live environment and review latency/RU/cost outcomes.

## 8) Push notifications end-to-end

Status: `PARTIAL (in-repo + external execution)`

Verified in repo:
- Device token API: `functions/src/notifications/http/devicesApi.function.ts`
- Dispatcher: `functions/src/notifications/services/notificationDispatcher.ts`
- Product event producers present (likes, follows, comments, moderation decisions).
- Test runbook added: `docs/runbooks/notifications-testing.md`

External checks required:
- Validate real-device push delivery with live FCM credentials.

## 9) App store review concerns

Status: `PARTIAL (in-repo + external submission)`

Verified in repo:
- Store checklist and policy worksheet exist.
- Public policy pages exist in marketing site.
- Security/device-integrity disclosure checklist exists.

External checks required:
- Submit and validate reviewer notes/forms in Play Console/App Store Connect.

## 10) Post-launch moderation staffing

Status: `PARTIAL (in-repo plan + external staffing)`

Verified in repo:
- Moderation operations playbook with SLAs/escalation/staffing matrix:
- `docs/runbooks/moderation-ops.md`

External checks required:
- Assign named owners, on-call rota, and escalation contacts.

## Final external handoff list

1. Activate and verify Apple/Google developer console accounts and app records.
2. Populate/verify runtime secrets in cloud environments (B2C, Hive, FCM, JWT, CORS, Cosmos).
3. Decide whether email notifications are required at launch.
4. Execute live invite operations drill (create/redeem/revoke/audit).
5. Execute rooted/jailbroken real-device matrix and sign off.
6. Run k6/load checks against target live environment and approve SLO/cost.
7. Execute real-device push E2E with live FCM credentials.
8. Complete Play/App Store metadata and reviewer notes.
9. Finalize moderation staffing roster and escalation ownership.
