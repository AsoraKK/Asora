# GitHub Actions Azure Dependencies

Workflows reference `azure/login@v3`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, Function App and resource-group variables, Key Vault names, ARM REST calls, Function deployment, CORS configuration, trigger synchronization, health checks, DSR settings, and Cosmos network verification.

Observed workflow families include `deploy-asora-function-dev.yml`, `deploy-asora-function-mvp.yml`, `promote-mvp.yml`, `alpha-daily-operations-report.yml`, `canary-guard.yml`, CI Azure retirement validation, and supporting Azure scripts.

Required removal/migration sequence: freeze Azure deployment workflows; preserve workflow files as historical evidence; replace OIDC and environment references; migrate health/reporting jobs; then remove secrets and environments only after human approval. No workflow was changed.
