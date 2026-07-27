import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'infrastructure/cloudflare/native-scope.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const production = process.argv.includes('--production');
const failures = [];

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const productionConfig = (source) => {
  const marker = source.indexOf('"env"');
  return marker === -1 ? source : source.slice(0, marker);
};

for (const relative of manifest.requiredWorkers) {
  const source = read(relative);
  const config = productionConfig(source);
  if (!/"workers_dev"\s*:\s*false/.test(config)) failures.push(`${relative}: workers_dev must be false in production`);
  if (!/"preview_urls"\s*:\s*false/.test(config)) failures.push(`${relative}: preview_urls must be false in production`);
  for (const fragment of manifest.forbiddenHostFragments) {
    if (new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(config)) {
      failures.push(`${relative}: forbidden production host fragment ${fragment}`);
    }
  }
}

const publicConfig = read(manifest.requiredWorkers[0]);
const adminConfig = read(manifest.requiredWorkers[1]);
if (!publicConfig.includes('api.lythaus.co')) failures.push('public API custom domain is missing');
if (!adminConfig.includes('admin-api.lythaus.co')) failures.push('admin API custom domain is missing');

const productionAccount = process.env[manifest.production.accountIdEnv] ?? '';
const productionZone = process.env[manifest.production.zoneIdEnv] ?? '';
const sharedAccount = process.env.CLOUDFLARE_SHARED_ACCOUNT_ID ?? manifest.preproduction.accountId;
if (production) {
  if (!productionAccount) failures.push(`${manifest.production.accountIdEnv} is required for production validation`);
  if (!productionZone) failures.push(`${manifest.production.zoneIdEnv} is required for production validation`);
  if (productionAccount && productionAccount === sharedAccount) failures.push('production account must differ from the shared pre-production account');
  if (process.env.CLOUDFLARE_ENVIRONMENT !== manifest.production.requiredEnvironment) failures.push('CLOUDFLARE_ENVIRONMENT=production is required');
} else if (productionAccount && productionAccount === sharedAccount) {
  failures.push('configured production account matches the shared pre-production account');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated native Cloudflare scope (${production ? 'production' : 'pre-production'}).`);
}
