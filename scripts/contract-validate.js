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
  '/api/auth/token',
  '/api/auth/refresh',
  '/api/users/me',
  '/api/users/{id}',
  '/api/feed/discover',
  '/api/feed/news',
  '/api/posts',
  '/api/posts/{id}',
  '/api/moderation/queue',
  '/api/moderation/cases/{id}',
  '/api/moderation/cases/{id}/decision',
  '/api/appeals',
  '/api/appeals/{id}',
  '/api/appeals/{id}/votes',
  '/api/reputation/me',
  '/api/reputation/events',
  '/api/reputation/history',
  '/api/search',
  '/api/trending/posts',
  '/api/trending/topics',
  '/api/custom-feeds',
  '/api/integrations/feed/discover',
  '/api/auth/onboarding/invite'
];
const missing = requiredPaths.filter(p => !text.includes(` ${p}:`) && !text.includes(`\n${p}:`));
if (missing.length) {
  console.error('Missing paths in OpenAPI:', missing);
  process.exit(2);
}
console.log('OpenAPI contract contains all required P1 paths.');
