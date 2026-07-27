# ADR: Azure data disposition

- Status: **Pending owner decision**
- Date: 2026-07-27
- Scope: Azure data and the Cloudflare–PlanetScale clean-slate replacement

## Decision required

The owner must select exactly one disposition:

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

This run has not made the owner decision. The safe operating mode is
**selective preservation**. The native platform may be developed with synthetic
data, but Azure deletion and production cutover remain gated.

## Controls

- No Azure resource, database, storage account, credential, or compatibility
  Worker was deleted or rotated.
- Legacy Azure code is requirements/reference material only.
- Any imported record must have a source locator, destination identifier,
  reconciliation result, retention class, and audit event.
- Evidence must not contain raw personal data or credentials.

## Owner sign-off

- Decision: `clean-state authorised` / `selective-preservation authorised`
- Owner: ____________________
- Date: ______________________
- Signature/reference: ____________________
