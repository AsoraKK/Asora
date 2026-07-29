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

const productionAccount = process.env.CLOUDFLARE_ACCOUNT_ID
  ?? process.env.CLOUDFLARE_PRODUCTION_ACCOUNT_ID
  ?? manifest.production.accountId;
const productionZone = process.env.CLOUDFLARE_ZONE_ID
  ?? process.env.CLOUDFLARE_PRODUCTION_ZONE_ID
  ?? manifest.production.zoneId;
if (production) {
  if (productionAccount !== manifest.production.accountId) failures.push('production account must be the approved shared Cloudflare account');
  if (productionZone !== manifest.production.zoneId) failures.push('production zone must be lythaus.co');
  if (productionAccount && manifest.forbiddenAccountIds?.includes(productionAccount)) failures.push('production account is explicitly forbidden by the scope manifest');
  if (productionZone && manifest.forbiddenZoneIds?.includes(productionZone)) failures.push('production zone is explicitly forbidden by the scope manifest');
  if (process.env.CLOUDFLARE_ENVIRONMENT !== manifest.production.requiredEnvironment) failures.push('CLOUDFLARE_ENVIRONMENT=production is required');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated native Cloudflare scope (${production ? 'production' : 'pre-production'}).`);
}
