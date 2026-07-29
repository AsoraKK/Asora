# Native platform secrets inventory

Names only. Values, private keys, tokens, connection strings, and personal
data are never stored in this file or in Git.

## Public API Worker

- `AUTH_PASSWORD_PEPPER_V1`
- `PII_ENCRYPTION_KEY_V1`
- `PII_HMAC_KEY_V1`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_JWKS`
- `JWT_KEY_ID`
- `GOOGLE_CLIENT_SECRET`
- `TURNSTILE_SECRET_KEY`
- `EMAIL_PROVIDER_TOKEN` (only when an external email adapter is enabled)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Admin API Worker

- `ACCESS_SUBJECT_HMAC_KEY`

## Jobs Worker

- `HIVE_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `EXTERNAL_BACKUP_HEALTHCHECK_TOKEN`

## Protected CI and migration environment

- `CLOUDFLARE_PRODUCTION_ACCOUNT_ID`
- `CLOUDFLARE_PRODUCTION_ZONE_ID`
- `CLOUDFLARE_PRODUCTION_API_TOKEN`
- `PLANETSCALE_ADMIN_DATABASE_URL`
- `PLANETSCALE_PRODUCTION_MIGRATIONS_APPROVED`
- `PLANETSCALE_SERVICE_TOKEN`
- `PLANETSCALE_SERVICE_TOKEN_ID`

Secrets are provisioned per Worker with least privilege. Production values
remain unconfigured until the dedicated Cloudflare account and production
database pass the five acceptance gates.
