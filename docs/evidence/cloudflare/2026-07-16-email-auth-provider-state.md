# Lythaus email authentication provider state — 2026-07-16

## Result

**FOUNDATION READY; LIVE EMAIL NO-GO.** The approved Azure Communication
Services Email foundation exists, but `mail.lythaus.co` DNS verification,
sender creation, application deployment, and live delivery remain incomplete.

## Sanitized live evidence

| Control | Observed state |
| --- | --- |
| Azure provider | `Microsoft.Communication` registered |
| Email service | `lythaus-mvp-email`; provisioning succeeded; data location Europe |
| Custom domain | `mail.lythaus.co`; customer-managed; provisioning succeeded |
| Verification | Domain, SPF, DKIM, and DKIM2 not yet verified |
| Communication service | `lythaus-mvp-communication`; provisioning succeeded; data location Europe |
| Local ACS key authentication | Disabled |
| Domain link | Intentionally pending verification |
| Function identity | System-assigned identity present |
| ACS authorization | `Communication and Email Service Owner`, scoped to the one Communication resource |
| Email token HMAC | Key Vault secret exists; Function receives a Key Vault reference only |
| Sender configuration | Public settings use `Lythaus` and `no-reply@mail.lythaus.co` |
| Email auth schema | Two additive tables applied; both contain zero rows |
| GitHub audit token | Protected secret present; credential-like repository-variable duplicate removed |

No secret value, TXT value, OAuth token, password, connection string, or raw
provider response is included in this evidence.

## RBAC finding

The GitHub OIDC service principal has subscription `Contributor`. It can create
`Microsoft.Communication` resources and update the Function App, but its role has
no Key Vault data actions and excludes `Microsoft.Authorization/*/Write`. The
interactive subscription Owner session therefore performed the narrowly scoped
role assignment and Key Vault secret creation. The exact missing capabilities
for an OIDC-only run were:

- Key Vault secret write data action;
- `Microsoft.Authorization/roleAssignments/write`.

## Next safe operations

1. Run the protected `Configure ACS email domain` workflow from the exact branch.
2. Confirm all four Azure verification states succeed.
3. Link the verified domain to `lythaus-mvp-communication`.
4. Create sender username `no-reply` with display name `Lythaus`.
5. Deploy the exact backend SHA and perform live registration/verification/reset tests.

No public Lythaus application, API, marketing, or admin hostname was attached by
this provider preparation.
