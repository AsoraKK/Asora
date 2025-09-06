#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
if (!fs.existsSync(specPath)) {
  console.error('openapi.yaml not found');
  process.exit(1);
}
const text = fs.readFileSync(specPath, 'utf8');
const requiredPaths = [
  '/api/health',
  '/api/auth/userinfo',
  '/api/feed',
  '/api/posts',
  '/api/posts/{postId}',
  '/api/moderation/flag',
  '/api/moderation/appeals',
  '/api/moderation/appeals/{appealId}/vote',
  '/api/user/export',
  '/api/user/delete'
];
const missing = requiredPaths.filter(p => !text.includes(` ${p}:`) && !text.includes(`\n${p}:`));
if (missing.length) {
  console.error('Missing paths in OpenAPI:', missing);
  process.exit(2);
}
console.log('OpenAPI contract contains all required P1 paths.');
