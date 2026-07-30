import assert from 'node:assert/strict';
import test from 'node:test';
import { scanWorkflowText } from '../validate-github-azure-disconnection.mjs';

test('rejects Azure authentication, deployment, data and credential paths', () => {
  const source = `
steps:
  - uses: azure/login@v3
  - uses: Azure/functions-action@v1
  - run: az keyvault secret show --name example
    env:
      AZURE_CLIENT_ID: \${{ secrets.AZURE_CLIENT_ID }}
`;
  const labels = scanWorkflowText('.github/workflows/example.yml', source).map((finding) => finding.label);
  assert.ok(labels.includes('Azure OIDC login'));
  assert.ok(labels.includes('Azure Functions deployment'));
  assert.ok(labels.includes('Azure data-plane command'));
  assert.ok(labels.includes('Azure deployment credential reference'));
});

test('allows static Terraform validation and negative Azure-host assertions', () => {
  const source = `
steps:
  - run: terraform init -backend=false -input=false
  - run: terraform validate
  - run: node -e "if (host.endsWith('.azurewebsites.net')) throw new Error('forbidden')"
`;
  assert.deepEqual(scanWorkflowText('.github/workflows/static.yml', source), []);
});
