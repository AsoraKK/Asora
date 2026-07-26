# Secret Dependency Map

| Secret/config name | Consumer | Azure dependency | Cloudflare destination | Status |
|---|---|---|---|---|
| `COSMOS_CONNECTION_STRING` / `COSMOS-CONN` | Function runtime/deploy | Key Vault + Cosmos | Workers secret or managed binding | Migration required |
| `POSTGRES_CONNECTION_STRING` / `postgres-connection-string` | Function runtime | Key Vault + PostgreSQL | Hyperdrive/managed DB secret | Migration required |
| `JWT_SECRET`, HMAC/signing keys | Auth, receipts, audit | Key Vault | Workers secrets/KMS | Rotation required before cutover |
| `DSR_QUEUE_CONNECTION` | DSR processor | Storage queue | Cloudflare Queues | Migration required |
| OAuth, FCM, Hive, ACS, email, Cloudflare Access settings | Auth/notifications/moderation/edge | Key Vault/app settings | Provider-specific secret stores | Inventory names only |

All active-looking credentials in repository history or documentation require rotation during the approved migration. None were rotated here.
