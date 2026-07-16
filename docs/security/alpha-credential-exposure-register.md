# Alpha Credential Exposure Register

Status: Open Alpha gate
Values are intentionally omitted. Treat every entry as compromised until provider-side verification is recorded by Kyle.

## Scan evidence

| Surface | Result | Status |
| --- | --- | --- |
| Tracked files and full reachable Git history | Gitleaks scanned 1,368 commits; no finding | Executed and passed before final candidate commit; rerun required on release SHA |
| Tracked ZIP/deployment archives | Extracted and scanned; no finding | Executed and passed before final candidate commit; rerun required on release artifacts |
| Latest accessible main CI/deploy/E2E/contract/Flutter logs | Redacted Gitleaks scan; no finding | Executed and passed for an older main SHA, not release evidence |
| OpenAPI bundle | Artifact scan; no finding after sanitized examples | Executed and passed locally; exact-SHA CI pending |
| Generated web bundle | CI gate implemented | Not executed on release SHA |
| Provider consoles and revocation state | Repository has no authority to prove rotation | Kyle action required |
| Reference artifact named in the launch request | Artifact values were not present in the workspace | Not available; names below are derived from active runtime configuration |

## Register

| Credential name | Provider | Environment | Repository/project location | Git history | Docs | Generated artifacts | CI logs | Deployment packages | Rotation | Revocation | Replacement mechanism | Owner | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `JWT_SECRET` | Lythaus/Azure | dev, staging, Alpha | Auth runtime and deploy settings | No value detected | Name only | No value detected | No value detected in sampled logs | Exact artifact scan pending | Provider rotation required | Unverified | Azure Key Vault reference | Kyle | Rotate, revoke all refresh tokens, validate old JWT/session rejection, record key version |
| `INVITE_CODE_PEPPER` | Lythaus/Azure | staging, Alpha | Invite hashing and startup validation | No value detected | Name only | No value detected | Not verified on release SHA | Exact artifact scan pending | Repository remediation complete; provider creation/rotation required | Unverified | Azure Key Vault reference; HMAC-SHA-256 at rest | Kyle | Create/rotate 32+ character value and revoke all pre-rotation outstanding invites |
| `AUDIT_HMAC_KEY` | Lythaus/Azure | dev, staging, Alpha | Audit pseudonymisation | No value detected | Name only | No value detected | No value detected in sampled logs | Exact artifact scan pending | Repository remediation complete; provider verification required | Unverified | Azure Key Vault reference | Kyle | Verify current secret/version and pseudonymisation continuity plan |
| `HIVE_API_KEY` | Hive | staging, Alpha | Moderation and authorship classifier | No value detected | Name only | No value detected | No value detected in sampled logs | Exact artifact scan pending | Provider rotation required | Unverified | Azure Key Vault reference | Kyle | Rotate Hive key, revoke old key, run text/media health check, confirm Hive remains sole Alpha classifier |
| `COSMOS_CONNECTION_STRING` | Azure Cosmos DB | staging, Alpha | Cosmos client/startup | No value detected | Placeholder/name only | No value detected | No value detected in sampled logs | Exact artifact scan pending | Provider rotation required | Unverified | Key Vault reference; managed identity migration preferred | Kyle | Rotate keys, validate application failover and all containers, then revoke prior key |
| `POSTGRES_CONNECTION_STRING` | Azure PostgreSQL | staging, Alpha | PostgreSQL client and cohort reservation | No value detected | Placeholder/name only | No value detected | No value detected in sampled logs | Exact artifact scan pending | Provider rotation required | Unverified | Key Vault reference; managed identity where practical | Kyle | Rotate credential, validate auth/feed/DSR/cohort transactions, revoke old credential |
| `FCM_PRIVATE_KEY` | Google/Firebase | staging | Notification service account | No value detected | Name only | Mobile/web artifacts must not contain it | No value detected in sampled logs | Exact artifact scan pending | Provider rotation required | Unverified | Key Vault reference | Kyle | Rotate/revoke service-account key and confirm safety notification delivery |
| `CF_Access_Client_Secret` | Cloudflare Access | staging, Alpha | Admin proxy and browser smoke | No value detected | Name only | Must never enter web bundle | No value detected in sampled logs | Not part of app package | Provider rotation required | Unverified | GitHub encrypted secret copied to Key Vault reference for Functions | Kyle | Rotate service token, validate policy/audience/expiry, revoke old token |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | staging, production | Pages deployment | No value detected | Name only | Not embedded | Not verified on release SHA | Not part of app package | Provider rotation required | Unverified | GitHub encrypted secret with Pages-only scope | Kyle | Rotate, restrict account/project scope, review Workers and Pages permissions |
| OAuth client secrets | Google/Apple/World ID as configured | staging, Alpha | Identity-provider configuration | No value detected | Names/hints only | Must not enter Flutter defines | Not verified | Not part of public artifact | Provider rotation required where a secret exists | Unverified | Provider secret store/Key Vault | Kyle | Rotate, verify exact redirect URIs and PKCE flows, revoke old secret |
| Azure federated deployment identity | Microsoft Entra ID | staging, production | GitHub OIDC workflows | No client secret introduced | IDs only | Not embedded | OIDC used | Not embedded | Repository remediation complete | N/A | Workload identity federation | Kyle | Review subject/audience/environment scope and remove unused credentials |

Alpha remains NO-GO until the `provider rotation required` entries are changed to `provider rotation verified`, with dates and non-secret provider identifiers recorded in a signed release evidence artifact.
