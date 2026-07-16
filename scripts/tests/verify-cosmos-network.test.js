const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const verifierPath = resolve(__dirname, '../../infra/scripts/verify-cosmos-private-endpoint.sh');
const verifier = readFileSync(verifierPath, 'utf8');
const workflowPath = resolve(__dirname, '../../.github/workflows/deploy-asora-function-dev.yml');
const workflow = readFileSync(workflowPath, 'utf8');

test('private networking remains the default Cosmos posture', () => {
  assert.match(verifier, /NETWORK_MODE="\$\{3:-private\}"/);
  assert.match(verifier, /privateEndpointConnections \| length\(@\)/);
  assert.match(verifier, /No private endpoint connections detected/);
});

test('cost-constrained mode is explicit and requires TLS 1.2', () => {
  assert.match(verifier, /"\$NETWORK_MODE" == "public-keyvault"/);
  assert.match(verifier, /minimalTlsVersion/);
  assert.match(verifier, /"\$min_tls" != "Tls12"/);
  assert.match(verifier, /Connection-secret Key Vault enforcement is verified by the deployment workflow/);
});

test('unknown Cosmos network modes fail closed', () => {
  assert.match(
    verifier,
    /"\$NETWORK_MODE" != "private" && "\$NETWORK_MODE" != "public-keyvault"/
  );
  assert.match(verifier, /Invalid Cosmos network mode/);
});

test('deployment selects the exception only for the shared MVP environment', () => {
  assert.match(workflow, /COSMOS_NETWORK_MODE="private"/);
  assert.match(
    workflow,
    /if \[\[ "\$TARGET_ENV" == "mvp" \]\]; then/
  );
  assert.match(workflow, /COSMOS_NETWORK_MODE="public-keyvault"/);
});
