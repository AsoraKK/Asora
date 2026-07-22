# Email Event Grid live readiness — 2026-07-22

## Decision

**NO-GO for verification-v2 issuance.** The exact Function artifact and the
approved Event Grid subscription are live, but two controlled ACS sends
produced two source-side delivery-status updates and zero Event Grid matches.
No delivery event reached the Function handler or PostgreSQL.

## Repository and deployment

- Reconciled base `main`: `625e9ac12f16a8c96feb8fbced7dc204426fb5fd`
- Exact branch head: `20b4b0dc8bcdad71b2e8025e46510beca96ef8b2`
- Exact-head CI: `29906340968` — passed, including Gitleaks
- Function deployment: `29907076304` — deployment job passed
- Live deployment marker: `20b4b0dc8bcdad71b2e8025e46510beca96ef8b2`
- Live Function count: 140
- `auth_email_delivery_events`: present
- Health and DSR Functions: present
- Verification-v2 issuance: disabled

The deployment workflow's required live contracts remain blocked because the
existing smoke identity is not a verified v2 PostgreSQL email account. The
runtime runner was corrected to use `/api/auth/email/login`; the resulting
response is a controlled 401 rather than the previous legacy-route 503.

## Event Grid configuration

- Source: `lythaus-mvp-communication`
- Destination: `asora-function-dev/auth_email_delivery_events`
- Subscription: `lythaus-auth-email-delivery-v1`
- Included event: `Microsoft.Communication.EmailDeliveryReportReceived`
- Provisioning state: `Succeeded`
- Endpoint type: `AzureFunction`
- Retry: 30 attempts, 1440-minute event TTL (Azure default)
- Dead letter: none
- Engagement/open/click events: not subscribed
- Subject and advanced filters: none
- Expected-source app setting: present

The setup script was fixed to make a missing-subscription dry run non-failing,
print the exact mutation plan, verify the expected source, and refuse an
existing subscription whose endpoint type or event filter differs.

## Live delivery proof

Two tracking-free operational validation messages were submitted through the
same ACS endpoint and Entra SDK path used by the application. ACS accepted both
send operations. Sanitized observations after both terminal source updates:

| Evidence | Result |
| --- | --- |
| ACS send acceptance | 2 accepted |
| ACS `DeliveryStatusUpdate` metric | 2 |
| Event Grid `MatchedEventCount` | 0 |
| Event Grid `DeliverySuccessCount` | 0 |
| Event Grid delivery failures/drops | 0 / 0 |
| Function handler executions | 0 |
| Recent PostgreSQL delivery-event rows | 0 |
| Test-mailbox arrival | none observed |

No raw recipient, message body, provider payload, credential, connection
string, password, or token was persisted in this evidence.

## Safety state

- Verification-v2 issuance remains disabled.
- Legacy redemption remains available.
- No public DNS, custom domain, Access policy, or email DNS changed.
- No Event Grid subscription other than the approved delivery subscription was
  created.
- The subscription is retained for diagnosis because its configuration is
  correct and it targets the compatible deployed handler.

## Remaining blocker

Azure Communication Services generated terminal delivery-status metrics, but
the source-scoped Event Grid subscription did not match those events. Resolve
the ACS/Event Grid source integration or provider-side event emission before
enabling preview issuance. After a real event reaches PostgreSQL, repeat the
fresh-account verification lifecycle and authenticated contracts.
