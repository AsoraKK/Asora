# Monitoring Retention Validation

## Retained definitions

- Application Insights: `appi-asora-function-dev-dsr` plus legacy components.
- Log Analytics: `law-asora-dsr-dev-neu`.
- Alerts: five DSR scheduled-query rules covering stuck queued, queue depth, failures, poison queue, and missing completion.
- Dashboard: `dash-lythaus-health`.

## Status

Definitions and resource metadata are recorded. No indiscriminate log export was performed. Historical evidence indicates 30-day Application Insights retention, but live retention settings were not independently re-read for every component.

Required retained evidence includes DSR success/failure summaries, deployment proof, security incidents, authentication failure summaries, performance baselines, alert definitions, action routing, and cost history. PII-minimized evidence must be exported only to approved encrypted storage.
