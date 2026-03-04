# Asora Terraform (Root)

This is the main Terraform root for Asora infrastructure.

## Remote State and Locking

- Backend: AzureRM (Storage Account container `tfstate`).

Bootstrap once using `infra/terraform/bootstrap/` to create the tfstate RG, Storage Account, and Container.

## Workspaces (Environments)

- Supported workspaces: `dev`, `stage`, `prod`.

### Initialize per environment
```bash
cd infrastructure

### Plan/Apply examples
```bash
terraform workspace select dev

terraform workspace select stage
terraform plan

terraform workspace select prod
terraform plan

## Tags and Naming

Use `local.env_name` for any environment-dependent names and `local.common_tags` for consistent tagging (`application=Asora`, `env=<env>`).

## Secrets Hygiene

- Do not commit `terraform.tfvars`. Use `terraform.tfvars.example` as a guide.

## CI Policy

CI runs `fmt`, `validate`, `tflint`, and `tfsec` (see `.github/workflows/terraform-ci.yml`), with an optional `plan` step when backend authentication is available.
# Cosmos validation Terraform module

This directory contains a read-only Terraform configuration that validates the
Cosmos DB account targeted by the Asora platform. It downloads no state and
creates no resources; it only resolves the existing account, database, and the
committed indexing policy manifest to enable `terraform plan` sanity checks.

## Usage

```
terraform -chdir=infrastructure init
terraform -chdir=infrastructure plan \
  -var="resource_group=asora-psql-flex" \
  -var="account_name=asora-cosmos-dev" \
  -var="database_name=asora"
```

Authentication uses the standard Azure CLI/Environment credentials. When
running in CI, prefer GitHub OIDC via `azure/login@v2` before invoking the plan.

The plan output surfaces the Cosmos endpoint and lists the containers with
committed indexing policies. To compare live policies to the manifest use
`scripts/compare-cosmos-indexes.sh`.