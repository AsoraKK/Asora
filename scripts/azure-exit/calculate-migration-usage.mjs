import fs from 'node:fs';

const inputPath = process.argv[process.argv.indexOf('--input') + 1];
if (!inputPath || !fs.existsSync(inputPath)) {
  throw new Error('usage report requires --input <sanitised manifest json>');
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const required = [
  'records',
  'objects',
  'planetScaleTransferBytes',
  'r2ClassAOperations',
  'r2ClassBOperations',
  'currentIncluded',
  'pricing',
];
const missing = required.filter((key) => input[key] === undefined || input[key] === null);
if (missing.length) throw new Error(`usage manifest missing: ${missing.join(', ')}`);

const number = (value, name) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
  return value;
};
const bytesToGiB = (bytes) => bytes / (1024 ** 3);
const records = Object.fromEntries(Object.entries(input.records).map(([key, value]) => [key, number(value, `records.${key}`)]));
const objectCount = number(input.objects.count, 'objects.count');
const objectBytes = number(input.objects.bytes, 'objects.bytes');
const transferBytes = number(input.planetScaleTransferBytes, 'planetScaleTransferBytes');
const classA = number(input.r2ClassAOperations, 'r2ClassAOperations');
const classB = number(input.r2ClassBOperations, 'r2ClassBOperations');
const included = {
  r2StorageBytes: number(input.currentIncluded.r2StorageBytes, 'currentIncluded.r2StorageBytes'),
  r2ClassAOperations: number(input.currentIncluded.r2ClassAOperations, 'currentIncluded.r2ClassAOperations'),
  r2ClassBOperations: number(input.currentIncluded.r2ClassBOperations, 'currentIncluded.r2ClassBOperations'),
  planetScaleTransferBytes: number(input.currentIncluded.planetScaleTransferBytes, 'currentIncluded.planetScaleTransferBytes'),
};
const pricing = {
  r2StorageUsdPerGiBMonth: number(input.pricing.r2StorageUsdPerGiBMonth, 'pricing.r2StorageUsdPerGiBMonth'),
  r2ClassAUsdPerMillion: number(input.pricing.r2ClassAUsdPerMillion, 'pricing.r2ClassAUsdPerMillion'),
  r2ClassBUsdPerMillion: number(input.pricing.r2ClassBUsdPerMillion, 'pricing.r2ClassBUsdPerMillion'),
  planetScaleTransferUsdPerGiB: number(input.pricing.planetScaleTransferUsdPerGiB, 'pricing.planetScaleTransferUsdPerGiB'),
};

const chargeableStorageBytes = Math.max(0, objectBytes - included.r2StorageBytes);
const chargeableClassA = Math.max(0, classA - included.r2ClassAOperations);
const chargeableClassB = Math.max(0, classB - included.r2ClassBOperations);
const chargeableTransferBytes = Math.max(0, transferBytes - included.planetScaleTransferBytes);
const estimate = {
  generatedAt: new Date().toISOString(),
  records,
  objects: { count: objectCount, bytes: objectBytes },
  operations: { r2ClassA: classA, r2ClassB: classB, planetScaleTransferBytes: transferBytes },
  includedUsage: included,
  chargeableUsage: {
    r2StorageBytes: chargeableStorageBytes,
    r2ClassAOperations: chargeableClassA,
    r2ClassBOperations: chargeableClassB,
    planetScaleTransferBytes: chargeableTransferBytes,
  },
  estimatedCostUsd: {
    r2StorageFirstMonth: bytesToGiB(chargeableStorageBytes) * pricing.r2StorageUsdPerGiBMonth,
    r2ClassA: (chargeableClassA / 1_000_000) * pricing.r2ClassAUsdPerMillion,
    r2ClassB: (chargeableClassB / 1_000_000) * pricing.r2ClassBUsdPerMillion,
    planetScaleTransfer: bytesToGiB(chargeableTransferBytes) * pricing.planetScaleTransferUsdPerGiB,
  },
};
estimate.worstCaseIncrementalCostUsd = Object.values(estimate.estimatedCostUsd).reduce((sum, value) => sum + value, 0);
estimate.approvalPhrase = `AUTHORISE MIGRATION USAGE: maximum additional cost US$${estimate.worstCaseIncrementalCostUsd.toFixed(2)}`;
estimate.billingIntervals = { r2StorageFirstMonth: 'monthly', r2Operations: 'usage-based', planetScaleTransfer: 'usage-based' };
console.log(JSON.stringify(estimate, null, 2));
