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