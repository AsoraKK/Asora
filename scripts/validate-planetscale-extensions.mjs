import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'database', 'planetscale', 'extensions', 'required-extensions.json');
const migrationDir = path.join(root, 'database', 'planetscale', 'migrations');
const args = process.argv.slice(2);
const catalogFlag = args.indexOf('--catalog');
const catalogPath = catalogFlag >= 0 ? args[catalogFlag + 1] : undefined;
const requireCatalog = args.includes('--require-catalog');

const failures = [];
if (!fs.existsSync(manifestPath)) failures.push(`missing manifest: ${path.relative(root, manifestPath)}`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = manifest.required?.map((entry) => entry.name).filter(Boolean) ?? [];
if (required.length === 0) failures.push('manifest has no required extensions');

const migrationFiles = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort()
  : [];
const migrationText = migrationFiles.map((file) => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n').toLowerCase();
for (const extension of required) {
  if (!migrationText.includes(extension.toLowerCase())) failures.push(`migration contract does not reference: ${extension}`);
}

if (catalogPath) {
  if (!fs.existsSync(catalogPath)) {
    failures.push(`catalog not found: ${catalogPath}`);
  } else {
    const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const entries = Array.isArray(raw) ? raw : raw.extensions;
    if (!Array.isArray(entries)) {
      failures.push('catalog must be an array or an object with an extensions array');
    } else {
      const names = new Set(entries.map((entry) => typeof entry === 'string' ? entry : entry?.name).filter(Boolean).map((name) => String(name).toLowerCase()));
      for (const extension of required) {
        if (!names.has(extension.toLowerCase())) failures.push(`live catalog missing required extension: ${extension}`);
      }
    }
  }
} else if (requireCatalog) {
  failures.push('live extension catalog evidence is required but --catalog was not supplied');
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else if (catalogPath) {
  console.log(`Validated ${required.length} required PlanetScale extensions against live catalog evidence.`);
} else {
  console.log(`Validated ${required.length} required PlanetScale extension references; live catalog not supplied.`);
}
