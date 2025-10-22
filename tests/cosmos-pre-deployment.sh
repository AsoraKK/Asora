#!/usr/bin/env bash
set -euo pipefail

echo "=== Cosmos pre-deployment validation ==="

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for JSON validation." >&2
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is required for module validation." >&2
  exit 1
fi

echo "1. Validating index JSON files..."
bash infra/scripts/validate-cosmos-indexes.sh

echo "2. Checking Terraform formatting..."
terraform -chdir=infra/terraform fmt -check -recursive

echo "3. Validating environment configurations..."
for env in staging prod; do
  terraform -chdir="infra/terraform/envs/${env}" init -backend=false >/dev/null
  terraform -chdir="infra/terraform/envs/${env}" validate
done

echo "✅ Pre-deployment checks passed."
