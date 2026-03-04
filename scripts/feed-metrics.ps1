param(
  [string]$BaseUrl,
  [int]$Count,
  [string]$AuthToken
)

$ErrorActionPreference = 'Stop'

if (-not $PSBoundParameters.ContainsKey('BaseUrl') -or [string]::IsNullOrEmpty($BaseUrl)) {
  $BaseUrl = 'https://asora-function-dev.azurewebsites.net'
}
if (-not $PSBoundParameters.ContainsKey('Count') -or $Count -le 0) {
  $Count = 20
}
if (-not $PSBoundParameters.ContainsKey('AuthToken')) { $AuthToken = '' }

function Measure-Endpoint {
  param(
    [string]$Path
  )
  $rus = @()
  $durs = @()
  for ($i=0; $i -lt $Count; $i++) {
    $headers = @{}
    if ($AuthToken) { $headers['Authorization'] = "Bearer $AuthToken" }
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $resp = Invoke-WebRequest -Uri ("$BaseUrl$Path") -Headers $headers -Method GET -MaximumRedirection 0 -ErrorAction SilentlyContinue
    $sw.Stop()
    $ru = $resp.Headers['X-Cosmos-RU']
    if (-not $ru) { $ru = 0 }
    $rus += [double]$ru
    $durs += $sw.ElapsedMilliseconds
    Start-Sleep -Milliseconds 200
  }
  $avgRU = if ($rus.Count -gt 0) { [Math]::Round(($rus | Measure-Object -Average).Average, 2) } else { 0 }
  if ($durs.Count -gt 0) {
    $sorted = $durs | Sort-Object
    $idx = [Math]::Max(0, [int]([Math]::Ceiling($sorted.Count * 0.95) - 1))
    $p95Dur = $sorted[$idx]
  } else { $p95Dur = 0 }
  return @{ avgRU = $avgRU; p95ms = $p95Dur; samples = $Count }
}

$report = [ordered]@{}
$report.following = Measure-Endpoint -Path '/api/feed/following?pageSize=20'
$report.local = Measure-Endpoint -Path '/api/feed/local?location=City&pageSize=20'
$report.trending = Measure-Endpoint -Path '/api/trending?pageSize=20'
$report.newCreators = Measure-Endpoint -Path '/api/feed/newCreators?pageSize=20'

$json = ($report | ConvertTo-Json -Depth 5)
Set-Content -Path 'feed-metrics.json' -Value $json -Encoding UTF8
Write-Host $json
