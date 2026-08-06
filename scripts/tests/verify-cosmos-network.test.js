const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const verifierPath = resolve(__dirname, '../../infra/scripts/verify-cosmos-private-endpoint.sh');
const verifier = readFileSync(verifierPath, 'utf8');
const workflowPath = resolve(__dirname, '../../.github/workflows/deploy-lythaus-function-dev.yml');
const jobsConfigPath = resolve(__dirname, '../../apps/lythaus-jobs/wrangler.jsonc');
const jobsConfig = readFileSync(jobsConfigPath, 'utf8');

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

test('legacy Cosmos deployment is frozen while native privacy processing remains bound', () => {
  assert.equal(existsSync(workflowPath), false);
  assert.match(jobsConfig, /"DB_PRIVACY_FRESH"/);
  assert.match(jobsConfig, /"lythaus-privacy-dev"/);
  assert.match(jobsConfig, /"ACCOUNT_DELETE"/);
  assert.match(jobsConfig, /"ACCOUNT_EXPORT"/);
});
