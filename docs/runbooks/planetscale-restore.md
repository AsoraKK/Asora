# PlanetScale restore runbook

1. Restore the protected backup or PITR point into a new temporary branch.
2. Re-enable `postgis`, `pg_trgm`, `unaccent`, and `pgcrypto`; restore any
   post-restore role/default-privilege configuration.
3. Apply the immutable migrations and record the migration checksum.
4. Run `database/planetscale/verification/restore-check.sql`.
5. Reconcile schema/table counts, constraints, indexes, and representative
   identity, content, moderation, and privacy queries.
6. Run the native smoke suite and record hashes/statuses without recording data.
7. Export a logical, encrypted copy to the independent provider destination.
8. Retain the sanitised evidence packet, then delete the temporary branch.

If the independent destination is unavailable, the recovery gate remains
blocked. Do not claim provider-independent disaster recovery.
