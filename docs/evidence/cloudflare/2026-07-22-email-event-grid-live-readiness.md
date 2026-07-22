# Email Event Grid live readiness - 2026-07-22

## Decision

**NO-GO for verification-v2 issuance.** A resource-bound control send was
accepted by the expected Azure Communication Services resource and reached the
terminal `Delivered` state, but the correctly scoped Event Grid subscription
matched zero events. No event reached the Function handler or PostgreSQL.

## Safety state

- Verification-v2 issuance remains disabled.
- Legacy redemption remains available.
- No Event Grid subscription, DNS record, custom domain, Access policy, public
  route, or email DNS record was changed during this diagnosis.
- One minimal ACS diagnostic setting was added to the existing Log Analytics
  workspace. It includes send and delivery-status operational categories only;
  engagement/open/click categories and metric export are disabled.
- No credential, connection string, access key, recipient address, message
  body, provider payload, password, or verification token is recorded here.

## Live ACS client

| Item | Sanitized result |
| --- | --- |
| App setting | `ACS_EMAIL_ENDPOINT` |
| Authentication | `DefaultAzureCredential` / Function managed identity |
| Endpoint hostname | `lythaus-mvp-communication.europe.communication.azure.com` |
| Resource ID | `/subscriptions/99df7ef7-776a-4235-84a4-c77899b2bb04/resourceGroups/asora-psql-flex/providers/Microsoft.Communication/CommunicationServices/lythaus-mvp-communication` |
| Expected resource match | Yes |
| Endpoint Key Vault reference | Not applicable; the endpoint is non-secret configuration |
| Function identity authorization | `Communication and Email Service Owner` scoped to the expected Communication Service |
| Sender | `no-reply@mail.lythaus.co` |

The live client is constructed from the endpoint plus managed identity. It
does not use an ACS connection string or access key.

## Event Grid subscription

| Item | Live value |
| --- | --- |
| Name | `lythaus-auth-email-delivery-v1` |
| Provisioning state | `Succeeded` |
| Source | `lythaus-mvp-communication` |
| Destination | `asora-function-dev/auth_email_delivery_events` |
| Schema | `EventGridSchema` |
| Included event | `Microsoft.Communication.EmailDeliveryReportReceived` only |
| Subject prefix filter | None |
| Subject suffix filter | None |
| Advanced filters | None |
| Dead letter | None |
| Engagement/open/click events | Not subscribed |

Before the resource-bound send, the subscription was `Succeeded`, the
`auth_email_delivery_events` Function was visible, `ACS_EMAIL_EVENT_SOURCE`
matched the source resource ID, and both direct and gateway health returned
HTTP 200.

## Resource-bound control send

| Evidence | Result |
| --- | --- |
| ACS operation/message ID | `a3b2866c-ed87-44d1-adfe-54aca7f5e4a2` |
| Submission time | `2026-07-22T14:12:16.544Z` |
| ACS send operation | `Succeeded` (accepted for delivery) |
| Terminal operation | `DeliveryStatusUpdate` |
| Terminal status | `Delivered` |
| Terminal timestamp | `2026-07-22T14:12:24.673Z` |
| ACS location | North Europe |
| Sanitized recipient reference | keyed HMAC retained locally; raw recipient omitted |
| Event Grid `MatchedEventCount` | 0 |
| Event Grid `DeliverySuccessCount` | 0 |
| Event Grid delivery failures | 0 |
| Event Grid dropped events | 0 |
| Event Grid dead-lettered events | 0 |
| Function handler invocations | 0 |
| PostgreSQL delivery-event rows | 0 in the completed correlation window |
| Observation window end | `2026-07-22T14:24:12Z` |

The first two historical controlled sends cannot be correlated to operation
IDs retrospectively because ACS operational diagnostics were not enabled when
they occurred. They are not used as the decisive proof. The resource-bound
send above occurred after all subscription and Function preconditions passed.

## Diagnostic setting

- Name: `lythaus-auth-email-diagnostics-v1`
- Destination: existing `law-asora-dsr-dev-neu` Log Analytics workspace
- Enabled categories: `EmailSendMailOperational`,
  `EmailStatusUpdateOperational`
- Disabled categories: user engagement and all unrelated ACS categories
- Metrics export: disabled
- Retention: governed by the existing workspace policy

The terminal row was correlated by opaque operation ID. Provider diagnostic
rows can contain recipient data, so raw query results are not committed.

## Root cause

This satisfies decision-tree branch C:

1. The application used the expected ACS endpoint and resource.
2. The send occurred after the Event Grid subscription and Function handler
   were active.
3. ACS accepted the send and recorded a terminal `Delivered` recipient status.
4. The Event Grid subscription is active, exact, and has no additional filters.
5. Event Grid recorded zero matched events, not a delivery failure.

The failure is therefore upstream of Event Grid delivery and the Function
destination: ACS did not publish, or Event Grid did not ingest/match, the
documented delivery-report event for this source. This is an Azure platform
integration fault, not an application endpoint, Event Grid destination,
subscription-filter, or stale ACS-resource configuration fault.

## Azure support packet

Open an Azure support case for ACS/Event Grid event publication with:

- Subscription: `99df7ef7-776a-4235-84a4-c77899b2bb04`
- Source resource ID: the Communication Service resource ID above
- Event subscription resource ID: source resource ID plus
  `/providers/Microsoft.EventGrid/eventSubscriptions/lythaus-auth-email-delivery-v1`
- Event type: `Microsoft.Communication.EmailDeliveryReportReceived`
- ACS location: North Europe; endpoint data location: Europe
- Control operation ID and UTC timestamps above
- Terminal ACS status: `Delivered`
- Observation: all Event Grid counters remained zero through
  `2026-07-22T14:24:12Z`

Do not create a second subscription or enable issuance as a workaround. Keep
the diagnostic setting active for provider correlation. After Azure confirms
event publication, repeat one resource-bound send and require a matched event,
successful Function invocation, and sanitized PostgreSQL row before enabling
verification-v2 issuance.
