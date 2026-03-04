import fs from 'node:fs';
import path from 'node:path';
import { sync as globSync } from 'glob';

const specPath = path.resolve('api/openapi/dist/openapi.json');
if (!fs.existsSync(specPath)) {
  console.error(`Spec file not found at ${specPath}`);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const specPaths = new Set<string>(Object.keys(spec.paths || {}).map((p) => normalizePath(p)));

const functionJsons = globSync('functions/**/function.json', {
  nodir: true,
  ignore: ['functions/src/**']
});
const missing: string[] = [];

for (const file of functionJsons) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) {
    continue;
  }
  let definition: any;
  try {
    definition = JSON.parse(raw);
  } catch {
    continue;
  }
  const httpBinding = (definition.bindings || []).find((binding: any) => binding.type === 'httpTrigger');
  if (!httpBinding) {
    continue;
  }
  const route = normalizePath(httpBinding.route ?? '/');
  if (!specPaths.has(route)) {
    missing.push(`${file} -> ${route}`);
  }
}

if (missing.length > 0) {
  console.error('Missing from OpenAPI:');
  for (const entry of missing) {
    console.error(`  ${entry}`);
  }
  process.exit(1);
}

function normalizePath(p: string): string {
  const trimmed = p.startsWith('/') ? p : `/${p}`;
  if (trimmed.length === 1) {
    return trimmed;
  }
  return trimmed.replace(/\/+$/u, '') || '/';
}
