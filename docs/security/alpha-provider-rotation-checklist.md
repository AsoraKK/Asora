# Alpha Provider Rotation Checklist

Status: Kyle action required
Do not paste secret values, connection strings, tokens, or private keys into this file, issues, Actions logs, or release evidence.

For every item record provider identifier, secret/key version, rotation time, old credential revocation time, verifier, and validation result only.

## JWT and sessions

- [ ] Create a new Key Vault version for `JWT_SECRET`.
- [ ] Deploy the Key Vault reference through the approved exact-SHA workflow.
- [ ] Revoke all stored refresh tokens/sessions.
- [ ] Verify new access/refresh tokens work and a token signed with the prior key fails.
- [ ] Record the active Key Vault secret version and invalidation timestamp.

The current auth model has refresh-token revocation but no independent JWT `tokenVersion` claim. Rotation therefore requires signing-key replacement plus refresh-session revocation; already-issued access tokens expire at their normal short TTL.

## Data stores

- [ ] Rotate Cosmos credentials or move the Alpha app to managed identity.
- [ ] Validate health, feed reads/writes, invites, moderation, receipts, and DSR containers on the replacement credential.
- [ ] Revoke the prior Cosmos key only after failover validation.
- [ ] Rotate PostgreSQL credential or managed-identity mapping.
- [ ] Validate auth refresh, follows, cohort reservation, admin config, and DSR state transitions.
- [ ] Revoke the prior database credential and monitor failures for 15 minutes.

## Cloudflare

- [ ] Rotate the Access service token used by the control panel/smoke job.
- [ ] Validate Access application audience, policy, expiry, and origin response.
- [ ] Revoke the prior Access token.
- [ ] Rotate the Pages/Workers API token.
- [ ] Restrict it to the required account, Pages project, and Worker resources.
- [ ] Review Pages environment variables, Worker secrets, routes, and token audit log.

## Hive

- [ ] Issue a replacement Hive key.
- [ ] Update the `HIVE_API_KEY` Key Vault secret version.
- [ ] Run a safe text and media classification health check without retaining raw provider output in public evidence.
- [ ] Verify conflict and unavailable-classifier paths.
- [ ] Revoke the prior key.

## OAuth and Firebase

- [ ] Rotate every OAuth client secret that exists; public PKCE clients do not receive an invented secret.
- [ ] Verify Lythaus web callback/redirect URIs exactly.
- [ ] Validate authorization-code, PKCE, refresh, logout, and revoked-session behavior.
- [ ] Rotate the Firebase service-account key, validate safety notification delivery, then revoke the old key.

## Repository and artifacts

- [ ] Run full-history Gitleaks on the exact release SHA.
- [ ] Scan documentation/evidence, OpenAPI bundle, generated Dart client, web build, Functions directory, Functions ZIP, source maps, and deployment archives.
- [ ] Check the exact-SHA CI/deploy/browser/performance logs using redacted scanning.
- [ ] Confirm Terraform state storage encryption and access policy; never attach state to release evidence.
- [ ] Attach a sanitized provider-rotation record to the final packet.

Gate values: `repository remediation complete`, `provider rotation required`, or `provider rotation verified`. Only the last value closes a provider-side Alpha gate.
