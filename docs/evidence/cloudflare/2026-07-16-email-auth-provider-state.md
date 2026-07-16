# Lythaus email authentication provider state — 2026-07-16

## Result

**PROVIDER READY; LIVE EMAIL LIFECYCLE NO-GO.** The approved Azure
Communication Services Email foundation, verified `mail.lythaus.co` domain,
approved sender, scoped Function identity, and provider acceptance test are
complete. Inbox delivery and the full application registration, verification,
login, reset, logout, and revocation lifecycle remain unproven.

## Sanitized live evidence

| Control | Observed state |
| --- | --- |
| Azure provider | `Microsoft.Communication` registered |
| Email service | `lythaus-mvp-email`; provisioning succeeded; data location Europe |
| Custom domain | `mail.lythaus.co`; customer-managed; provisioning succeeded |
| Verification | Domain, SPF, DKIM, and DKIM2 verified; DMARC not started |
| Communication service | `lythaus-mvp-communication`; provisioning succeeded; data location Europe |
| Local ACS key authentication | Disabled |
| Domain link | Exact `mail.lythaus.co` domain linked to the Communication service |
| Function identity | System-assigned identity present |
| ACS authorization | `Communication and Email Service Owner`, scoped to the one Communication resource |
| Email token HMAC | Key Vault secret exists; Function receives a Key Vault reference only |
| Sender configuration | Sender username `no-reply`; display name `Lythaus`; public application setting uses the approved address |
| Email auth schema | Two additive tables applied; both contain zero rows |
| GitHub audit token | Protected secret present; credential-like repository-variable duplicate removed |
| Provider acceptance | One minimal send operation returned `Succeeded`; mailbox delivery was not confirmed |
| Application telemetry | Privacy-safe `attempted`, `accepted`, and `failed` events by message class; no address, token, message ID, body, or provider error |
| Provider delivery telemetry | No ACS Event Grid delivery/bounce/suppression subscription exists; deferred pending an approved telemetry design |
| Cost guardrail | Resource-filtered monthly budget `lythaus-acs-email-monthly`: warning at $10, critical at $25, current spend $0 |

No secret value, TXT value, OAuth token, password, connection string, or raw
provider response is included in this evidence.

## RBAC finding

The GitHub OIDC service principal has `Contributor` at subscription and resource
group scope. It can create `Microsoft.Communication` resources and update the
Function App, but its role has no Key Vault secret data actions and excludes
`Microsoft.Authorization/*/Write`. The Function managed identity already has
`Communication and Email Service Owner` scoped to the exact Communication
service. The exact missing capabilities for an OIDC-only secret or RBAC change
remain:

- Key Vault secret write data action;
- `Microsoft.Authorization/roleAssignments/write`.

## Locked MVP email scope

The supported MVP model is email plus password only: registration, verification,
resend, login, forgot/reset, access and refresh tokens, logout, and revocation.
Magic links and email one-time codes are out of scope. The UI label is exactly
`Continue with email`.

## Next safe operations

1. Use supervised mailbox access to confirm delivery of the already accepted test message.
2. Deploy the exact backend candidate containing privacy-safe email telemetry.
3. Perform live registration, verification, login, refresh, logout, reset, expiry, replay, enumeration, and rate-limit tests.
4. Add provider delivery/bounce/suppression telemetry only through a separately approved design.

No public Lythaus application, API, marketing, or admin hostname was attached by
this provider preparation.
