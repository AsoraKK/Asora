# DSR scale-from-zero and always-ready runbook

## Safety boundary

The DSR queue processor is event-driven. Do not change `privacyDsrProcessor` into a timer or batch. The live shared-MVP allocation `function:privacyDsrProcessor=1` remains required until this entire runbook passes.

## Preconditions

1. Confirm the expected subscription and resource group with `az account show` and `az group show --name asora-psql-flex`.
2. Capture the complete Function App resource into ignored local evidence:

   ```powershell
   New-Item -ItemType Directory -Force .artifacts/azure-cost | Out-Null
   az resource show --resource-group asora-psql-flex --name asora-function-dev --resource-type Microsoft.Web/sites --api-version 2024-04-01 --output json | Out-File .artifacts/azure-cost/function-before.json
   ```

3. Verify the snapshot contains `function:privacyDsrProcessor` with `instanceCount` 1 and identify the active deployment package.
4. Confirm DSR queue, poison queue, PostgreSQL request state, and the canonical Application Insights component are queryable.
5. Confirm the exact backend SHA and a successful deployment rollback artifact.
6. Prepare a minimal ARM patch from the captured resource that changes only `properties.functionAppConfig.scaleAndConcurrency.alwaysReady`. Do not hand-construct or partially replace `functionAppConfig`.

## Candidate validation

This validation requires a separately approved maintenance window. Apply the reviewed candidate patch that sets the always-ready list to empty, then confirm the live resource reflects zero always-ready instances.

Run five independent drills with a genuine idle interval:

```powershell
pwsh scripts/azure/test-dsr-scale-from-zero.ps1 -Runs 5 -IdleMinutes 30 -ConfirmedAlwaysReadyZero | Out-File .artifacts/azure-cost/dsr-cold-start-results.json
```

Each run must prove:

- the queue message is received;
- the request progresses to the expected state;
- no poison message appears;
- processing occurs once;
- no manual intervention is required;
- latency is recorded without PII.

Any failure stops the experiment and triggers rollback.

## Rollback

Rollback uses the exact pre-change `functionAppConfig` captured above. Do not patch only an assumed array shape.

```powershell
$resourceId = az functionapp show --resource-group asora-psql-flex --name asora-function-dev --query id --output tsv
az rest --method patch --url "https://management.azure.com${resourceId}?api-version=2024-04-01" --body '@.artifacts/azure-cost/restore-always-ready.json'
az functionapp show --resource-group asora-psql-flex --name asora-function-dev --query 'functionAppConfig.scaleAndConcurrency.alwaysReady' --output json
```

`restore-always-ready.json` must be generated from the pre-change snapshot and must restore `function:privacyDsrProcessor` to one instance while preserving every other `functionAppConfig` field.

After restoration, run one DSR queue drill and verify no stuck, duplicate, failed, or poison state. Do not declare the allocation removable until rollback has also been exercised successfully.
