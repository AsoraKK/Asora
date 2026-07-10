# Controlled Alpha Rollback Plan

Owner: Kyle
Automation: `.github/workflows/alpha-rollback.yml`
Status: implemented; rehearsal required before Alpha opens

## Preconditions

1. Record incident time, current deployment SHA, affected environment, reason, and current Alpha stage.
2. Prefer a feature kill switch or audited read-only mode when it safely contains the incident.
3. Select a previously successful CI run whose immutable Functions/web artifacts and hashes are retained.
4. Confirm database compatibility. The rollback workflow does not reverse schema or delete data.
5. Obtain Kyle's protected-environment approval. An operational agent may prepare inputs but may not dispatch or approve the rollback.

## Execute

Dispatch `Alpha Rollback` with the exact target SHA, its successful CI run ID, the post-rollback stage, disabled-feature list, and a reason. Enter `ROLLBACK <40-character-sha>` exactly. The workflow reuses the protected exact-artifact deployment path and reruns health, live contracts, cohort preflight, DSR regression, and manifest generation.

## Verify

- Deployment app setting `DEPLOYMENT_SHA` equals the rollback SHA.
- Health/readiness pass without secret or personal-data leakage.
- Strict contracts, browser smoke, cache/CORS checks, and DSR transition evidence pass.
- Alpha stage/cap match Kyle's approved state; no automatic expansion occurs.
- Error rate and feed latency return to the expected range.
- Audit record and rollback evidence artifact are retained for at least 90 days.

## Failure criteria

If rollback validation fails, preserve read-only mode, stop further mutation, collect sanitized diagnostics, and follow the relevant incident runbook. Do not rotate credentials, alter schemas, or disable authentication as an improvised recovery.

## Rehearsal

Before Stage A, deploy a non-current but compatible previously validated artifact to staging, verify it, then restore the intended candidate through the same exact-artifact path. Record both manifests and timing. Until this rehearsal is executed, rollback remains a failed launch gate.
