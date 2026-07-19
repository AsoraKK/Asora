# Email verification lifetime evidence — 2026-07-19

## Result

**Superseded by the v2 verification design; public cutover remains NO-GO.**
The bounded lifetime remains in force, but it was not a complete remedy for the
observed false-expiry failure.

## Evidence

- A supervised preview registration test reached the verification-pending
  state, but reported that verification messages arrived after the former
  30-minute token lifetime.
- Application telemetry records email send attempts and provider acceptance or
  failure, but it does not currently record an ACS terminal delivery state.
  Actual provider delivery latency is therefore **UNKNOWN**.
- No raw verification URL, token, mailbox credential, or delivery payload is
  recorded in this evidence.

## Implemented policy

| Control | Value |
| --- | --- |
| Default verification lifetime | 120 minutes |
| Configured range | Whole minutes from 30 through 240 |
| Configuration name | `EMAIL_VERIFICATION_TTL_MINUTES` |
| Deployment source | Non-secret GitHub repository variable `MVP_EMAIL_VERIFICATION_TTL_MINUTES` |
| Old-link behaviour after resend | Historical v1 behavior; replaced by the v2 bounded two-active-link policy |
| Token storage | HMAC digest only; raw token is sent only through the approved email provider |
| Reset-token lifetime | Unchanged |

The Function startup validator and deployment workflow reject a malformed or
out-of-range configured lifetime. The service validates the setting before it
creates a registration or resend token.

## Validation

- Focused Functions tests cover the 120-minute default, a valid configured
  value, malformed/out-of-range rejection, registration expiry, and resend
  expiry.
- Startup validation rejects an out-of-range value in the MVP environment.
- Functions type-check passes.

## Remaining proof

1. Deploy the exact validated backend artifact with
   `MVP_EMAIL_VERIFICATION_TTL_MINUTES=120`.
2. Deploy and validate the v2 explicit-confirmation flow described in
   `2026-07-19-email-verification-v2-design.md`.
3. Prove successful verification, login, refresh rotation, logout, and
   post-logout rejection through the immutable preview gateway.
4. Add or query a privacy-safe ACS delivery-status signal before attributing
   the delay to the provider or claiming delivery reliability.

No public DNS, custom-domain binding, email DNS, Azure origin enforcement, or
legacy Asora resource was changed by this remediation.
