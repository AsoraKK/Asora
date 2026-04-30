#!/usr/bin/env node
/**
 * check-route-drift.js
 *
 * Compares the live route inventory (route-inventory.json) against the
 * OpenAPI spec (api/openapi/openapi.yaml) and reports:
 *   1. Routes in the inventory with no matching spec path  → "undocumented"
 *   2. Spec paths that match no inventory route            → "stale / phantom"
 *
 * Exit codes:
 *   0 – no drift
 *   1 – drift detected
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const rootDir = path.join(__dirname, '..');
const inventoryPath = path.join(rootDir, 'route-inventory.json');
const specPath = path.join(rootDir, 'api', 'openapi', 'openapi.yaml');

// ---------------------------------------------------------------------------
// Load inventory
// ---------------------------------------------------------------------------
if (!fs.existsSync(inventoryPath)) {
  console.error(`ERROR: route-inventory.json not found at ${inventoryPath}`);
  console.error('Run: node scripts/generate-route-inventory.js');
  process.exit(1);
}
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// ---------------------------------------------------------------------------
// Load spec paths
// ---------------------------------------------------------------------------
if (!fs.existsSync(specPath)) {
  console.error(`ERROR: OpenAPI spec not found at ${specPath}`);
  process.exit(1);
}
const specText = fs.readFileSync(specPath, 'utf8');

// Extract path keys from YAML (lines that look like `  /some/path:`)
// This is intentionally a lightweight regex parse rather than a full YAML
// parse so the script has zero dependencies.
const specPathRegex = /^  (\/[^\s:{}]+(?:\{[^}]+\}[^\s:{}]*)*)\s*:/gm;
const specPaths = new Set();
let m;
while ((m = specPathRegex.exec(specText)) !== null) {
  specPaths.add(m[1]);
}

// ---------------------------------------------------------------------------
// Normalise inventory routes
// Azure Functions route prefix (e.g. "api/") is stripped when the spec uses
// bare paths such as /feed, /_admin/invites etc.
// ---------------------------------------------------------------------------

/**
 * Convert an Azure Functions route string (may or may not start with /)
 * into the canonical spec-style path:  /segment/{param}/...
 */
function normaliseRoute(r) {
  // Ensure leading slash
  if (!r.startsWith('/')) r = `/${r}`;
  // Convert Azure-style {param} (already correct) – nothing to do
  return r;
}

const inventoryRoutes = (inventory.inventory || inventory.routes || inventory)
  .filter(entry => entry && entry.route)
  .map(entry => normaliseRoute(entry.route))
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------
const undocumented = inventoryRoutes.filter(r => !specPaths.has(r));
const phantom = [...specPaths].filter(p => !inventoryRoutes.includes(p));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
let drift = false;

if (undocumented.length) {
  drift = true;
  console.error(`\n⚠  UNDOCUMENTED routes (in inventory, missing from spec) [${undocumented.length}]:`);
  undocumented.forEach(r => console.error(`   ${r}`));
} else {
  console.log('✓  No undocumented routes detected.');
}

if (phantom.length) {
  // Phantom paths are informational (spec may intentionally document future
  // routes) – warn but do not fail the build unless you want strict mode.
  console.warn(`\nℹ  PHANTOM spec paths (in spec, not in inventory) [${phantom.length}]:`);
  phantom.forEach(p => console.warn(`   ${p}`));
}

if (drift) {
  console.error('\nRoute drift detected. Update the OpenAPI spec or route inventory.');
  process.exit(1);
}

console.log('\nRoute / spec alignment check passed.');
