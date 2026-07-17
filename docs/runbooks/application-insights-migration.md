# Application Insights canonicalization and rollback

## Canonical shared-MVP telemetry

- Application Insights: `appi-asora-function-dev-dsr`
- Log Analytics workspace: `law-asora-dsr-dev-neu`
- Function App: `asora-function-dev`

The canonical component currently receives live traces, requests, exceptions, and DSR monitor data. Other discovered components are retirement candidates only.

## Migration procedure

1. Export sanitized component and workspace metadata to ignored local evidence.
2. Inventory every scheduled query alert, workbook, dashboard, workflow, KQL file, and app setting referencing each component.
3. Confirm the Function App connection-string setting is a Key Vault reference or redacted configured value; never print it.
4. Deploy the telemetry deduplication change and verify:
   - host requests and dependencies still arrive;
   - exceptions and failed requests arrive in full;
   - DSR monitor, poison, stuck, and failure signals remain queryable;
   - auth security, refresh-reuse, deployment, and moderation failures remain queryable;
   - routine successful trace/request volume decreases without gaps in failures.
5. Update alerts only through a separately reviewed infrastructure change after Terraform import/state reconciliation.
6. Observe at least seven days before marking any component obsolete.

## Rollback

1. Restore the previous exact Function deployment package.
2. Restore the previous Application Insights app setting reference only if it changed.
3. Restore the exported scheduled-query alert definitions.
4. Verify trace, failed request, exception, DSR, auth security, moderation, and deployment queries.

Do not delete any component during rollback or during this first migration pass. If ingestion cannot be verified, retain all components and stop the affected migration.
