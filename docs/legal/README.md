# Legal Operations System (Internal)

This directory is the internal legal operations system for Lythaus (formerly Asora).

## Scope

- GDPR + POPIA governance tracking for GA readiness.
- Vendor governance records for Azure, Cloudflare, and Hive.
- Data processing activity register (ROPA baseline).
- Incident assessment log for the 72-hour breach assessment workflow.

## System of Record

- `docs/legal/registers/vendors.csv`: Vendor DPA/SCC/operator-agreement tracker.
- `docs/legal/registers/processing_activities.csv`: Processing activities (ROPA-lite).
- `docs/legal/registers/incident_assessments.csv`: Incident assessment audit trail.
- `docs/legal/public/privacy-policy.md`: Public privacy policy copy.
- `docs/legal/public/terms-of-service.md`: Public terms of service copy.
- `docs/runbooks/legal-operations.md`: Required operational cadence and handoffs.

## Operating Cadence

- Weekly: update incident assessments and active legal holds status.
- Monthly: review vendor and processing registers; update `last_reviewed_utc`.
- Quarterly: legal + privacy review of transfer mechanisms, retention rules, and policy pages.

## Owners

- Primary: Privacy Engineering.
- Secondary: Platform + Product Operations.
- External counsel: Corporate/privacy counsel and tax advisor (outside repo).
