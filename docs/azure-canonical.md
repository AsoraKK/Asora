# Azure canonical values for Asora (source of truth)

Use these exact values in CI, infra, and local development.

**Subscription**: 99df7ef7-776a-4235-84a4-c77899b2bb04  
**TenantId**: 275643fa-37e0-4f67-b616-85a7da674bea  
**PrincipalId** (github-actions-asora-deployer): fb9a0072-3c59-4560-b425-1915016fb786  

**Location**: northeurope

## Development Environment
- **Resource Group**: `asora-psql-flex`
- **Function App**: `asora-function-dev`
- **Runtime**: Node.js 20.x, Functions v4

## Local .env sample (root of repo):
```
AZURE_ENV_NAME="asora-dev"
AZURE_LOCATION="northeurope"
AZURE_SUBSCRIPTION_ID="99df7ef7-776a-4235-84a4-c77899b2bb04"
```

## Notes
- All deployment targets the single dev environment
- Do not change canonical values without updating GitHub secrets
- CI/CD automatically deploys to `asora-function-dev` on push to main/develop
