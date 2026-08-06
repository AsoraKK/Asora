import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['apps/lythaus-public-api', 'apps/lythaus-admin-api', 'apps/lythaus-jobs', 'packages'];
const retiredBrand = ['as', 'ora'].join('');
const retiredCloudHost = ['azure', 'websites.net'].join('');
const retiredPackageScope = ['@', 'azure', '/'].join('');
const retiredFunctionsPackage = ['azure', '-functions'].join('');
const retiredJobStorage = ['Azure', 'WebJobs', 'Storage'].join('');
const retiredDocumentClient = ['Cos', 'mos', 'Client'].join('');
const retiredTelemetryPackage = ['application', 'insights'].join('');
const forbidden = [
  new RegExp(retiredCloudHost.replace('.', '\\.'), 'i'),
  new RegExp(retiredPackageScope.replace('/', '\\/'), 'i'),
  new RegExp(retiredFunctionsPackage, 'i'),
  new RegExp(retiredJobStorage, 'i'),
  new RegExp(retiredDocumentClient, 'i'),
  new RegExp(retiredTelemetryPackage, 'i'),
  /keyvault/i,
  new RegExp(`${retiredBrand}-azure-compat`, 'i'),
  new RegExp(`${retiredBrand}\\.co\\.za`, 'i'),
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

for (const candidateRoot of roots) {
  for (const file of walk(path.join(root, candidateRoot))) {
    if (!/\.(?:ts|tsx|js|mjs|json|jsonc)$/.test(file) || /worker-configuration\.d\.ts$|cloudflare-workers\.d\.ts$/.test(file)) continue;
    const contents = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(contents)) failures.push(`${path.relative(root, file)}: forbidden retired-provider dependency ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${roots.length} active runtime roots contain no retired-provider dependencies.`);
}
