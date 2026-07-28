# ADR: Azure data disposition

- Status: **Accepted — selective preservation**
- Date: 2026-07-27
- Scope: Azure data and the Cloudflare–PlanetScale clean-slate replacement

## Decision

The approved disposition is **selective-preservation authorised**. The owner
confirmed that Azure must be read carefully, meaningful information extracted,
and valid records replicated into the canonical PlanetScale model. This does
not authorise Azure deletion, unresolved data loss, or migration writes before
the access and measured-usage gates pass.

### Clean-state authorised

Azure contains only development/test data. There are no active production users,
unresolved privacy requests, legal holds, or contractual retention obligations
requiring migration. No Azure application records will be imported.

### Selective-preservation authorised

Azure contains records that must be retained. The required data classes must be
enumerated, exported, reconciled, and retained with identity continuity where
necessary. Azure deletion remains prohibited until the reconciliation evidence
is accepted.

## Current state

The native platform may be developed with synthetic data, but Azure deletion
and production cutover remain gated. The approved operation is selective
preservation, with source authority proven per data class.

### Read-only evidence reviewed 2026-07-28

- The Azure Cosmos account contains live containers for users, authentication,
  posts, comments, moderation, notifications, privacy requests, privacy audit,
  and legal holds.
- Metadata-only enumeration found no DSR export blobs in the observed export
  container, but this does not prove that the corresponding Cosmos records are
  absent.
- Read-only count queries for `privacy_requests`, `privacy_audit`, and
  `legal_holds` returned HTTP 403 with the available Entra data-plane identity.
- Consequently, active-user, outstanding-privacy-request, and legal-hold
  counts remain **unknown**. A clean-state decision cannot be evidenced from
  the current permissions; selective preservation remains the operating
  default until the owner signs a disposition and the required data-plane
  review is completed.

Evidence references: `docs/evidence/azure-exit/2026-07-26/dsr-reconciliation.md`,
`cosmos-export-validation.md`, and `azure-exit-readiness-report.md`.

## Controls

- No Azure resource, database, storage account, credential, or compatibility
  Worker was deleted or rotated.
- Legacy Azure code is requirements/reference material only.
- Any imported record must have a source locator, destination identifier,
  reconciliation result, retention class, and audit event.
- Evidence must not contain raw personal data or credentials.

## Owner decision record

- Decision: `selective-preservation authorised`
- Owner: Kyle Kern
- Date: 2026-07-28
- Reference: approved controlled clean-slate migration instruction
