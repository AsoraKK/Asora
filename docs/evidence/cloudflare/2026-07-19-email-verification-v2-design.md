# Email verification v2 design evidence — 2026-07-19

## Status

**Repository implementation prepared; live deployment and mailbox acceptance remain pending.**

## Corrected failure model

The former remediation increased the token lifetime but did not address the
root causes: automatic link redemption, a static preview link origin, resend
revocation, generic client errors, and a Cosmos write after the authoritative
transaction committed.

## Implemented repository controls

- Fragment token plus explicit confirmation; no verification GET endpoint.
- Server-owned `action_target` mapping for production and one exact preview.
- PostgreSQL verification transaction creates an idempotent projection outbox
  event and returns before Cosmos projection.
- Two active unexpired verification links at most; provider send failure revokes
  only the newly prepared link.
- Versioned purpose-bound HMAC tokens with non-secret key identifiers, bounded
  previous-key support, and a dedicated derived delivery-recipient reference.
- Separate application acceptance states from ACS terminal Event Grid delivery
  states.

No token, raw recipient, mailbox credential, provider payload, or secret is
included in this evidence. No Azure, Cloudflare, DNS, email, or public-domain
provider mutation was made while producing it.
