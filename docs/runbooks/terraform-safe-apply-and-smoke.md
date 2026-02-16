# Terraform Safe Apply + Trust Smoke

Last updated: 2026-02-16
Scope: staged Terraform rollout, receipt signing secrets, and post-deploy trust endpoint smoke.

## Safety policy

- Always apply `staging` before `prod`.
- Never apply without reviewing a plan.
- Block applies with destructive changes unless explicitly approved.
- Secrets must be provided via Key Vault references, not plaintext.

## Staging apply sequence

```bash
cd infra/terraform/envs/staging
terraform init
terraform plan -var-file=staging.tfvars -out=tfplan
bash ../../../../scripts/tf-no-destroy-check.sh tfplan
terraform apply tfplan
```

## Production apply sequence

```bash
cd infra/terraform/envs/prod
terraform init
terraform plan -var-file=prod.tfvars -out=tfplan
bash ../../../../scripts/tf-no-destroy-check.sh tfplan
terraform apply tfplan
```

## Key Vault secret checklist (receipt signing)

- `RECEIPT_SIGNING_SECRET` set via Key Vault reference.
- `JWT_SECRET` set via Key Vault reference (fallbacks disabled for prod).
- Confirm app settings contain references (`@Microsoft.KeyVault(...)`) not raw values.

## Post-deploy trust smoke

The CI E2E workflow runs `scripts/smoke-trust-endpoints.sh` after deploy validation.

Manual run:

```bash
BASE_URL="https://<function-host>"
FUNCTION_KEY="<function-key-or-anonymous>"
bash scripts/smoke-trust-endpoints.sh
```

Expected:

- `GET /api/posts/{postId}/receipt` returns `200` with `postId/events/issuedAt/signature/keyId`.
- `GET /api/users/{id}/trust-passport` returns `200` for at least one sampled author.

## Release gate outcome

Mark gate pass only when:

1. Plan safety checks pass.
2. Apply succeeds with no unexpected drift.
3. Key Vault reference checks pass.
4. Trust smoke script passes.
