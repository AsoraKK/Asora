[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,
    [string]$SubscriptionId = '99df7ef7-776a-4235-84a4-c77899b2bb04',
    [string]$ResourceGroup = 'asora-psql-flex',
    [string]$CosmosAccount = 'asora-cosmos-dev',
    [string]$CosmosDatabase = 'asora',
    [string]$PostgresServer = 'asora-pg-dev-ne',
    [switch]$ProbeDataPlane
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\') + '\'
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\') + '\'
if ($outputRoot.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'OutputDirectory must be outside the Git repository.'
}
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

function Sanitize-Message {
    param([string]$Message)
    if ([string]::IsNullOrWhiteSpace($Message)) { return 'no diagnostic returned' }
    $sanitized = (($Message -replace '(?i)(password|secret|token|key|connectionstring)[^\r\n]*', '$1=[REDACTED]') -replace '\s+', ' ').Trim()
    return $sanitized.Substring(0, [Math]::Min(1000, $sanitized.Length))
}

function Invoke-AzJson {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        return [pscustomobject]@{ status = 'BLOCKED'; reason = 'Azure CLI (az) is unavailable'; data = $null }
    }
    $raw = @(& az @Arguments --only-show-errors 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($raw -join "`n").Trim()
    if ($exitCode -ne 0) {
        return [pscustomobject]@{ status = 'BLOCKED'; reason = (Sanitize-Message $text); data = $null }
    }
    if ([string]::IsNullOrWhiteSpace($text)) {
        return [pscustomobject]@{ status = 'COMPLETE'; reason = $null; data = $null }
    }
    try {
        return [pscustomobject]@{ status = 'COMPLETE'; reason = $null; data = ($text | ConvertFrom-Json) }
    } catch {
        return [pscustomobject]@{ status = 'BLOCKED'; reason = 'Azure CLI returned non-JSON output'; data = $null }
    }
}

function Tool-State {
    param([string]$Name)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return [pscustomobject]@{ name = $Name; available = $true; path = $command.Source } }
    return [pscustomobject]@{ name = $Name; available = $false; path = $null }
}

function Classify-Container {
    param([string]$ContainerName)
    $mappingPath = Join-Path $PSScriptRoot '..\..\infrastructure\azure-exit\migration-mappings.json'
    if (-not (Test-Path $mappingPath)) { return [pscustomobject]@{ classification = 'BLOCKED - CLASSIFICATION REQUIRED'; destination = $null } }
    $mappings = (Get-Content $mappingPath -Raw | ConvertFrom-Json).mappings
    $match = @($mappings | Where-Object { $_.source -eq "Cosmos asora/$ContainerName" }) | Select-Object -First 1
    if ($match) { return [pscustomobject]@{ classification = $match.classification; destination = $match.destination } }
    if ($ContainerName -match '(?i)(cache|projection|feed|telemetry|counter|index)') {
        return [pscustomobject]@{ classification = 'DISCARD TEST/DERIVED'; destination = $null }
    }
    return [pscustomobject]@{ classification = 'BLOCKED - CLASSIFICATION REQUIRED'; destination = $null }
}

$account = Invoke-AzJson @('account', 'show', '--subscription', $SubscriptionId, '--query', '{id:id,tenantId:tenantId}')
$resourceInventory = Invoke-AzJson @('resource', 'list', '--subscription', $SubscriptionId, '--query', '[].{id:id,name:name,type:type,resourceGroup:resourceGroup,location:location,provisioningState:provisioningState}')
$postgres = Invoke-AzJson @('postgres', 'flexible-server', 'show', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--name', $PostgresServer, '--query', '{id:id,name:name,host:fullyQualifiedDomainName,location:location,state:state,version:version,sku:sku.name,backupRetentionDays:backup.retentionDays}')
$postgresDatabases = Invoke-AzJson @('postgres', 'flexible-server', 'db', 'list', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--server-name', $PostgresServer, '--query', '[].{name:name,charset:charset,collation:collation}')
$cosmos = Invoke-AzJson @('cosmosdb', 'show', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--name', $CosmosAccount, '--query', '{id:id,name:name,location:locations[0].locationName,kind:kind,consistency:consistencyPolicy.defaultConsistencyLevel,backupType:backupPolicy.type}')
$cosmosContainers = Invoke-AzJson @('cosmosdb', 'sql', 'container', 'list', '--subscription', $SubscriptionId, '--resource-group', $ResourceGroup, '--account-name', $CosmosAccount, '--database-name', $CosmosDatabase, '--query', '[].{name:name,partitionKey:resource.partitionKey.paths,partitionKeyKind:resource.partitionKey.kind,throughput:options.throughput}')
$storageAccounts = Invoke-AzJson @('storage', 'account', 'list', '--subscription', $SubscriptionId, '--query', '[].{id:id,name:name,resourceGroup:resourceGroup,location:primaryLocation,kind:kind,sku:sku.name,httpsOnly:httpsTrafficOnly}')

$containerInventory = @()
if ($cosmosContainers.status -eq 'COMPLETE' -and $cosmosContainers.data) {
    foreach ($container in @($cosmosContainers.data)) {
        $classification = Classify-Container $container.name
        $dataPlane = if ($ProbeDataPlane -and $env:LYTHAUS_AZURE_READONLY_DATA_ACCESS_APPROVED -eq 'approved') {
            'NOT RUN - bounded probe implementation required before data reads'
        } elseif ($ProbeDataPlane) {
            'BLOCKED - set LYTHAUS_AZURE_READONLY_DATA_ACCESS_APPROVED=approved after owner approval'
        } else {
            'NOT RUN - management-plane discovery only'
        }
        $containerInventory += [pscustomobject]@{
            database = $CosmosDatabase
            container = $container.name
            partitionKey = $container.partitionKey
            partitionKeyKind = $container.partitionKeyKind
            estimatedDocumentCount = 'BLOCKED - Cosmos data-plane read required'
            representativeSchema = 'BLOCKED - Cosmos data-plane read required'
            lastWriteTimestamp = 'BLOCKED - Cosmos data-plane read required'
            purpose = if ($classification.destination) { $classification.destination } else { 'unclassified' }
            authoritative = if ($classification.classification -eq 'MIGRATE') { $true } elseif ($classification.classification -match 'DERIVED|TEST') { $false } else { 'UNKNOWN' }
            derived = $classification.classification -match 'DERIVED|TEST'
            testOnly = $classification.classification -match 'TEST'
            empty = 'UNKNOWN'
            migrationDestination = $classification.destination
            retentionDecision = $classification.classification
            dataPlaneProbe = $dataPlane
        }
    }
}

$dataPlaneAccess = [pscustomobject]@{
    cosmos = if ($ProbeDataPlane -and $env:LYTHAUS_AZURE_READONLY_DATA_ACCESS_APPROVED -eq 'approved') { 'BLOCKED - Built-in Data Reader is not confirmed for the active identity' } else { 'BLOCKED - owner must grant Cosmos DB Built-in Data Reader and authorize a bounded read-only probe' }
    storage = if ($ProbeDataPlane -and $env:LYTHAUS_AZURE_READONLY_DATA_ACCESS_APPROVED -eq 'approved') { 'BLOCKED - Storage Blob Data Reader is not confirmed for the active identity' } else { 'BLOCKED - owner must grant Storage Blob Data Reader and authorize a bounded read-only probe' }
}

$output = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    mode = 'read-only management-plane discovery; no documents, blob contents, secrets, or logical dumps exported'
    subscription = $SubscriptionId
    resourceGroup = $ResourceGroup
    account = $account
    resources = $resourceInventory
    postgresql = [ordered]@{
        server = $postgres
        databases = $postgresDatabases
        schemasTablesViews = 'BLOCKED - approved PostgreSQL export credentials and compatible client tools required'
        rowCounts = 'BLOCKED - approved PostgreSQL export credentials and compatible client tools required'
        logicalExport = 'BLOCKED - host, database, approved read/export credentials, firewall access, pg_dump, pg_restore, and psql required'
        clientTools = @((Tool-State 'psql'), (Tool-State 'pg_dump'), (Tool-State 'pg_restore'))
    }
    cosmos = [ordered]@{
        account = $cosmos
        database = $CosmosDatabase
        containers = $containerInventory
        access = $dataPlaneAccess.cosmos
    }
    storage = [ordered]@{
        accounts = $storageAccounts
        containersAndObjects = 'BLOCKED - bounded Storage Blob Data Reader inventory required; blob names and contents are not written to this manifest'
        access = $dataPlaneAccess.storage
    }
    privacyAndLegal = 'BLOCKED - Cosmos and Blob data-plane access required to reconcile requests, holds, tombstones, and export packages'
    evidencePolicy = @('This manifest contains metadata and blocker states only', 'Keep source exports and identity mappings encrypted outside Git', 'Do not use this manifest as application data')
}

$manifestPath = Join-Path $outputRoot 'azure-discovery.json'
$output | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output (ConvertTo-Json ([ordered]@{ manifest = $manifestPath; cosmosContainers = @($containerInventory).Count; status = if ($cosmosContainers.status -eq 'COMPLETE') { 'PARTIAL - data-plane reads blocked' } else { 'BLOCKED' } }) -Depth 5)
