'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  splitTopLevel,
  parseObjectProperties,
  parseAppHttpCalls,
  buildInventory,
} = require('../validate-functions-route-guards');

const fixturesDir = path.resolve(__dirname, 'fixtures', 'route-guards');

test('splitTopLevel handles nested expressions', () => {
  const input = "handler: requireAdmin(withRateLimit(myHandler, (req) => getPolicy(req))), route: 'x'";
  const result = splitTopLevel(input, ',');
  assert.equal(result.length, 2);
  assert.equal(result[0].startsWith('handler:'), true);
  assert.equal(result[1], "route: 'x'");
});

test('parseObjectProperties parses top-level key value pairs', () => {
  const input = "methods: ['POST'], authLevel: 'anonymous', route: 'posts/{id}/like'";
  const result = parseObjectProperties(input);
  assert.equal(result.methods, "['POST']");
  assert.equal(result.authLevel, "'anonymous'");
  assert.equal(result.route, "'posts/{id}/like'");
});

test('parseAppHttpCalls extracts route registrations', () => {
  const content = `
    app.http('sample', {
      methods: ['POST'],
      authLevel: 'anonymous',
      route: 'sample',
      handler: withRateLimit(handler, (req) => policy(req)),
    });
  `;
  const routes = parseAppHttpCalls(content);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].functionName, 'sample');
  assert.deepEqual(routes[0].methods, ['POST']);
  assert.equal(routes[0].route, 'sample');
});

test('buildInventory returns deterministic guard failures (golden summary)', () => {
  const allowlist = { rateLimitExempt: [], authGuardExempt: [] };
  const { inventory, missingRateLimit, missingAuthGuard } = buildInventory(fixturesDir, allowlist);
  const expected = require(path.resolve(fixturesDir, 'expected-summary.json'));

  assert.equal(inventory.length, expected.totalRoutes);
  assert.equal(inventory.filter((item) => item.isWrite).length, expected.writeRoutes);
  assert.deepEqual(
    missingRateLimit.map((item) => item.functionName),
    expected.missingRateLimitFunctions
  );
  assert.deepEqual(
    missingAuthGuard.map((item) => item.functionName),
    expected.missingAuthFunctions
  );
});
