[CmdletBinding()]
param(
  [string]$Date = (Get-Date -Format 'yyyy-MM-dd'),
  [string]$ArtifactDirectory = '.artifacts/cloudflare-audit',
  [string]$EvidenceDirectory = 'docs/evidence/cloudflare'
)

$ErrorActionPreference = 'Stop'
Set-PSDebug -Off

function Write-JsonFile([string]$Path, $Value) {
  $Value | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Protect-Identifier([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -lt 8) { return '<redacted>' }
  return "$($Value.Substring(0, 4))...$($Value.Substring($Value.Length - 4))"
}

function Get-Sha256([string]$Value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Get-Classification([string]$Path, [string]$Value) {
  $normalized = $Path.Replace('\', '/')
  if ($normalized -match '^docs/evidence/|^docs/audits/|^docs/archive/') { return 'Historical evidence' }
  if ($normalized -match '^docs/runbooks/|^docs/architecture/|^docs/adr/') { return 'Internal documentation' }
  if ($normalized -match '^infrastructure/|^infra/|^database/') { return 'Azure infrastructure configuration' }
  if ($normalized -match '^\.github/workflows/') { return 'CI/CD configuration' }
  if ($normalized -match '^cloudflare/|^workers/|^edge/') { return 'Cloudflare configuration' }
  if ($normalized -match '^api/openapi/') { return 'OpenAPI server declaration' }
  if ($normalized -match '^lib/generated/') { return 'Generated artifact' }
  if ($normalized -match '(?:^|/)(?:test|tests|__tests__|fixtures?)(?:/|\.|$)') { return 'Test fixture' }
  if ($normalized -match '^apps/marketing-site/|^web/') { return 'Marketing canonical URL' }
  if ($normalized -match '^apps/control-panel/') { return 'Runtime production configuration' }
  if ($normalized -match '^lib/core/config/|^lib/features/auth/|^lib/services/') { return 'Runtime production configuration' }
  if ($normalized -match '^functions/src/admin/|cors') { return 'CORS configuration' }
  if ($normalized -match '^scripts/') { return 'Local-development configuration' }
  if ($normalized -match '^docs/') { return 'Public documentation' }
  if ($Value -match 'azurewebsites\.net') { return 'Azure infrastructure configuration' }
  return 'Unsafe public Asora reference'
}

function Get-IntendedValue([string]$Value, [string]$Classification, [string]$Path) {
  if ($Classification -in @('Historical evidence', 'Azure infrastructure configuration')) { return 'Retain internal or historical value' }
  if ($Value -match 'admin-api\.asora\.co\.za') { return 'admin-api.lythaus.co' }
  if ($Value -match '(?:control|admin)\.asora\.co\.za') { return 'admin.lythaus.co' }
  if ($Value -match 'lythaus-web\.pages\.dev') { return $(if ($Path -match 'staging|smoke|canary') { 'app.staging.lythaus.co' } else { 'app.lythaus.co' }) }
  if ($Value -match 'lythaus\.asora\.co\.za|(?:www\.)?asora\.co\.za') { return 'lythaus.co or explicit legacy compatibility' }
  if ($Value -match 'api\.asora\.co\.za|azurewebsites\.net') { return $(if ($Path -match 'staging|smoke|canary') { 'api.staging.lythaus.co/api' } else { 'api.lythaus.co/api' }) }
  return 'Review against ADR-005'
}

function New-ReferenceInventory {
  $pattern = '(?i)(?:https?://)?(?:[a-z0-9-]+\.)*(?:asora\.co\.za|lythaus-web\.pages\.dev|[a-z0-9.-]*azurewebsites\.net)'
  $arguments = @(
    '--json', '--hidden', '-n',
    '-g', '!**/.git/**', '-g', '!**/node_modules/**', '-g', '!**/.dart_tool/**',
    '-g', '!**/build/**', '-g', '!**/.artifacts/**',
    '-g', "!$EvidenceDirectory/$Date-domain-reference-inventory.*",
    $pattern, '.'
  )
  $rows = @()
  & rg @arguments | ForEach-Object {
    $event = $_ | ConvertFrom-Json
    if ($event.type -ne 'match') { return }
    $path = $event.data.path.text -replace '^\.\\', '' -replace '^\./', ''
    foreach ($submatch in $event.data.submatches) {
      $value = [string]$submatch.match.text
      $classification = Get-Classification $path $value
      $intended = Get-IntendedValue $value $classification $path
      $action = if ($classification -eq 'Historical evidence') {
        'Retain as dated evidence'
      } elseif ($classification -eq 'Azure infrastructure configuration') {
        'Retain internally; prevent browser exposure'
      } elseif ($path -match 'workers[\\/]feed-cache' -or $path -eq 'cloudflare/worker.ts') {
        'Audit live binding before modifying; explicit NO-GO blocker'
      } else {
        'Replace or document explicit legacy compatibility'
      }
      $rows += [pscustomobject]@{
        file = $path
        line = [int]$event.data.line_number
        current_value = $value
        classification = $classification
        intended_value = $intended
        action = $action
      }
    }
  }

  $rows = @($rows | Sort-Object file, line, current_value)
  $csvPath = Join-Path $EvidenceDirectory "$Date-domain-reference-inventory.csv"
  $mdPath = Join-Path $EvidenceDirectory "$Date-domain-reference-inventory.md"
  $rows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding utf8
  $markdown = @(
    '# Lythaus domain reference inventory'
    ''
    "Generated: $Date"
    ''
    "Total matches: $($rows.Count)"
    ''
    '| File | Line | Current value | Classification | Intended value | Action |'
    '|---|---:|---|---|---|---|'
  )
  foreach ($row in $rows) {
    $cells = @($row.file, $row.line, $row.current_value, $row.classification, $row.intended_value, $row.action) |
      ForEach-Object { ([string]$_).Replace('|', '\|') }
    $markdown += "| $($cells -join ' | ') |"
  }
  $markdown | Set-Content -LiteralPath $mdPath -Encoding utf8
  return $rows
}

New-Item -ItemType Directory -Force -Path $ArtifactDirectory, $EvidenceDirectory | Out-Null
git check-ignore -q (Join-Path $ArtifactDirectory 'probe.json')
if ($LASTEXITCODE -ne 0) { throw "$ArtifactDirectory must be gitignored before audit data is written." }

$inventory = New-ReferenceInventory
$token = $env:CLOUDFLARE_AUDIT_API_TOKEN
$accountId = $env:CLOUDFLARE_ACCOUNT_ID
$result = [ordered]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  token = [ordered]@{ status = 'MISSING'; source = 'CLOUDFLARE_AUDIT_API_TOKEN'; unavailablePermissions = @('ALL') }
  account = [ordered]@{ id = $(if ($accountId) { Protect-Identifier $accountId } else { 'UNKNOWN' }) }
  zones = @()
  pages = @()
  workers = @()
  access = @()
  rulesets = @()
  blockers = @()
  repositoryReferenceCount = $inventory.Count
}

if ([string]::IsNullOrWhiteSpace($token)) {
  $result.blockers += 'CLOUDFLARE_AUDIT_API_TOKEN is missing.'
  Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
  Write-Output 'Cloudflare audit: NO-GO (read-only token missing)'
  exit 2
}

$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
function Invoke-Cloudflare([string]$Path, [string]$RawName) {
  try {
    $response = Invoke-RestMethod -Method Get -Uri "https://api.cloudflare.com/client/v4$Path" -Headers $headers -TimeoutSec 30
    Write-JsonFile (Join-Path $ArtifactDirectory $RawName) $response
    return $response
  } catch {
    $result.token.unavailablePermissions += $Path
    return $null
  }
}

$verify = Invoke-Cloudflare '/user/tokens/verify' 'token-verify.raw.json'
if (-not $verify.success -or $verify.result.status -ne 'active') {
  $result.token.status = 'INVALID'
  $result.blockers += 'Cloudflare audit token verification failed.'
  Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
  exit 3
}
$result.token.status = 'VERIFIED_ACTIVE'
if ([string]::IsNullOrWhiteSpace($accountId)) {
  $result.blockers += 'CLOUDFLARE_ACCOUNT_ID is missing.'
} else {
  $pages = Invoke-Cloudflare "/accounts/$accountId/pages/projects" 'pages-projects.raw.json'
  $scripts = Invoke-Cloudflare "/accounts/$accountId/workers/scripts" 'worker-scripts.raw.json'
  $apps = Invoke-Cloudflare "/accounts/$accountId/access/apps" 'access-apps.raw.json'
  $accountRulesets = Invoke-Cloudflare "/accounts/$accountId/rulesets" 'account-rulesets.raw.json'
  if ($pages) { $result.pages = @($pages.result | ForEach-Object { [ordered]@{ name=$_.name; productionBranch=$_.production_branch; domains=$_.domains; latestDeploymentId=(Protect-Identifier $_.latest_deployment.id) } }) }
  if ($scripts) { $result.workers = @($scripts.result | ForEach-Object { [ordered]@{ name=$_.id; modifiedOn=$_.modified_on } }) }
  if ($apps) { $result.access = @($apps.result | ForEach-Object { [ordered]@{ name=$_.name; domain=$_.domain; type=$_.type; aud=(Protect-Identifier $_.aud); sessionDuration=$_.session_duration } }) }
  if ($accountRulesets) { $result.rulesets += @($accountRulesets.result | ForEach-Object { [ordered]@{ scope='account'; name=$_.name; kind=$_.kind; phase=$_.phase } }) }
}

foreach ($zoneName in @('lythaus.co', 'asora.co.za')) {
  $zoneResponse = Invoke-Cloudflare "/zones?name=$zoneName&status=active" "$zoneName-zone.raw.json"
  if (-not $zoneResponse -or @($zoneResponse.result).Count -ne 1) {
    $result.blockers += "$zoneName zone could not be uniquely audited."
    continue
  }
  $zone = $zoneResponse.result[0]
  $zoneId = $zone.id
  $dns = Invoke-Cloudflare "/zones/$zoneId/dns_records?per_page=50000" "$zoneName-dns.raw.json"
  $settings = Invoke-Cloudflare "/zones/$zoneId/settings" "$zoneName-settings.raw.json"
  $dnssec = Invoke-Cloudflare "/zones/$zoneId/dnssec" "$zoneName-dnssec.raw.json"
  $rules = Invoke-Cloudflare "/zones/$zoneId/rulesets" "$zoneName-rulesets.raw.json"
  $routes = Invoke-Cloudflare "/zones/$zoneId/workers/routes" "$zoneName-worker-routes.raw.json"
  $email = Invoke-Cloudflare "/zones/$zoneId/email/routing" "$zoneName-email-routing.raw.json"
  $sanitizedDns = @()
  if ($dns) {
    $sanitizedDns = @($dns.result | ForEach-Object {
      $content = if ($_.type -eq 'TXT') { "sha256:$(Get-Sha256 ([string]$_.content))" } else { $_.content }
      [ordered]@{ name=$_.name; type=$_.type; proxied=$_.proxied; ttl=$_.ttl; content=$content }
    })
  }
  $result.zones += [ordered]@{
    name=$zoneName; id=(Protect-Identifier $zoneId); status=$zone.status; type=$zone.type;
    paused=$zone.paused; plan=$zone.plan.name; nameservers=$zone.name_servers;
    dnssec=$(if($dnssec){$dnssec.result.status}else{'UNKNOWN'});
    settings=$(if($settings){@($settings.result | ForEach-Object {[ordered]@{id=$_.id;value=$_.value}})}else{@()});
    dns=$sanitizedDns; workerRoutes=$(if($routes){$routes.result}else{@()});
    emailRouting=$(if($email){$email.result.status}else{'UNKNOWN'})
  }
  if ($rules) { $result.rulesets += @($rules.result | ForEach-Object { [ordered]@{ scope=$zoneName; name=$_.name; kind=$_.kind; phase=$_.phase } }) }
}

$result.token.unavailablePermissions = @($result.token.unavailablePermissions | Sort-Object -Unique)
Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
Write-Output "Cloudflare audit complete: $($result.blockers.Count) blocker(s); raw data remains gitignored."
if ($result.blockers.Count -gt 0 -or $result.token.unavailablePermissions.Count -gt 0) { exit 4 }
