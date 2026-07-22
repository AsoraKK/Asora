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

$expectedSourceId = $env:ACS_EMAIL_EVENT_SOURCE
if ($expectedSourceId -and $expectedSourceId.Trim() -ne $sourceId) {
  throw 'ACS_EMAIL_EVENT_SOURCE does not match the resolved Communication Service resource.'
}

$existing = az eventgrid event-subscription list `
  --source-resource-id $sourceId `
  --query "[?name=='$SubscriptionName'] | [0].{provisioningState:provisioningState,endpointType:destination.endpointType,includedEventTypes:filter.includedEventTypes}" `
  --output json
$existingSubscription = $existing | ConvertFrom-Json

if (-not $Apply) {
  Write-Output 'DRY RUN: no Azure resources will be changed.'
  Write-Output "Source resource: $sourceId"
  Write-Output "Function target: $functionId"
  Write-Output "Subscription name: $SubscriptionName"
  Write-Output 'Included event type: Microsoft.Communication.EmailDeliveryReportReceived'
  Write-Output 'Retry policy: Azure default'
  Write-Output 'Dead-letter destination: none'
  Write-Output 'Planned app-setting mutation: ACS_EMAIL_EVENT_SOURCE (exact source resource ID)'
  Write-Output 'Planned Event Grid mutation: create the named subscription only when absent'
  if ($null -ne $existingSubscription) {
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

if ($null -eq $existingSubscription) {
  az eventgrid event-subscription create `
    --source-resource-id $sourceId `
    --name $SubscriptionName `
    --endpoint-type azurefunction `
    --endpoint $functionId `
    --included-event-types Microsoft.Communication.EmailDeliveryReportReceived `
    --output none
} else {
  $eventTypes = @($existingSubscription.includedEventTypes)
  if ($existingSubscription.endpointType -ne 'AzureFunction' -or
      $eventTypes.Count -ne 1 -or
      $eventTypes[0] -ne 'Microsoft.Communication.EmailDeliveryReportReceived') {
    throw 'The existing Event Grid subscription does not match the approved scope.'
  }
}

Write-Output 'Configured the ACS email-delivery Event Grid subscription and expected source setting.'
