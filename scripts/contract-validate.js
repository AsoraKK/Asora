#!/usr/bin/env node
// Validate that the OpenAPI spec contains all required P1 route contracts.
// Usage: node scripts/contract-validate.js
const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'api', 'openapi', 'openapi.yaml');
if (!fs.existsSync(specPath)) {
  console.error(`ERROR: OpenAPI spec not found at ${specPath}`);
  process.exit(1);
}
const text = fs.readFileSync(specPath, 'utf8');

// These are the core routes that MUST be documented in the spec.
// Keep in sync with route-inventory.json (inventory[].route).
const requiredPaths = [
  '/feed',
  '/health',
  '/post',
  '/moderation/flag',
  '/moderation/appeals',
  '/moderation/appeals/{appealId}/vote',
  '/auth/token',
  '/auth/authorize',
  '/auth/userinfo',
  '/auth/redeem-invite',
  '/user/export',
  '/user/delete',
  '/_admin/invites',
  '/_admin/invites/{code}',
  '/_admin/users/{userId}/disable',
  '/_admin/users/{userId}/enable',
  '/_admin/content/{contentId}/block',
  '/_admin/content/{contentId}/publish',
  '/_admin/dsr/export',
  '/_admin/dsr/delete'
];

const missing = requiredPaths.filter(p => {
  // Match both `  /path:` (indented) and `/path:` at line start
  const escaped = p.replace(/[{}[\].*+?^$|\\]/g, c => `\\${c}`);
  const re = new RegExp(`(^|\\s)${escaped}:`, 'm');
  return !re.test(text);
});

if (missing.length) {
  console.error('\nERROR: The following required paths are MISSING from the OpenAPI spec:');
  missing.forEach(p => console.error(`  ${p}`));
  process.exit(2);
}
console.log(`OK: All ${requiredPaths.length} required paths found in ${path.relative(process.cwd(), specPath)}`);
