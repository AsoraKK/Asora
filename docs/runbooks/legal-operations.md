# Legal Operations Runbook

Version: 1.0  
Last Updated: 2026-02-05  
Owners: Privacy Engineering + Platform

## 1. Purpose

Operationalize internal legal/compliance governance for Lythaus (formerly Asora) with auditable records in-repo.

## 2. Required Records

- Vendor agreements register: `docs/legal/registers/vendors.csv`
- Processing activities register: `docs/legal/registers/processing_activities.csv`
- Incident assessment log: `docs/legal/registers/incident_assessments.csv`

## 3. Operational Cadence

- Weekly
- Review new incidents and update `incident_assessments.csv`.
- Confirm any active legal holds and DSR exceptions are reflected in incident notes.

- Monthly
- Update `last_reviewed_utc` for all active rows in vendor and processing registers.
- Confirm no row stays in `status=open` without an owner or follow-up note.

- Quarterly
- Review DPA/SCC/operator-agreement statuses with external counsel.
- Reconcile retention rules against ADR-002 and `docs/runbooks/dsr.md`.
- Confirm public policy URLs still resolve and match current behavior.

## 4. Incident Workflow (72-hour assessment)

1. Add incident row within 24 hours of detection.
2. Set `assessment_due_utc` to detection + 72h.
3. Complete risk assessment and mark `assessment_completed_utc`.
4. Set `notifiable=yes|no` and capture rationale in `notes`.
5. If notifiable, escalate to legal counsel and privacy owner immediately.

## 5. Vendor Governance Workflow

1. Add/update vendor row when a new processor is introduced.
2. Set `dpa_status`, `scc_or_idta_status`, and `operator_agreement_status`.
3. Add contract reference and effective date in `notes`.
4. Mark `status=closed` only when all required agreements are in place and reviewed.

## 6. Validation

Run:

```bash
bash scripts/check_legal_registers.sh
```

This check validates required files and CSV headers. It is safe to run in CI.
