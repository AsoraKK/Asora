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

Azure is not presumed clean. Every record must be classified before import or
discard. The only accepted classifications are `MIGRATE`,
`PRESERVE AS EVIDENCE`, `DISCARD TEST/DERIVED`, and
`BLOCKED — ACCESS REQUIRED`.

## Current state

The native platform may be developed with synthetic data, but Azure deletion
and production cutover remain gated. The approved operation is selective
preservation, with source authority proven per data class.

### Read-only evidence reviewed 2026-07-29

- OIDC authentication and the three temporary data-reader assignments are
  active.
- All 32 Cosmos containers under database `asora` are readable.
- The encrypted full export contains 224 records across all 32 containers.
  Eleven containers are non-empty; the other 21 have a verified zero count.
- `stasoradsrdev/dsr-exports` contains 11 ZIP packages totaling 17,641 bytes.
  Five packages totaling 5,140 bytes are attached to unresolved non-drill
  requests and are selected for encrypted preservation.
- `asoramediadev/user-media` has a verified zero object count.
- Azure PostgreSQL is network reachable, but the documented credential was
  rejected.

Record-level disposition preserves seven canonical identities, including five
`relink_required` identities and two deletion tombstones. Three source contact
addresses are selected for encrypted, unverified migration contact records;
no provider subject is imported or invented. Five explicit legal-hold drills
are discarded, while one active hold without proven test provenance is
preserved.

## Controls

- No Azure resource, database, storage account, credential, or compatibility
  Worker was deleted or rotated.
- Legacy Azure code is requirements/reference material only.
- Any imported record must have a source locator, destination identifier,
  reconciliation result, retention class, and audit event.
- Evidence must not contain raw personal data or credentials.
- Raw and transformed datasets use canonical JSON with stable key ordering,
  stable source-identifier ordering, UTF-8 encoding, explicit null/missing/empty
  distinctions, and separate SHA-256 hashes.

## PostgreSQL disposition gate

Azure PostgreSQL may be classified as discarded pre-production state only when
the Cosmos review proves all of the following:

- no genuine external account requires continuity;
- no unresolved privacy request or legal hold depends on PostgreSQL;
- no authorship relationship requires a missing provider mapping;
- no paid entitlement or account-recovery obligation exists;
- all remaining identities are founder, team, test, or synthetic; and
- clean Google reauthentication cannot create ownership ambiguity.

If every condition is proved, record exactly:

`Azure PostgreSQL disposition: DISCARD — PRE-PRODUCTION LEGACY IDENTITY STORE`

`Reason: No authoritative production identity, legal, privacy, payment or
account-continuity obligation was identified that requires recovery of the
inaccessible PostgreSQL records.`

If any condition is unproved, retain `BLOCKED — ACCESS REQUIRED`.

### Current PostgreSQL decision

`Azure PostgreSQL disposition: DISCARD — PRE-PRODUCTION LEGACY IDENTITY STORE`

`Reason: No authoritative production identity, legal, privacy, payment or
account-continuity obligation was identified that requires recovery of the
inaccessible PostgreSQL records.`

The owner explicitly accepts that legacy provider-link information may not be
recovered. Five preserved accounts remain `relink_required`; two are deleted.
Fresh Google authentication may relink only an unambiguous migration match and
must never rely on an unverified email address alone. Unresolved records remain
restricted rather than being assigned to the wrong account. No further Azure
PostgreSQL credential, firewall, Entra authentication, or export attempt is
permitted by this decision.

## Owner decision record

- Decision: `selective-preservation authorised`
- Owner: Kyle Kern
- Date: 2026-07-29
- Reference: explicit owner authorisation for Azure PostgreSQL pre-production abandonment
