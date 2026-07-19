# Email verification v2

## Purpose

Email verification uses an explicit confirmation screen. Links contain their
bearer token in the URL fragment, not the query string, so loading an email
link cannot redeem it. PostgreSQL is authoritative; Cosmos receives an
idempotent outbox projection after verification succeeds.

## Configuration

- `APP_ORIGIN` is always `https://app.lythaus.co`.
- `AUTH_EMAIL_PREVIEW_ORIGIN` is optional and must be one exact immutable
  `xxxxxxxx.lythaus-web.pages.dev` origin.
- Email requests specify only `action_target: production|preview`; the server
  maps it to the configured origin.
- `EMAIL_TOKEN_HMAC_SECRET` is the current Key Vault-backed root. Purpose-bound
  HMAC keys are derived separately for verification, reset, and delivery
  telemetry. `EMAIL_TOKEN_HMAC_KEY_ID` is a non-secret identifier embedded in
  each new token. `EMAIL_TOKEN_HMAC_SECRET_PREVIOUS` and
  `EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID` are optional and retained only through the
  maximum active-token lifetime during rotation.

## Key promotion

1. Add the new Key Vault secret version and select a new, unique non-secret
   current key identifier.
2. Retain the existing root as `EMAIL_TOKEN_HMAC_SECRET_PREVIOUS` and set its
   existing key identifier as `EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID`.
3. Deploy the Function and verify new issuance plus redemption of a link issued
   under each identifier.
4. Wait until the maximum active verification and reset-token lifetimes have
   elapsed, then remove the previous-key reference and identifier.

The current and previous roots must never contain the same value. A token is
bound to its purpose and key identifier; it cannot redeem a password-reset
operation or silently switch to a newly promoted root.

The deployment initializes `EMAIL_TOKEN_HMAC_KEY_ID` to `email-v1` only when it
is absent. It never overwrites an existing identifier; a key rotation is a
separate, reviewed configuration change.

## Delivery events

Deploy the Function containing `auth_email_delivery_events`, then run:

```powershell
pwsh scripts/azure/configure-email-delivery-events.ps1
```

The default is a sanitized dry run. Use `-Apply` only after the backend
deployment and schema migration pass. The script creates one Event Grid
subscription for ACS `EmailDeliveryReportReceived` and sets the expected source
resource ID on the Function App. It does not read or print email addresses,
tokens, or credentials.

## Acceptance

1. Register using the exact preview action target.
2. Confirm `created`, `send_submitted`, then `accepted` application states.
3. Confirm an ACS terminal event is deduplicated as `delivered`, `bounced`,
   `suppressed`, `quarantined`, `filtered_spam`, or `failed`.
4. Open the email link: loading the page must not call the API.
5. Select **Verify email** once. Verify PostgreSQL success, an outbox row, and
   eventual Cosmos projection.
6. Refresh after URL cleanup: show the recoverable “Reopen the verification
   email” state. Reopening the email after success returns `already_verified`.

## Rollback

Disable v2 link issuance only after preserving v1/v2 redemption support. Do
not restore automatic redemption. Keep the schema, Event Grid subscription, and
outbox processor until every v1 token has exceeded its 120-minute lifetime.
