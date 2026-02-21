'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  parseEnvContainersFromText,
  parseLegacyContainersFromText,
  evaluateContract,
  evaluateFromPolicy,
} = require('../validate-cosmos-contract');

const fixturesDir = path.resolve(__dirname, 'fixtures', 'cosmos-contract');

test('parseEnvContainersFromText parses names and partition keys', () => {
  const content = `
    module "cosmos_sql" {
      containers = [
        { name = "users", partition_key = "/id" },
        { name = "posts", partition_key = "/authorId" }
      ]
    }
  `;
  const result = parseEnvContainersFromText(content);
  assert.deepEqual(result, [
    { name: 'users', partitionKey: '/id' },
    { name: 'posts', partitionKey: '/authorId' },
  ]);
});

test('parseLegacyContainersFromText parses legacy container resources', () => {
  const content = `
    resource "azurerm_cosmosdb_sql_container" "users" {
      name = "users"
      partition_key_paths = ["/id"]
    }
  `;
  const result = parseLegacyContainersFromText(content);
  assert.deepEqual(result, [{ name: 'users', partitionKey: '/id' }]);
});

test('evaluateContract fails on unmapped overlaps and missing required containers', () => {
  const envContainers = new Map([
    ['users', { name: 'users', partitionKey: '/id', file: 'env.tf' }],
  ]);
  const legacyContainers = new Map([
    ['users', { name: 'users', partitionKey: '/id', file: 'legacy.tf' }],
  ]);

  const evaluation = evaluateContract({
    envContainers,
    legacyContainers,
    overlapAllowlist: {},
    requiredRuntimeContainers: ['users', 'posts'],
  });

  assert.equal(evaluation.hasFailures, true);
  assert.equal(evaluation.unmappedOverlaps.length, 1);
  assert.deepEqual(evaluation.missingRuntimeContainers, ['posts']);
});

test('evaluateFromPolicy matches expected overlap golden rows', () => {
  const policyPath = path.resolve(fixturesDir, 'sample-policy.json');
  const { evaluation } = evaluateFromPolicy(policyPath, path.resolve(__dirname, '..', '..'));
  const expectedRows = require(path.resolve(fixturesDir, 'expected-overlap-rows.json'));

  assert.equal(evaluation.hasFailures, false);
  assert.deepEqual(evaluation.overlapRows, expectedRows);
  assert.deepEqual(evaluation.unmappedOverlaps, []);
  assert.deepEqual(evaluation.mappingMismatches, []);
  assert.deepEqual(evaluation.missingRuntimeContainers, []);
});
