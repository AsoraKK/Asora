# Azure Exit Data-Extraction Operator Pack

This is a sanitized, copy-pasteable operator guide for the Azure exit work. It is safe to keep in the repository because it contains no credentials, connection strings, database records, Cosmos documents, queue bodies, media, or secret values.

Raw exports must not be written to this repository or to ordinary Codex workspace storage. Set both destination variables only to approved encrypted storage locations. If two approved encrypted locations are unavailable, stop before the export stage.

## 1. Preconditions

Run from an operator workstation with PostgreSQL 16 client tools, Azure CLI, and an approved secure credential mechanism.

```powershell
$ErrorActionPreference = 'Stop'

$SubscriptionId = '99df7ef7-776a-4235-84a4-c77899b2bb04'
$ResourceGroup = 'asora-psql-flex'
$PrimaryExportRoot = '<APPROVED_ENCRYPTED_PATH_1>'
$SecondaryExportRoot = '<APPROVED_ENCRYPTED_PATH_2>'
$RepositoryRoot = (Resolve-Path '<LYTHAUS_REPOSITORY_ROOT>').Path

if ($PrimaryExportRoot.StartsWith('<') -or $SecondaryExportRoot.StartsWith('<')) {
  throw 'Replace both export paths with approved encrypted locations before continuing.'
}

$primary = [IO.Path]::GetFullPath($PrimaryExportRoot)
$secondary = [IO.Path]::GetFullPath($SecondaryExportRoot)
$repo = [IO.Path]::GetFullPath($RepositoryRoot)

if ($primary.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase) -or
    $secondary.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Export destinations must not be inside the repository.'
}

New-Item -ItemType Directory -Force -Path $primary,$secondary | Out-Null
az account set --subscription $SubscriptionId
az account show --query '{subscription:id,tenant:tenantId,state:state}' -o json
Get-Command az,pg_dump,pg_restore,psql,pg_dumpall
```

Do not continue if either destination is not encrypted and approved for personal data.

## 2. Read-Only Azure Inventory

```powershell
az group list --subscription $SubscriptionId -o json > "$primary\azure-resource-groups.json"
az resource list --subscription $SubscriptionId -o json > "$primary\azure-resources-generic.json"
az resource list -g $ResourceGroup --subscription $SubscriptionId -o json > "$primary\azure-resources-primary-rg.json"
az storage account list --subscription $SubscriptionId -o json > "$primary\azure-storage-accounts.json"
az functionapp list --subscription $SubscriptionId -o json > "$primary\azure-function-apps.json"
az cosmosdb list --subscription $SubscriptionId -o json > "$primary\azure-cosmos-accounts.json"
az postgres flexible-server list --subscription $SubscriptionId -o json > "$primary\azure-postgres-servers.json"
az identity list -g $ResourceGroup -o json > "$primary\azure-managed-identities.json"
az lock list --subscription $SubscriptionId -o json > "$primary\azure-locks.json"
az policy assignment list --scope "/subscriptions/$SubscriptionId" -o json > "$primary\azure-policy-assignments.json"
az resource list --subscription $SubscriptionId --resource-type Microsoft.Security/securityContacts -o json > "$primary\azure-security-contacts.json"
```

For providers without a usable CLI command, use read-only REST calls through `az rest`. Save only metadata and redact values before copying any result into repository evidence.

## 3. DSR Queue Counts

Use queue metadata/list operations only. Do not retrieve messages, dequeue, update, or process them.

```powershell
$DsrStorageAccount = 'stasoradsrdev'
$QueueNames = @('dsr-requests','dsr-requests-poison','dsr-diagnostic-ping','dsr-diagnostic-ping-poison')

foreach ($queue in $QueueNames) {
  az storage queue show `
    --account-name $DsrStorageAccount `
    --name $queue `
    --auth-mode login `
    --output json > "$primary\queue-$queue-metadata.json"
}
```

If queue approximate counts are unavailable, record the permission/API failure and do not classify DSR as safe.

## 4. PostgreSQL Metadata and Export

Use an interactive secure prompt or an approved environment-variable mechanism. Never put passwords in commands, scripts, reports, or Git.

```powershell
$env:PGHOST = 'asora-pg-dev-ne.postgres.database.azure.com'
$env:PGUSER = '<APPROVED_DATABASE_USER>'
$env:PGDATABASE = '<APPROVED_DATABASE_NAME>'
$env:PGSSLMODE = 'require'

psql -v ON_ERROR_STOP=1 -Atc "select current_database(),version();" > "$primary\postgres-server-check.txt"
psql -v ON_ERROR_STOP=1 -Atc "select datname from pg_database where datistemplate = false order by datname;" > "$primary\postgres-databases.txt"
psql -v ON_ERROR_STOP=1 -Atc "select nspname from pg_namespace order by nspname;" > "$primary\postgres-schemas.txt"
psql -v ON_ERROR_STOP=1 -Atc "select extname,extversion from pg_extension order by extname;" > "$primary\postgres-extensions.txt"
psql -v ON_ERROR_STOP=1 -Atc "select rolname,rolcanlogin,rolsuper from pg_roles order by rolname;" > "$primary\postgres-roles-redacted.txt"
psql -v ON_ERROR_STOP=1 -Atc "select schemaname,tablename from pg_tables where schemaname not in ('pg_catalog','information_schema') order by 1,2;" > "$primary\postgres-tables.txt"

pg_dump --format=custom --file="$primary\asora-postgres-full.dump"
pg_dump --format=plain --file="$primary\asora-postgres-full.sql"
pg_dump --schema-only --file="$primary\asora-postgres-schema.sql"
pg_dumpall --globals-only --file="$primary\asora-postgres-globals.sql"

Get-ChildItem "$primary\asora-postgres-*" | Get-FileHash -Algorithm SHA256 | Format-Table
Copy-Item "$primary\asora-postgres-*" $secondary -Force
```

Do not claim backup success until the custom dump has been restored and validated.

## 5. PostgreSQL Isolated Restore

Restore into a new isolated PostgreSQL 16 instance or container, never into production.

```powershell
$env:PGHOST = '<ISOLATED_RESTORE_HOST>'
$env:PGUSER = '<RESTORE_USER>'
$env:PGDATABASE = '<ISOLATED_RESTORE_DATABASE>'
$env:PGSSLMODE = 'require'

createdb $env:PGDATABASE
pg_restore --exit-on-error --no-owner --dbname=$env:PGDATABASE "$primary\asora-postgres-full.dump"

psql -v ON_ERROR_STOP=1 -Atc "select count(*) from pg_namespace;"
psql -v ON_ERROR_STOP=1 -Atc "select count(*) from pg_class where relkind in ('r','p','v','m','S');"
psql -v ON_ERROR_STOP=1 -Atc "select count(*) from pg_index where indisvalid;"
psql -v ON_ERROR_STOP=1 -Atc "select count(*) from pg_constraint;"
psql -v ON_ERROR_STOP=1 -Atc "select table_schema,table_name,column_name,data_type from information_schema.columns where data_type like 'uuid%' order by 1,2,3;"
```

Compare source and restored table counts, identity/provider mapping tables, DSR-related records, extensions, indexes, constraints, and representative read-only queries. Retain the restore log and validation results outside GitHub.

## 6. Cosmos Configuration and Export

Re-query the account and database before exporting. Use a read-only credential and a client that supports continuation tokens. Never print document bodies to the terminal.

```powershell
$CosmosAccount = 'asora-cosmos-dev'
$CosmosDatabase = 'asora'

az cosmosdb sql container list -g $ResourceGroup -a $CosmosAccount -d $CosmosDatabase -o json > "$primary\cosmos-containers.json"
```

For each returned container, create these files outside the repository:

```text
<container>-documents.ndjson
<container>-configuration.json
<container>-count.txt
<container>-sha256.txt
```

The export implementation must:

1. Read container configuration.
2. Read documents with continuation tokens.
3. Count every exported document.
4. Record source and exported counts.
5. Hash the NDJSON file.
6. Reconcile counts before marking the container passed.
7. Copy the complete export set to the second approved encrypted location.

Any failed or unreconciled container keeps the Cosmos phase incomplete.

## 7. Storage and Media Preservation

Inventory the four known accounts and preserve only data required for restoration, privacy, or investigation:

```powershell
$StorageAccounts = @('stasoradsrdev','asoramediadev','asorapsqlflex8fa9','asoraflexdev1404')
foreach ($account in $StorageAccounts) {
  az storage container list --account-name $account --auth-mode login -o json > "$primary\storage-$account-containers.json"
  az storage queue list --account-name $account --auth-mode login -o json > "$primary\storage-$account-queues.json"
  az storage share list --account-name $account --auth-mode login -o json > "$primary\storage-$account-shares.json"
}
```

Preserve:

- DSR export artifacts.
- Required user or test media.
- Operational evidence not represented elsewhere.
- Deployment artifacts only where source cannot reproduce them.

Exclude disposable caches, package caches, temporary deployment outputs, and standard build artifacts. Record each exclusion and its rationale in `storage-export-validation.md`.

## 8. Evidence and Hashing

```powershell
Get-ChildItem $primary -File -Recurse |
  Get-FileHash -Algorithm SHA256 |
  Export-Csv "$primary\export-manifest.csv" -NoTypeInformation

Copy-Item "$primary\export-manifest.csv" $secondary -Force
Get-FileHash "$secondary\export-manifest.csv" -Algorithm SHA256
```

The two manifests must agree before data preservation is considered complete.

## 9. Final Acceptance Gate

Mark the Azure exit `READY FOR HUMAN-APPROVED DECOMMISSION` only when all are true:

- PostgreSQL custom dump restores successfully.
- PostgreSQL schemas, tables, indexes, constraints, UUID types, identity mappings, and DSR records validate.
- Every live Cosmos container exports successfully.
- Every Cosmos source count matches its exported count.
- DSR queues and poison queues are reconciled.
- Privacy records and legal holds are resolved or safely preserved.
- Required storage and media are exported.
- Monitoring and operational evidence is retained.
- No unknown data-bearing Azure resource remains.
- The complete export set exists in two approved encrypted locations.
- No secret value or personal data is committed to GitHub.

Cloudflare replacement, OAuth migration, webhook migration, application uptime, and Azure CI/CD replacement are explicitly non-blocking for this data-preservation decision.
