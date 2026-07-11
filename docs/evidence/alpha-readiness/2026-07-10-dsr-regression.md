# DSR Regression Evidence — 2026-07-10

Status: **exact candidate not run**

Prior evidence in `2026-07-05-dsr-cold-regression.json` recorded export/delete queue movement on an older deployment. It is useful history but cannot validate a new release SHA.

The protected release workflow runs `scripts/dsr-drills/live-dsr-queue-drill.mjs` with isolated synthetic identities, records only hashed subject and failure identifiers, requires export to reach `awaiting_review` or a later successful state, requires delete to reach `succeeded`, checks the queue through Azure identity, and uploads the sanitized JSON beside the release manifest. Failed, canceled, or non-terminal processing blocks release eligibility.
