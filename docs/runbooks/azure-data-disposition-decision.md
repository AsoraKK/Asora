# Azure Data-Disposition Decision

Status: `PENDING OWNER DECISION`

This record is a production and deletion gate. It must be completed by the
Lythaus owner before Azure data services are deleted or unresolved Azure data
could be excluded from a production cutover.

## Option A — Clean-state authorised

The owner confirms that Azure contains only development or test data and that
there are no active production users, unresolved privacy/deletion requests,
legal holds, contractual retention obligations, or records requiring identity
continuity. No Azure data import is authorised.

Owner name: ____________________

Signature: _____________________   Date: _____________________

## Option B — Selective preservation authorised

The owner identifies the data classes that must be retained. Those classes must
be exported, reconciled, and secured before deletion or cutover. Identity
continuity, privacy requests, legal holds, and retention evidence must be
explicitly accounted for.

Required data classes / evidence references:

______________________________________________________________________________

______________________________________________________________________________

Owner name: ____________________

Signature: _____________________   Date: _____________________

## Current execution rule

Until one option is signed, the implementation uses **selective preservation as
the safe default**. Synthetic development work may continue. Azure deletion is
not authorised, and production cutover remains blocked where unresolved
records could be abandoned.
