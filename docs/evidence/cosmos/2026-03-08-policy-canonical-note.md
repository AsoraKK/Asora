# Cosmos Canonical Policy Note

Date: 2026-03-08

## Canonical Declaration

- Canonical Cosmos governance declaration file: `infra/cosmos-container-policy.json`
- CI validator source: `.github/workflows/ci.yml` (`cosmos_contract_guard` job)
- Validator command:

```bash
node scripts/validate-cosmos-contract.js --policy infra/cosmos-container-policy.json
```

## Governance Invariant

Any change to Cosmos containers/partition keys/index mappings must update:

1. `infra/cosmos-container-policy.json`
2. Terraform/container definitions in the active tracks
3. Contract runbook `docs/runbooks/cosmos-container-contract.md`
4. Validator tests when behavior changes (`scripts/tests/validate-cosmos-contract.test.js`)

