# Notifications Testing Runbook

Last updated: 2026-02-08
Scope: Verify end-to-end push + in-app notification delivery.

## 1. Preconditions

- Backend deployed and healthy (`/api/health` and `/api/ready`).
- Notification dispatcher timer is deployed (`processPendingNotifications`).
- Firebase credentials are present in Function App settings:
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`
- Test user is authenticated in the mobile app.
- Mobile app has granted notification permission.

## 2. Register a device token

Expected backend route:
- `POST /api/notifications/devices`

Example request:

```bash
curl -s -X POST "https://<function-host>/api/notifications/devices" \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "pixel8-ci",
    "pushToken": "fcm_device_token_here",
    "platform": "fcm",
    "label": "android-test"
  }'
```

Expected result:
- `201` response.
- Device appears in `GET /api/notifications/devices`.

## 3. Queue a notification event

Option A: Trigger a real product event (recommended)
- Like a post (`POST /api/posts/{id}/like`)
- Follow a user (`POST /api/users/{id}/follow`)
- Submit/resolve moderation actions (appeal/block decision)

Option B: Use admin send route for deterministic smoke
- `POST /api/notifications/send` with admin credentials.

Expected result:
- Event inserted into notification events store.
- In-app notification record created or updated.

## 4. Dispatch verification

- Wait for the `processPendingNotifications` timer cycle, or trigger processing endpoint if available in your environment.
- Validate in-app list:
- `GET /api/notifications` returns the new item.
- Validate unread badge:
- `GET /api/notifications/unread-count` increases.
- Validate push delivery on device:
- Device receives OS notification.
- Tap notification deep links to expected app surface.

## 5. Failure diagnostics

If push is not delivered:

1. Check FCM config state from logs:
- Missing env vars produce `FCM configuration missing` log entries.
2. Confirm device registration:
- Token present and active in `notifications/devices`.
3. Confirm event processing status:
- Event should move from `PENDING` to `SENT` (or `FAILED`/`DEAD_LETTER` with reason).
4. Check invalid token cleanup:
- Invalid tokens are revoked automatically by dispatcher.
5. Confirm app permission and OS notification settings on device.

## 6. Acceptance criteria

- Device registration returns `201`.
- At least one real event path enqueues and processes successfully.
- In-app notification is visible and can be marked read/dismissed.
- Push arrives on a real Android device with valid FCM token.
- Failure cases are actionable from logs (missing config, invalid token, retry/dead-letter).
