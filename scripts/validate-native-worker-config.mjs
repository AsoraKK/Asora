import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configs = [
  'apps/lythaus-public-api/wrangler.jsonc',
  'apps/lythaus-admin-api/wrangler.jsonc',
  'apps/lythaus-jobs/wrangler.jsonc',
];
const requireProvisioned = process.argv.includes('--require-provisioned');
const failures = [];

for (const relative of configs) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, 'utf8');
  if (!/"workers_dev"\s*:\s*false/.test(source)) failures.push(`${relative}: production workers_dev must be false`);
  if (!/"preview_urls"\s*:\s*false/.test(source)) failures.push(`${relative}: production preview_urls must be false`);
  if (!/"nodejs_compat"/.test(source)) failures.push(`${relative}: nodejs_compat is required`);
  if (/azurewebsites\.net|asora\.co\.za|asora-function/i.test(source)) failures.push(`${relative}: Azure/legacy hostname found in native config`);
  if (!/HYPERDRIVE_QUERY_CACHE_MODE/.test(source) || !/disabled/.test(source)) failures.push(`${relative}: Hyperdrive cache-disabled intent missing`);
  if (requireProvisioned && /REPLACE_WITH_/.test(source)) failures.push(`${relative}: unresolved production resource placeholder`);
}

if (requireProvisioned && !process.env.CLOUDFLARE_PRODUCTION_ACCOUNT_ID) {
  failures.push('CLOUDFLARE_PRODUCTION_ACCOUNT_ID must be set for provisioned validation');
}
if (requireProvisioned && !process.env.CLOUDFLARE_SHARED_ACCOUNT_ID) {
  failures.push('CLOUDFLARE_SHARED_ACCOUNT_ID must be set for account-isolation validation');
}
if (requireProvisioned && process.env.CLOUDFLARE_PRODUCTION_ACCOUNT_ID === process.env.CLOUDFLARE_SHARED_ACCOUNT_ID) {
  failures.push('production account must differ from the shared pre-production account');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${configs.length} native Worker configs${requireProvisioned ? ' with provisioning requirements' : ''}.`);
}
