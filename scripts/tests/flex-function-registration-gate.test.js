const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const workflow = readFileSync(
  resolve(__dirname, '../../.github/workflows/deploy-asora-function-dev.yml'),
  'utf8',
);

test('Flex registration checks use Azure inventory instead of a gateway admin route', () => {
  assert.match(workflow, /az functionapp function list -g "\$RG" -n "\$FUNC_APP"/);
  assert.match(workflow, /for expected in health privacyDsrProcessor privacyDsrQueueMonitor/);
  assert.doesNotMatch(workflow, /\$BASE\/admin\/functions/);
});

test('Flex acceptance preserves public, provenance, host, startup, and DSR gates', () => {
  assert.match(workflow, /\$BASE\/feed\/discover\?limit=1/);
  assert.match(workflow, /name=='DEPLOYMENT_SHA'/);
  assert.match(workflow, /https:\/\/\$\{FUNC_APP\}\.azurewebsites\.net\/admin\/host\/status/);
  assert.match(workflow, /Startup exception telemetry detected in the last 30 minutes/);
  assert.match(workflow, /name: Run live DSR queue regression/);
});
