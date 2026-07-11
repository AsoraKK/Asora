const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const workflowPath = resolve(__dirname, '../../.github/workflows/deploy-asora-function-dev.yml');
const workflow = readFileSync(workflowPath, 'utf8');

test('release manifest derives a non-empty Flex hostname', () => {
  assert.match(workflow, /DEPLOYED_HOST="\$\{FUNC_APP\}\.azurewebsites\.net"/);
  assert.match(workflow, /Unable to derive a valid deployed Function hostname/);
  assert.match(workflow, /--arg deployedHost "\$DEPLOYED_HOST"/);
});

test('release manifest records the actual shared-cost Cosmos posture', () => {
  assert.match(workflow, /cosmosNetworkPosture: "passed"/);
  assert.doesNotMatch(workflow, /cosmosPrivateNetworking: "passed"/);
});
