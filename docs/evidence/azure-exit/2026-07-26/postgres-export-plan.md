# PostgreSQL Export and Restore Plan

Pending manual execution by an authorized operator. Do not place dumps in GitHub or the repository.

```powershell
$env:PGHOST='asora-pg-dev-ne.postgres.database.azure.com'
$env:PGUSER='<approved-user>'
$env:PGDATABASE='<approved-database>'
$env:PGSSLMODE='require'
pg_dump --format=custom --file='asora-postgres-full.dump'
pg_dump --format=plain --file='asora-postgres-full.sql'
pg_dump --schema-only --file='asora-postgres-schema.sql'
pg_dumpall --globals-only --file='asora-postgres-globals.sql'
Get-FileHash .\asora-postgres-full.dump -Algorithm SHA256
Get-FileHash .\asora-postgres-full.sql -Algorithm SHA256
Get-FileHash .\asora-postgres-schema.sql -Algorithm SHA256
```

Use encrypted local/offline storage approved for personal data. Restore the custom dump into an isolated PostgreSQL instance, then verify schemas, extensions, table counts, constraints, indexes, representative referential-integrity queries, and application read-only smoke tests. No dump or restore was performed in this audit.
