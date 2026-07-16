[CmdletBinding()]
param(
  [string]$FlutterBuildDirectory = 'build/web',
  [string]$MarketingBuildDirectory = 'apps/marketing-site/dist'
)

$ErrorActionPreference = 'Stop'
$violations = [System.Collections.Generic.List[string]]::new()
$bannedPublicPattern = '(?i)(asora\.co\.za|lythaus-web\.pages\.dev|api\.asora\.co\.za|admin-api\.asora\.co\.za|[a-z0-9.-]*azurewebsites\.net)'
$allowlist = Get-Content -LiteralPath 'scripts/cloudflare/domain-reference-allowlist.json' -Raw | ConvertFrom-Json
$retiredEnvironmentPattern = '(?i)(?:app|api|admin|admin-api)\.staging\.lythaus\.co|asora-function-(?:staging|prod)'

function Test-PathForPattern([string]$Path, [string]$Pattern, [string]$Label, [bool]$UseAllowlist = $false) {
  if (-not (Test-Path -LiteralPath $Path)) {
    $violations.Add("$Label is missing: $Path")
    return
  }
  $matches = & rg -n --hidden -g '!**/*.map' $Pattern $Path 2>$null
  if ($LASTEXITCODE -eq 0) {
    $remaining = @($matches)
    if ($UseAllowlist) {
      $normalizedPath = $Path.Replace('\', '/')
      $pathEntries = @($allowlist.entries | Where-Object path -eq $normalizedPath)
      $remaining = @($remaining | Where-Object {
        $line = [string]$_
        -not ($pathEntries | Where-Object { $line -match $_.pattern })
      })
    }
    if ($remaining.Count -gt 0) {
      $violations.Add("$Label contains forbidden domain references: $($remaining -join '; ')")
    }
  }
}

Test-PathForPattern $FlutterBuildDirectory $bannedPublicPattern 'Flutter production artifact'
Test-PathForPattern $MarketingBuildDirectory '(?i)(asora\.co\.za|lythaus-web\.pages\.dev|azurewebsites\.net)' 'Marketing production artifact'
Test-PathForPattern 'api/openapi/dist/openapi.json' '(?i)(asora\.co\.za|pages\.dev|azurewebsites\.net)' 'OpenAPI bundle'
Test-PathForPattern 'lib/generated/api_client' '(?i)(asora\.co\.za|pages\.dev|azurewebsites\.net)' 'Generated API client'

$runtimePaths = @(
  'cloudflare/pages-release.sh',
  'lib/core/config/environment_config.dart',
  'lib/features/auth/application/oauth2_service.dart',
  'apps/marketing-site/src',
  'apps/marketing-site/public',
  'apps/control-panel/src'
)
foreach ($path in $runtimePaths) {
  Test-PathForPattern $path $bannedPublicPattern "Public runtime path $path" $true
  Test-PathForPattern $path $retiredEnvironmentPattern "Retired environment reference in $path"
}

Test-PathForPattern 'cloudflare/api-gateway/wrangler.toml' $retiredEnvironmentPattern 'Gateway configuration'
Test-PathForPattern '.github/workflows' $retiredEnvironmentPattern 'Deployment workflows'

$gateway = Get-Content -LiteralPath 'cloudflare/api-gateway/worker.ts' -Raw
if ($gateway -match '(?i)azurewebsites\.net|DEFAULT_ORIGIN|development-origin') {
  $violations.Add('Production gateway contains an origin fallback or Azure hostname.')
}
if ($gateway -notmatch "Cache-Control', 'private, no-store" -or $gateway -notmatch "request\.headers\.has\('authorization'\)") {
  $violations.Add('Gateway protected-cache invariants are missing.')
}

$openApi = Get-Content -LiteralPath 'api/openapi/dist/openapi.json' -Raw | ConvertFrom-Json
$servers = @($openApi.servers.url)
if ($servers.Count -ne 1 -or $servers[0] -ne 'https://api.lythaus.co/api') {
  $violations.Add('OpenAPI must expose only the canonical Lythaus MVP server.')
}

if ($violations.Count -gt 0) {
  $violations | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output 'Domain contract validation passed.'
