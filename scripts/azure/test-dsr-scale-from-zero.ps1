[CmdletBinding()]
param(
    [int]$Runs = 5,
    [int]$IdleMinutes = 30,
    [switch]$ConfirmedAlwaysReadyZero
)

$ErrorActionPreference = 'Stop'
if ($Runs -lt 5) {
    throw 'At least five independent runs are required.'
}
if (-not $ConfirmedAlwaysReadyZero) {
    throw 'Confirm the inspected Function App has zero always-ready DSR instances before running this rehearsal.'
}
if ($IdleMinutes -lt 20) {
    throw 'Use a genuine idle window of at least 20 minutes between runs.'
}

$results = @()
for ($run = 1; $run -le $Runs; $run++) {
    if ($run -gt 1) {
        Start-Sleep -Seconds ($IdleMinutes * 60)
    }

    $started = [DateTimeOffset]::UtcNow
    node scripts/dsr-drills/live-dsr-queue-drill.mjs
    if ($LASTEXITCODE -ne 0) {
        throw "DSR cold-start run $run failed; restore always-ready capacity immediately."
    }
    $finished = [DateTimeOffset]::UtcNow
    $results += [pscustomobject]@{
        run = $run
        startedAtUtc = $started.UtcDateTime.ToString('o')
        completedAtUtc = $finished.UtcDateTime.ToString('o')
        latencySeconds = [Math]::Round(($finished - $started).TotalSeconds, 3)
        passed = $true
    }
}

[pscustomobject]@{
    generatedAtUtc = [DateTimeOffset]::UtcNow.UtcDateTime.ToString('o')
    runs = $results
    passed = (@($results).Count -eq $Runs)
    secretsIncluded = $false
} | ConvertTo-Json -Depth 4
