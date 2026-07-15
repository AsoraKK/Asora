[CmdletBinding()]
param(
  [string]$Date = (Get-Date -Format 'yyyy-MM-dd'),
  [string]$ArtifactDirectory = '.artifacts/cloudflare-audit',
  [string]$EvidenceDirectory = 'docs/evidence/cloudflare',
  [switch]$RepositoryOnly,
  [switch]$RecheckPreviouslyUnavailable,
  [switch]$RecheckAccountRulesets,
  [string]$SnapshotWorkerName
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

function Protect-CloudflarePath([string]$Path) {
  return [regex]::Replace($Path, '(?i)(?<![a-f0-9])[a-f0-9]{32}(?![a-f0-9])', {
    param($match)
    Protect-Identifier $match.Value
  })
}

function Get-Sha256([string]$Value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha256.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
  } finally {
    $sha256.Dispose()
  }
}

$TargetHostnames = @(
  'lythaus.co',
  'www.lythaus.co',
  'app.lythaus.co',
  'api.lythaus.co',
  'admin.lythaus.co',
  'admin-api.lythaus.co'
)

function Get-TargetHostMatches([object[]]$Values) {
  $serialized = @($Values | ForEach-Object { [string]$_ }) -join "`n"
  $matchedHostnames = @()
  foreach ($hostname in $TargetHostnames) {
    $exactPattern = "(?i)(?<![a-z0-9.-])$([regex]::Escape($hostname))(?![a-z0-9.-])"
    $wildcardPattern = if ($hostname -eq 'lythaus.co') {
      $null
    } else {
      '(?i)\*\.lythaus\.co(?![a-z0-9.-])'
    }
    if ($serialized -match $exactPattern -or ($wildcardPattern -and $serialized -match $wildcardPattern)) {
      $matchedHostnames += $hostname
    }
  }
  return @($matchedHostnames)
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
  if ($Value -match 'lythaus-web\.pages\.dev') { return 'app.lythaus.co or an exact ephemeral Pages preview' }
  if ($Value -match 'lythaus\.asora\.co\.za|(?:www\.)?asora\.co\.za') { return 'lythaus.co or explicit legacy compatibility' }
  if ($Value -match 'api\.asora\.co\.za|azurewebsites\.net') { return 'api.lythaus.co/api or an exact ephemeral Worker preview' }
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

$token = if ($env:CLOUDFLARE_AUDIT_API_TOKEN) {
  $env:CLOUDFLARE_AUDIT_API_TOKEN
} else {
  $env:CLOUDFLARE_API_TOKEN
}
$tokenSource = if ($env:CLOUDFLARE_AUDIT_API_TOKEN) { 'CLOUDFLARE_AUDIT_API_TOKEN' } elseif ($env:CLOUDFLARE_API_TOKEN) { 'CLOUDFLARE_API_TOKEN' } else { 'NONE' }
$accountId = $env:CLOUDFLARE_ACCOUNT_ID
$result = [ordered]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  token = [ordered]@{ status = 'MISSING'; source = $tokenSource; unavailablePermissions = @() }
  account = [ordered]@{ id = $(if ($accountId) { Protect-Identifier $accountId } else { 'UNKNOWN' }) }
  zones = @()
  pages = @()
  workers = @()
  workerSnapshot = $null
  workerDomains = @()
  access = @()
  identityProviders = @()
  serviceTokens = @()
  rulesets = @()
  registrar = @()
  bulkRedirectLists = @()
  accountRuleIntersections = @()
  targetHostnames = $TargetHostnames
  blockers = @()
  repositoryReferenceCount = 0
}

if ($RepositoryOnly) {
  $inventory = New-ReferenceInventory
  Write-Output "Repository domain inventory complete: $($inventory.Count) match(es)."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($token)) {
  $result.blockers += 'CLOUDFLARE_AUDIT_API_TOKEN and CLOUDFLARE_API_TOKEN are missing.'
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
    $statusCode = if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      [int]$_.Exception.Response.StatusCode
    } else {
      0
    }
    $result.token.unavailablePermissions += "$(Protect-CloudflarePath $Path) (HTTP $statusCode)"
    return $null
  }
}

function Invoke-CloudflareContent([string]$Path, [string]$RawName) {
  try {
    $response = Invoke-WebRequest -Method Get -Uri "https://api.cloudflare.com/client/v4$Path" -Headers $headers -TimeoutSec 30
    [IO.File]::WriteAllText((Join-Path $ArtifactDirectory $RawName), [string]$response.Content, [Text.UTF8Encoding]::new($false))
    return [string]$response.Content
  } catch {
    $statusCode = if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      [int]$_.Exception.Response.StatusCode
    } else {
      0
    }
    $result.token.unavailablePermissions += "$(Protect-CloudflarePath $Path) (HTTP $statusCode)"
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

if (-not [string]::IsNullOrWhiteSpace($SnapshotWorkerName)) {
  $result.mode = 'WORKER_SNAPSHOT'
  if ([string]::IsNullOrWhiteSpace($accountId)) {
    $result.blockers += 'CLOUDFLARE_ACCOUNT_ID is required for a Worker snapshot.'
  } else {
    $result.account.id = Protect-Identifier $accountId
    $scriptName = [Uri]::EscapeDataString($SnapshotWorkerName)
    $deployments = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/deployments" "worker-$SnapshotWorkerName-deployments.raw.json"
    $settings = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/settings" "worker-$SnapshotWorkerName-settings.raw.json"
    $secrets = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/secrets" "worker-$SnapshotWorkerName-secrets.raw.json"
    $source = Invoke-CloudflareContent "/accounts/$accountId/workers/scripts/$scriptName/content" "worker-$SnapshotWorkerName-source.raw.js"

    $result.workerSnapshot = [ordered]@{
      name = $SnapshotWorkerName
      deployments = $(if($deployments){@($deployments.result.deployments | ForEach-Object {[ordered]@{id=(Protect-Identifier $_.id);createdOn=$_.created_on;strategy=$_.strategy}})}else{@()})
      bindings = $(if($settings){@($settings.result.bindings | ForEach-Object {[ordered]@{name=$_.name;type=$_.type;namespace=$_.namespace_id;service=$_.service}})}else{@()})
      compatibilityDate = $(if($settings){$settings.result.compatibility_date}else{'UNKNOWN'})
      compatibilityFlags = $(if($settings){@($settings.result.compatibility_flags)}else{@()})
      secretNames = $(if($secrets){@($secrets.result | ForEach-Object {$_.name})}else{@()})
      source = $(if($null -ne $source){[ordered]@{
        bytes = ([Text.Encoding]::UTF8.GetByteCount($source))
        sha256 = (Get-Sha256 $source)
        containsOriginTokenHeader = ($source -match '(?i)x-lythaus-origin-token')
        containsOriginTokenConfiguration = ($source -match '(?i)origin[_-]?(auth|gateway|token)')
        containsClientHeaderStripping = ($source -match '(?i)headers\.delete')
        containsFetch = ($source -match '(?i)\bfetch\s*\(')
        containsAzureHostnameLiteral = ($source -match '(?i)azurewebsites\.net')
      }}else{$null})
    }
  }
  Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
  if ($result.blockers.Count -gt 0 -or $result.token.unavailablePermissions.Count -gt 0) { exit 4 }
  exit 0
}

if ($RecheckAccountRulesets) {
  $result.mode = 'ACCOUNT_RULESETS_RECHECK'
  if ([string]::IsNullOrWhiteSpace($accountId)) {
    $result.blockers += 'CLOUDFLARE_ACCOUNT_ID is required for the account-rulesets recheck.'
  } else {
    $result.account.id = Protect-Identifier $accountId
    $accountRulesets = Invoke-Cloudflare "/accounts/$accountId/rulesets" 'account-rulesets.raw.json'
    if ($accountRulesets) {
      foreach ($ruleset in @($accountRulesets.result)) {
        $detail = Invoke-Cloudflare "/accounts/$accountId/rulesets/$($ruleset.id)" "account-ruleset-$($ruleset.id).raw.json"
        if (-not $detail) { continue }

        $rulesetRules = @($detail.result.rules)
        $enabledRules = @($rulesetRules | Where-Object { $_.enabled -eq $true })
        $result.rulesets += [ordered]@{
          scope='account'; name=$ruleset.name; kind=$ruleset.kind; phase=$ruleset.phase;
          ruleCount=$rulesetRules.Count; enabledRuleCount=$enabledRules.Count;
          actionCounts=@($rulesetRules | Group-Object action | ForEach-Object {[ordered]@{action=$_.Name;count=$_.Count}});
          targetHostMatches=(Get-TargetHostMatches @($rulesetRules | ForEach-Object { $_.expression }));
          enabledTargetHostMatches=(Get-TargetHostMatches @($enabledRules | ForEach-Object { $_.expression }))
        }

        for ($ruleIndex = 0; $ruleIndex -lt $rulesetRules.Count; $ruleIndex++) {
          $rule = $rulesetRules[$ruleIndex]
          $expressionMatches = Get-TargetHostMatches @($rule.expression)
          $actionParameterText = if ($null -ne $rule.action_parameters) {
            $rule.action_parameters | ConvertTo-Json -Depth 20 -Compress
          } else {
            ''
          }
          $targetMatches = Get-TargetHostMatches @($actionParameterText)
          if ($expressionMatches.Count -gt 0 -or $targetMatches.Count -gt 0) {
            $result.accountRuleIntersections += [ordered]@{
              ruleset=$ruleset.name; phase=$ruleset.phase; ruleOrdinal=($ruleIndex + 1);
              enabled=($rule.enabled -eq $true); action=$rule.action;
              expressionHostMatches=$expressionMatches; targetHostMatches=$targetMatches
            }
          }
        }
      }
    }
  }

  $result.token.unavailablePermissions = @($result.token.unavailablePermissions | Sort-Object -Unique)
  if ($result.token.unavailablePermissions.Count -gt 0) {
    $result.blockers += 'One or more account-ruleset detail endpoints remain inaccessible.'
  }
  Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
  Write-Output "Cloudflare account-rulesets recheck complete: $($result.blockers.Count) blocker(s); raw data remains gitignored."
  if ($result.blockers.Count -gt 0 -or $result.token.unavailablePermissions.Count -gt 0) { exit 4 }
  exit 0
}

if ($RecheckPreviouslyUnavailable) {
  $result.mode = 'PREVIOUSLY_UNAVAILABLE_RECHECK'
  $recheckZones = @()

  foreach ($zoneName in @('lythaus.co', 'asora.co.za')) {
    $zoneResponse = Invoke-Cloudflare "/zones?name=$zoneName" "$zoneName-zone.raw.json"
    if (-not $zoneResponse -or @($zoneResponse.result).Count -ne 1) {
      $result.blockers += "$zoneName zone could not be uniquely rechecked."
      continue
    }

    $zone = $zoneResponse.result[0]
    $recheckZones += [pscustomobject]@{ name = $zoneName; id = $zone.id; accountId = $zone.account.id }
    $rules = Invoke-Cloudflare "/zones/$($zone.id)/rulesets" "$zoneName-rulesets.raw.json"
    if (-not $rules) { continue }

    $requiredRulesets = @($rules.result | Where-Object {
      $_.name -eq 'Cloudflare Normalization Ruleset' -or $_.name -eq 'DDoS L7 ruleset'
    })
    if ($requiredRulesets.Count -ne 2) {
      $result.blockers += "$zoneName required normalization or DDoS ruleset could not be identified."
      continue
    }

    foreach ($ruleset in $requiredRulesets) {
      $detail = Invoke-Cloudflare "/zones/$($zone.id)/rulesets/$($ruleset.id)" "$zoneName-ruleset-$($ruleset.id).raw.json"
      if ($detail) {
        $rulesetRules = @($detail.result.rules)
        $enabledRules = @($rulesetRules | Where-Object { $_.enabled -eq $true })
        $result.rulesets += [ordered]@{
          scope = $zoneName
          name = $ruleset.name
          kind = $ruleset.kind
          phase = $ruleset.phase
          ruleCount = $rulesetRules.Count
          enabledRuleCount = $enabledRules.Count
          actionCounts = @($rulesetRules | Group-Object action | ForEach-Object {
            [ordered]@{ action = $_.Name; count = $_.Count }
          })
          targetHostMatches = Get-TargetHostMatches @($rulesetRules | ForEach-Object { $_.expression })
          enabledTargetHostMatches = Get-TargetHostMatches @($enabledRules | ForEach-Object { $_.expression })
        }
      }
    }
  }

  $discoveredAccounts = @($recheckZones | ForEach-Object { [string]$_.accountId } | Select-Object -Unique)
  if ($discoveredAccounts.Count -ne 1) {
    $result.blockers += 'The rechecked zones do not resolve to exactly one Cloudflare account.'
  } else {
    $discoveredAccountId = $discoveredAccounts[0]
    $result.account.id = Protect-Identifier $discoveredAccountId
    if ($accountId -and $accountId -ne $discoveredAccountId) {
      $result.blockers += 'CLOUDFLARE_ACCOUNT_ID does not match the account discovered from both zones.'
    }

    foreach ($zone in $recheckZones) {
      $registration = Invoke-Cloudflare "/accounts/$discoveredAccountId/registrar/domains/$($zone.name)" "$($zone.name)-registrar.raw.json"
      if ($registration) {
        $result.registrar += [ordered]@{
          name = $zone.name
          status = $registration.result.status
          expiresAt = $registration.result.expires_at
          autoRenew = $registration.result.auto_renew
          locked = $registration.result.locked
        }
      }
    }
    $bulkRedirectLists = Invoke-Cloudflare "/accounts/$discoveredAccountId/rules/lists?kind=redirect" 'bulk-redirect-lists.raw.json'
    if ($bulkRedirectLists) {
      $result.bulkRedirectLists = @($bulkRedirectLists.result | ForEach-Object {
        [ordered]@{ name = $_.name; description = $_.description; items = $_.numitems }
      })
    }
  }

  $result.token.unavailablePermissions = @($result.token.unavailablePermissions | Sort-Object -Unique)
  if ($result.token.unavailablePermissions.Count -gt 0) {
    $result.blockers += 'One or more previously unavailable Cloudflare endpoints remain inaccessible.'
  }
  Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
  Write-Output "Cloudflare recheck complete: $($result.blockers.Count) blocker(s); raw data remains gitignored."
  if ($result.blockers.Count -gt 0 -or $result.token.unavailablePermissions.Count -gt 0) { exit 4 }
  exit 0
}

$inventory = New-ReferenceInventory
$result.repositoryReferenceCount = $inventory.Count
$discoveredAccountIds = [System.Collections.Generic.HashSet[string]]::new()

foreach ($zoneName in @('lythaus.co', 'asora.co.za')) {
  $zoneResponse = Invoke-Cloudflare "/zones?name=$zoneName" "$zoneName-zone.raw.json"
  if (-not $zoneResponse -or @($zoneResponse.result).Count -ne 1) {
    $result.blockers += "$zoneName zone could not be uniquely audited."
    continue
  }
  $zone = $zoneResponse.result[0]
  [void]$discoveredAccountIds.Add([string]$zone.account.id)
  $zoneId = $zone.id
  $dns = Invoke-Cloudflare "/zones/$zoneId/dns_records?per_page=50000" "$zoneName-dns.raw.json"
  $settings = Invoke-Cloudflare "/zones/$zoneId/settings" "$zoneName-settings.raw.json"
  $dnssec = Invoke-Cloudflare "/zones/$zoneId/dnssec" "$zoneName-dnssec.raw.json"
  $rules = Invoke-Cloudflare "/zones/$zoneId/rulesets" "$zoneName-rulesets.raw.json"
  $routes = Invoke-Cloudflare "/zones/$zoneId/workers/routes" "$zoneName-worker-routes.raw.json"
  $email = Invoke-Cloudflare "/zones/$zoneId/email/routing" "$zoneName-email-routing.raw.json"
  $certificates = Invoke-Cloudflare "/zones/$zoneId/ssl/certificate_packs?status=all" "$zoneName-certificate-packs.raw.json"
  $pageRules = Invoke-Cloudflare "/zones/$zoneId/pagerules?status=active" "$zoneName-page-rules.raw.json"
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
    dns=$sanitizedDns;
    workerRoutes=$(if($routes){@($routes.result | ForEach-Object {[ordered]@{pattern=$_.pattern;script=$_.script;targetHostMatches=(Get-TargetHostMatches @($_.pattern))}})}else{@()});
    emailRouting=$(if($email){$email.result.status}else{'UNKNOWN'});
    certificatePacks=$(if($certificates){@($certificates.result | ForEach-Object {[ordered]@{type=$_.type;status=$_.status;hosts=$_.hosts;issuer=$_.issuer;validityDays=$_.validity_days}})}else{@()});
    pageRules=$(if($pageRules){@($pageRules.result | ForEach-Object {[ordered]@{status=$_.status;priority=$_.priority;targets=@($_.targets | ForEach-Object {$_.constraint.value});actions=@($_.actions | ForEach-Object {$_.id});targetHostMatches=(Get-TargetHostMatches @($_.targets | ForEach-Object {$_.constraint.value}))}})}else{@()})
  }
  if ($rules) {
    foreach ($ruleset in @($rules.result)) {
      $detail = Invoke-Cloudflare "/zones/$zoneId/rulesets/$($ruleset.id)" "$zoneName-ruleset-$($ruleset.id).raw.json"
      $rulesetRules = if ($detail) { @($detail.result.rules) } else { @() }
      $enabledRules = @($rulesetRules | Where-Object { $_.enabled -eq $true })
      $result.rulesets += [ordered]@{
        scope=$zoneName; name=$ruleset.name; kind=$ruleset.kind; phase=$ruleset.phase;
        ruleCount=$rulesetRules.Count;
        enabledRuleCount=$enabledRules.Count;
        actionCounts=@($rulesetRules | Group-Object action | ForEach-Object {[ordered]@{action=$_.Name;count=$_.Count}})
        targetHostMatches=(Get-TargetHostMatches @($rulesetRules | ForEach-Object { $_.expression }));
        enabledTargetHostMatches=(Get-TargetHostMatches @($enabledRules | ForEach-Object { $_.expression }))
      }
    }
  }
}

if ($discoveredAccountIds.Count -ne 1) {
  $result.blockers += 'The two required zones do not resolve to one unambiguous Cloudflare account.'
} else {
  $discoveredAccountId = @($discoveredAccountIds)[0]
  if ($accountId -and $accountId -ne $discoveredAccountId) {
    $result.blockers += 'CLOUDFLARE_ACCOUNT_ID does not match the account discovered from both zones.'
  } else {
    $accountId = $discoveredAccountId
    $result.account.id = Protect-Identifier $accountId
    $pages = Invoke-Cloudflare "/accounts/$accountId/pages/projects" 'pages-projects.raw.json'
    $scripts = Invoke-Cloudflare "/accounts/$accountId/workers/scripts" 'worker-scripts.raw.json'
    $workerDomains = Invoke-Cloudflare "/accounts/$accountId/workers/domains" 'worker-domains.raw.json'
    $apps = Invoke-Cloudflare "/accounts/$accountId/access/apps" 'access-apps.raw.json'
    $identityProviders = Invoke-Cloudflare "/accounts/$accountId/access/identity_providers" 'access-identity-providers.raw.json'
    $serviceTokens = Invoke-Cloudflare "/accounts/$accountId/access/service_tokens" 'access-service-tokens.raw.json'
    $accountRulesets = Invoke-Cloudflare "/accounts/$accountId/rulesets" 'account-rulesets.raw.json'
    $bulkRedirectLists = Invoke-Cloudflare "/accounts/$accountId/rules/lists?kind=redirect" 'bulk-redirect-lists.raw.json'
    foreach ($zone in @($result.zones)) {
      $registration = Invoke-Cloudflare "/accounts/$accountId/registrar/domains/$($zone.name)" "$($zone.name)-registrar.raw.json"
      if ($registration) {
        $result.registrar += [ordered]@{name=$zone.name;status=$registration.result.status;expiresAt=$registration.result.expires_at;autoRenew=$registration.result.auto_renew;locked=$registration.result.locked}
      }
    }
    if ($pages) {
      foreach ($project in @($pages.result)) {
        $projectName = [Uri]::EscapeDataString([string]$project.name)
        $deployments = Invoke-Cloudflare "/accounts/$accountId/pages/projects/$projectName/deployments?per_page=25" "pages-$($project.name)-deployments.raw.json"
        $envNames = @()
        foreach ($configName in @('production', 'preview')) {
          $config = $project.deployment_configs.$configName
          if ($config -and $config.env_vars) { $envNames += @($config.env_vars.PSObject.Properties.Name) }
        }
        $result.pages += [ordered]@{
          name=$project.name; productionBranch=$project.production_branch; domains=$project.domains;
          targetHostMatches=(Get-TargetHostMatches @($project.domains));
          sourceRepository=$project.source.config.repo_name; sourceOwner=$project.source.config.owner;
          buildCommand=$project.build_config.build_command; outputDirectory=$project.build_config.destination_dir;
          environmentVariableNames=@($envNames | Sort-Object -Unique);
          latestDeploymentId=(Protect-Identifier $project.latest_deployment.id);
          deployments=$(if($deployments){@($deployments.result | ForEach-Object {[ordered]@{id=(Protect-Identifier $_.id);environment=$_.environment;url=$_.url;createdOn=$_.created_on;status=$_.latest_stage.status;commitHash=$_.deployment_trigger.metadata.commit_hash}})}else{@()})
        }
      }
    }
    if ($scripts) {
      foreach ($script in @($scripts.result)) {
        $scriptName = [Uri]::EscapeDataString([string]$script.id)
        $deployments = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/deployments" "worker-$($script.id)-deployments.raw.json"
        $settings = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/settings" "worker-$($script.id)-settings.raw.json"
        $secrets = Invoke-Cloudflare "/accounts/$accountId/workers/scripts/$scriptName/secrets" "worker-$($script.id)-secrets.raw.json"
        $result.workers += [ordered]@{
          name=$script.id; modifiedOn=$script.modified_on; compatibilityDate=$script.compatibility_date;
          deployments=$(if($deployments){@($deployments.result.deployments | ForEach-Object {[ordered]@{id=(Protect-Identifier $_.id);createdOn=$_.created_on;strategy=$_.strategy}})}else{@()});
          bindings=$(if($settings){@($settings.result.bindings | ForEach-Object {[ordered]@{name=$_.name;type=$_.type;namespace=$_.namespace_id;service=$_.service}})}else{@()});
          secretNames=$(if($secrets){@($secrets.result | ForEach-Object {$_.name})}else{@()})
        }
      }
    }
    if ($workerDomains) { $result.workerDomains = @($workerDomains.result | ForEach-Object {[ordered]@{hostname=$_.hostname;service=$_.service;zone=(Protect-Identifier $_.zone_id);targetHostMatches=(Get-TargetHostMatches @($_.hostname))}}) }
    if ($apps) {
      foreach ($app in @($apps.result)) {
        $policies = Invoke-Cloudflare "/accounts/$accountId/access/apps/$($app.id)/policies" "access-$($app.id)-policies.raw.json"
        $result.access += [ordered]@{
          name=$app.name; domain=$app.domain; type=$app.type; aud=(Protect-Identifier $app.aud); sessionDuration=$app.session_duration; targetHostMatches=(Get-TargetHostMatches @($app.domain));
          policies=$(if($policies){@($policies.result | ForEach-Object {[ordered]@{name=$_.name;decision=$_.decision;precedence=$_.precedence;includeTypes=@($_.include | ForEach-Object {$_.PSObject.Properties.Name});excludeTypes=@($_.exclude | ForEach-Object {$_.PSObject.Properties.Name});requireTypes=@($_.require | ForEach-Object {$_.PSObject.Properties.Name})}})}else{@()})
        }
      }
    }
    if ($identityProviders) { $result.identityProviders = @($identityProviders.result | ForEach-Object {[ordered]@{name=$_.name;type=$_.type}}) }
    if ($serviceTokens) { $result.serviceTokens = @($serviceTokens.result | ForEach-Object {[ordered]@{name=$_.name;duration=$_.duration;expiresAt=$_.expires_at}}) }
    if ($bulkRedirectLists) { $result.bulkRedirectLists = @($bulkRedirectLists.result | ForEach-Object {[ordered]@{name=$_.name;description=$_.description;items=$_.numitems}}) }
    if ($accountRulesets) {
      foreach ($ruleset in @($accountRulesets.result)) {
        $detail = Invoke-Cloudflare "/accounts/$accountId/rulesets/$($ruleset.id)" "account-ruleset-$($ruleset.id).raw.json"
        $rulesetRules = if ($detail) { @($detail.result.rules) } else { @() }
        $enabledRules = @($rulesetRules | Where-Object { $_.enabled -eq $true })
        $result.rulesets += [ordered]@{
          scope='account'; name=$ruleset.name; kind=$ruleset.kind; phase=$ruleset.phase;
          ruleCount=$rulesetRules.Count; enabledRuleCount=$enabledRules.Count;
          actionCounts=@($rulesetRules | Group-Object action | ForEach-Object {[ordered]@{action=$_.Name;count=$_.Count}});
          targetHostMatches=(Get-TargetHostMatches @($rulesetRules | ForEach-Object { $_.expression }));
          enabledTargetHostMatches=(Get-TargetHostMatches @($enabledRules | ForEach-Object { $_.expression }))
        }
      }
    }
  }
}

$result.token.unavailablePermissions = @($result.token.unavailablePermissions | Sort-Object -Unique)
if ($result.token.unavailablePermissions.Count -gt 0) {
  $result.blockers += 'Cloudflare endpoints required for a complete audit were unavailable to the audit token.'
}
Write-JsonFile (Join-Path $ArtifactDirectory 'sanitized-cloudflare-audit.json') $result
Write-Output "Cloudflare audit complete: $($result.blockers.Count) blocker(s); raw data remains gitignored."
if ($result.blockers.Count -gt 0 -or $result.token.unavailablePermissions.Count -gt 0) { exit 4 }
