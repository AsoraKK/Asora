[CmdletBinding()]
param(
  [string]$SubscriptionId,
  [string]$ResourceGroup = 'asora-psql-flex',
  [string]$CommunicationService = 'lythaus-mvp-communication',
  [string]$FunctionApp = 'asora-function-dev',
  [string]$SubscriptionName = 'lythaus-auth-email-delivery-v1',
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($SubscriptionId) {
  az account set --subscription $SubscriptionId --output none
}

$sourceId = (az resource show `
  --resource-group $ResourceGroup `
  --resource-type 'Microsoft.Communication/communicationServices' `
  --name $CommunicationService `
  --query id --output tsv).Trim()
$functionId = (az functionapp function show `
  --resource-group $ResourceGroup `
  --name $FunctionApp `
  --function-name auth_email_delivery_events `
  --query id --output tsv).Trim()

if (-not $sourceId -or -not $functionId) {
  throw 'The ACS source or auth_email_delivery_events Function could not be resolved.'
}

$existing = az eventgrid event-subscription show `
  --source-resource-id $sourceId `
  --name $SubscriptionName `
  --query '{provisioningState:provisioningState,endpointType:destination.endpointType,includedEventTypes:filter.includedEventTypes}' `
  --output json 2>$null

if (-not $Apply) {
  Write-Output 'DRY RUN: no Azure resources will be changed.'
  Write-Output "Source resource: $sourceId"
  Write-Output "Function target: $functionId"
  Write-Output "Subscription name: $SubscriptionName"
  if ($LASTEXITCODE -eq 0) {
    Write-Output "Existing sanitized subscription: $existing"
  } else {
    Write-Output 'No existing subscription was found.'
  }
  exit 0
}

az functionapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $FunctionApp `
  --settings "ACS_EMAIL_EVENT_SOURCE=$sourceId" `
  --output none

az eventgrid event-subscription create `
  --source-resource-id $sourceId `
  --name $SubscriptionName `
  --endpoint-type azurefunction `
  --endpoint $functionId `
  --included-event-types Microsoft.Communication.EmailDeliveryReportReceived `
  --output none

Write-Output 'Configured the ACS email-delivery Event Grid subscription and expected source setting.'
