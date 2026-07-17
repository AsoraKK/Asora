[CmdletBinding()]
param(
    [string]$ResourceGroup = 'asora-psql-flex',
    [string]$FunctionApp = 'asora-function-dev',
    [int]$MinimumRetentionDays = 60,
    [int]$MinimumRollbackPackages = 10
)

$ErrorActionPreference = 'Stop'
$activeUrl = az resource show `
    --resource-group $ResourceGroup `
    --name $FunctionApp `
    --resource-type Microsoft.Web/sites `
    --api-version 2024-04-01 `
    --query 'properties.functionAppConfig.deployment.storage.value' `
    --output tsv

if (-not $activeUrl) {
    throw 'The active deployment package could not be identified; cleanup is forbidden.'
}

$uri = [Uri]$activeUrl
$account = $uri.Host.Split('.')[0]
$segments = $uri.AbsolutePath.TrimStart('/').Split('/', 2)
if ($segments.Count -ne 2) {
    throw 'The active deployment URL does not contain a container and blob path.'
}

$container = $segments[0]
$activeBlob = [Uri]::UnescapeDataString($segments[1])
$raw = az storage blob list `
    --account-name $account `
    --container-name $container `
    --auth-mode login `
    --output json

$parsedBlobs = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
$blobs = @($parsedBlobs) | Sort-Object { [DateTimeOffset]($_.properties.lastModified) } -Descending
$protectedNames = @($blobs | Select-Object -First $MinimumRollbackPackages | ForEach-Object name)
$cutoff = [DateTimeOffset]::UtcNow.AddDays(-$MinimumRetentionDays)

$inventory = foreach ($blob in $blobs) {
    $modified = [DateTimeOffset]($blob.properties.lastModified)
    $isActive = $blob.name -eq $activeBlob
    $isNewestRollback = $protectedNames -contains $blob.name
    [pscustomobject]@{
        name = $blob.name
        lastModifiedUtc = $modified.UtcDateTime.ToString('o')
        sizeBytes = $blob.properties.contentLength
        active = $isActive
        newestRollbackSet = $isNewestRollback
        eligibleAfterReview = (-not $isActive) -and (-not $isNewestRollback) -and ($modified -lt $cutoff)
    }
}

[pscustomobject]@{
    generatedAtUtc = [DateTimeOffset]::UtcNow.UtcDateTime.ToString('o')
    resourceGroup = $ResourceGroup
    functionApp = $FunctionApp
    storageAccount = $account
    container = $container
    activeBlob = $activeBlob
    minimumRetentionDays = $MinimumRetentionDays
    minimumRollbackPackages = $MinimumRollbackPackages
    dryRunOnly = $true
    packageCount = @($inventory).Count
    eligibleCount = @($inventory | Where-Object eligibleAfterReview).Count
    packages = @($inventory)
} | ConvertTo-Json -Depth 5
