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
  // Azure Functions wildcard params use {*param} syntax; OpenAPI uses {param}.
  // Strip the leading * so the two representations compare equal.
  r = r.replace(/\{\*([^}]+)\}/g, '{$1}');
  return r;
}

/**
 * Structural key for a path: replace every {paramName} with {_} so that
 * /posts/{id}/like and /posts/{postId}/like hash to the same key.
 * This lets us match inventory routes that differ only in parameter name
 * from spec paths (both are valid for the same route structure).
 */
function structuralKey(p) {
  return p.replace(/\{[^}]+\}/g, '{_}');
}

const inventoryRoutes = (inventory.inventory || inventory.routes || inventory)
  .filter(entry => entry && entry.route)
  .map(entry => normaliseRoute(entry.route))
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------
// Build a structural-key set from the spec for param-name-agnostic matching.
// /posts/{id}/like and /posts/{postId}/like are structurally identical —
// both are valid representations of the same route template.
const specStructuralKeys = new Set([...specPaths].map(structuralKey));

// Deduplicate inventory routes before comparison (multiple HTTP methods on
// the same route each have their own inventory entry).
const uniqueInventoryRoutes = [...new Set(inventoryRoutes)];

const undocumented = uniqueInventoryRoutes.filter(
  r => !specPaths.has(r) && !specStructuralKeys.has(structuralKey(r))
);
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
