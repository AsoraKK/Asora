# GitHub-to-Azure disconnection — implementation evidence

Date: 2026-07-30

Starting `origin/main`: `69c26838a09c5535328f266e051e423a74998eb6`

This record contains no credential values, provider subjects, personal data, or Azure data-plane payloads.

## Release provenance policy

- `releaseSha` is the implementation PR merge SHA deployed to production.
- `evidenceSha` is the later evidence-only merge SHA.
- An evidence-only commit does not invalidate runtime provenance when it changes only documentation, sanitised evidence, and gate records.
- Any runtime, workflow, dependency, configuration, infrastructure, or deployment-input change after `releaseSha` requires a new deployment and acceptance cycle.

## Frozen executable paths

The implementation removes the following Azure deployment or operational workflows from `.github/workflows`:

- `alpha-daily-operations-report.yml`
- `alpha-rollback.yml`
- `canary-guard.yml`
- `deploy-asora-function-consumption-y1.yml`
- `deploy-asora-function-dev.yml`
- `deploy-asora-function-mvp.yml`
- `deploy-feed-cache-worker.yml`
- `deploy-functionapp.yml`
- `deploy-functionapp-fixed.yml`
- `infra.yml`
- `promote-mvp.yml`

Terraform CI is retained as static, backend-disabled validation only. Mobile security validation is retained without Azure authentication. Native deployment, cache, canary, and E2E workflows target the existing Cloudflare runtime.

The fail-closed scanner `scripts/validate-github-azure-disconnection.mjs` rejects active Azure login, deployment, management, data-plane, and credential references in executable workflows. Its unit test covers forbidden and permitted static patterns.

## Retained trust objects

The Azure Entra application, service principal, federated credentials, managed identities, RBAC assignments, and three temporary reader assignments are unchanged. They remain final-cleanup inventory and are not evidence of an active GitHub deployment path.

`GITHUB-TO-AZURE EXECUTION PATHS: DISCONNECTED` becomes production evidence only after this implementation is merged. Repository and environment Azure secret removal remains deferred until the Function App is stopped and post-stop acceptance passes, preserving controlled rollback.

`AZURE TRUST OBJECTS: RETAINED PENDING FINAL CLEANUP`

## Cost and mutation

- New provider resources: none.
- Azure resource mutations: none.
- Cloudflare or PlanetScale mutations in this implementation commit: none.
- Incremental cost: US$0.
