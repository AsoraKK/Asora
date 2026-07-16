# Alpha Support and Incident Response

Kyle is the primary and only human operator. Cohort size, review windows, alerts, kill switches, and read-only mode reduce the unsupported single-operator risk; they do not replace human approval.

## Intake

Use one private support channel and one incident log. Record UTC time, sanitized correlation ID, affected feature, environment, release SHA, severity, workaround, owner, and next review time. Do not copy tokens, raw secrets, invite codes, unredacted exports, or unrelated user records into tickets.

| Severity | Example | Initial response | Control target |
| --- | --- | --- | --- |
| P0 | Credential/privacy incident, auth bypass, destructive data issue | Immediate | Contain with safe flags/read-only mode; no Alpha expansion |
| P1 | DSR stuck, widespread auth/feed outage, tier bypass, moderation safety failure | Within 4 hours | Restore safe degraded service or pause Alpha |
| P2 | Partial feature failure, elevated latency, appeal backlog | Same business day | Mitigate and schedule corrective release |
| P3 | Cosmetic defect or low-impact support question | Within 2 business days | Track for normal triage |

Critical user support must receive an initial response within 24 hours. Median moderation appeal resolution target is below 48 hours.

## Daily review

The scheduled aggregate report covers active-user estimate, new users, invite usage, request/feed/auth reliability, moderation and appeals, label distribution/conflicts, DSR state, infrastructure signals, cohort stage/capacity, deployment SHA, and open attention items. Kyle reviews the report and explicitly decides whether to hold, pause, fix, or prepare a stage review.

## Escalation

Use the machine-readable runbook matching the incident. An operational agent may collect sanitized evidence, correlate alerts, draft tickets, and prepare commands. Deployment, rollback, credential/access changes, data deletion, bulk moderation, threshold/cohort changes, schema changes, and destructive infrastructure actions require Kyle's explicit approval.

## Stage review

At each review date, produce a metrics-and-incidents summary against the exit criteria. Metrics never promote the stage automatically. Stage expansion requires a recorded Kyle decision and an audited configuration update.
