# Key Vault References (Live)

This report records the live Key Vault reference setup for Lythaus (formerly Asora)
function apps. It is intentionally concise and points to the operational script
that holds the current mapping.

## Source of truth

- Script: `update-keyvault-refs.sh`
- Function app: `asora-function-dev`
- Resource group: `asora-psql-flex`
- Target vault: `kv-asora-flex-dev`

## Verification

Run the script in `update-keyvault-refs.sh`, then verify current references:

```bash
az functionapp config appsettings list -g 'asora-psql-flex' -n 'asora-function-dev' \
  --query "[?contains(value, 'KeyVault')]" -o table
```

## Notes

- This document exists to keep the relocation pointer valid.
- Update this file if the script changes or a new environment becomes the source of truth.
