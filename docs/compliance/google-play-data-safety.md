# Google Play Data Safety Worksheet (Android)

Version: 1.0  
Last Updated: 2026-02-06  
Product: Lythaus (formerly Asora)

## 1. Data collected

- Account identifiers: email, auth provider IDs.
- User content: posts, media URLs, moderation appeals.
- App activity: feed interactions, moderation actions, notification preferences.
- Device/app info: push token, device ID for notification routing.

## 2. Data sharing

- No third-party selling of personal data.
- Processor transfers for infrastructure and moderation vendors only.
- Vendor register source of truth: `docs/legal/registers/vendors.csv`.

## 3. Security controls declared

- Data in transit encrypted (HTTPS/TLS).
- Access controls and role-scoped admin actions.
- Moderation/audit logs for privileged overrides.

## 4. Deletion and export

- DSR export/delete runbooks:
- `docs/runbooks/dsr.md`
- `docs/runbooks/dsr-settings.md`

## 5. Pre-submit checks

- Validate answers against live app behavior.
- Ensure public policy URLs are published and stable.
- Reconcile with legal registers before each store update.
