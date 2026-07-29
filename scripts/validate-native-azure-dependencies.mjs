import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDirs = ['apps/lythaus-public-api', 'apps/lythaus-admin-api', 'apps/lythaus-jobs'];
const forbidden = [
  /azurewebsites\.net/i,
  /asora\.co\.za/i,
  /ORIGIN_(?:BASE|GATEWAY|OPERATIONAL)/i,
  /@azure\//i,
  /azure-functions/i,
  /CosmosClient/i,
  /applicationinsights/i,
  /\b(?:AZURE|COSMOS)_[A-Z0-9_]+/i,
];
const failures = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(file);
    return [file];
  });
}

for (const app of appDirs) {
  for (const file of walk(path.join(root, app))) {
    if (!/\.(?:ts|tsx|js|mjs|json|jsonc)$/.test(file) || /worker-configuration\.d\.ts$|cloudflare-workers\.d\.ts$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(text)) failures.push(`${path.relative(root, file)}: forbidden Azure dependency ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${appDirs.length} native Workers contain no Azure runtime dependencies.`);
}
