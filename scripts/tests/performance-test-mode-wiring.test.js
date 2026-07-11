const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

function read(relativePath) {
  return readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');
}

const matrix = read('load/k6/alpha-feed-matrix.js');
const workflow = read('.github/workflows/alpha-feed-performance.yml');
const feedService = read('functions/src/feed/service/feedService.ts');
const customFeedService = read('functions/src/custom-feeds/customFeedsService.ts');
const routeSources = [
  'functions/src/feed/routes/getFeed.ts',
  'functions/src/feed/routes/feed_discover_get.function.ts',
  'functions/src/feed/routes/feed_user_get.function.ts',
  'functions/src/feed/routes/feed_news_get.function.ts',
  'functions/src/custom-feeds/customFeeds_getItems.function.ts',
].map(read).join('\n');

test('performance matrix sends a signed-session-bound test context', () => {
  assert.match(matrix, /ALPHA_TEST_SESSION_ID/);
  assert.match(matrix, /'X-Test-Mode': 'true'/);
  assert.match(matrix, /'X-Test-Session-Id': TEST_SESSION_ID/);
  assert.match(workflow, /ALPHA_TEST_SESSION_ID: \$\{\{ vars\.ALPHA_TEST_SESSION_ID \}\}/);
});

test('performance matrix stays compatible with pinned k6 0.52', () => {
  assert.doesNotMatch(matrix, /\?\./);
  assert.doesNotMatch(matrix, /\?\?/);
  assert.doesNotMatch(matrix, /catch\s*\{/);
});

test('all performance feed surfaces authorize test mode', () => {
  const authorizationCalls = routeSources.match(/extractAuthorizedTestModeContext\(/g) ?? [];
  assert.equal(authorizationCalls.length, 5);
  assert.match(routeSources, /TEST_MODE_NOT_AUTHORIZED/);
});

test('feed queries isolate normal and session test records', () => {
  for (const source of [feedService, customFeedService]) {
    assert.match(source, /NOT IS_DEFINED\(c\.isTestPost\) OR c\.isTestPost = false/);
    assert.match(source, /c\.isTestPost = true AND c\.testSessionId = @testSessionId/);
  }
});
