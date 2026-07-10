# DSR Regression Evidence — 2026-07-10

Status: **exact candidate not run**

Prior evidence in `2026-07-05-dsr-cold-regression.json` recorded export/delete queue movement on an older deployment. It is useful history but cannot validate a new release SHA.

The protected release workflow now runs `scripts/dsr-drills/live-dsr-queue-drill.mjs` against a random nonexistent subject, records only a hashed subject identifier, requires export and delete requests to move beyond `queued` with `attempt > 0`, checks the queue through Azure identity, and uploads the sanitized JSON beside the release manifest. Any failure blocks release eligibility.
