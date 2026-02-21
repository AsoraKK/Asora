#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolveFiles(rootDir, paths) {
  return paths.map((entry) => path.resolve(rootDir, entry));
}

function getBlock(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let end = -1;
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error(`Unterminated block starting at index ${startIndex}`);
  }

  return { body: text.slice(startIndex + 1, end), end };
}

function parseContainerObjects(listBody) {
  const objects = [];
  for (let i = 0; i < listBody.length; i += 1) {
    if (listBody[i] !== '{') {
      continue;
    }
    const { body, end } = getBlock(listBody, i, '{', '}');
    const name = /\bname\s*=\s*"([^"]+)"/.exec(body)?.[1];
    const partitionKey = /\bpartition_key\s*=\s*"([^"]+)"/.exec(body)?.[1];
    if (name && partitionKey) {
      objects.push({ name, partitionKey });
    }
    i = end;
  }
  return objects;
}

function parseEnvContainersFromText(content) {
  const markerMatch = /containers\s*=\s*\[/.exec(content);
  if (!markerMatch || markerMatch.index === undefined) {
    return [];
  }
  const listStart = content.indexOf('[', markerMatch.index);
  if (listStart < 0) {
    return [];
  }
  const { body } = getBlock(content, listStart, '[', ']');
  return parseContainerObjects(body);
}

function parseLegacyContainersFromText(content) {
  const containers = [];
  const resourceToken = 'resource "azurerm_cosmosdb_sql_container"';
  let cursor = 0;

  while (cursor < content.length) {
    const resourceStart = content.indexOf(resourceToken, cursor);
    if (resourceStart < 0) {
      break;
    }
    const openBrace = content.indexOf('{', resourceStart);
    if (openBrace < 0) {
      break;
    }

    const { body, end } = getBlock(content, openBrace, '{', '}');
    const name = /\bname\s*=\s*"([^"]+)"/.exec(body)?.[1];
    const partitionKey = /\bpartition_key_paths\s*=\s*\[\s*"([^"]+)"\s*\]/.exec(body)?.[1];
    if (name && partitionKey) {
      containers.push({ name, partitionKey });
    }

    cursor = end + 1;
  }

  return containers;
}

function toContainerMap(entries) {
  const result = new Map();
  for (const entry of entries) {
    result.set(entry.name, {
      name: entry.name,
      partitionKey: entry.partitionKey,
      file: entry.file,
    });
  }
  return result;
}

function collectEnvContainers(rootDir, files) {
  const rows = [];
  for (const file of resolveFiles(rootDir, files)) {
    const content = readText(file);
    const parsed = parseEnvContainersFromText(content);
    for (const item of parsed) {
      rows.push({
        ...item,
        file: path.relative(rootDir, file),
      });
    }
  }
  return toContainerMap(rows);
}

function collectLegacyContainers(rootDir, files) {
  const rows = [];
  for (const file of resolveFiles(rootDir, files)) {
    const content = readText(file);
    const parsed = parseLegacyContainersFromText(content);
    for (const item of parsed) {
      rows.push({
        ...item,
        file: path.relative(rootDir, file),
      });
    }
  }
  return toContainerMap(rows);
}

function evaluateContract(input) {
  const {
    envContainers,
    legacyContainers,
    overlapAllowlist = {},
    requiredRuntimeContainers = [],
  } = input;

  const envNames = Array.from(envContainers.keys());
  const legacyNames = Array.from(legacyContainers.keys());
  const overlapNames = envNames.filter((name) => legacyContainers.has(name)).sort();

  const unmappedOverlaps = [];
  const mappingMismatches = [];
  const staleAllowlistEntries = [];
  const overlapRows = [];

  for (const name of overlapNames) {
    const env = envContainers.get(name);
    const legacy = legacyContainers.get(name);
    const mapping = overlapAllowlist[name];

    if (!mapping) {
      unmappedOverlaps.push({
        name,
        envPartitionKey: env.partitionKey,
        legacyPartitionKey: legacy.partitionKey,
      });
      overlapRows.push({
        name,
        envPartitionKey: env.partitionKey,
        legacyPartitionKey: legacy.partitionKey,
        mapping: 'missing',
      });
      continue;
    }

    const expectedEnvPartition = mapping.envPartitionKey;
    const expectedLegacyPartition = mapping.legacyPartitionKey;

    if (expectedEnvPartition && expectedEnvPartition !== env.partitionKey) {
      mappingMismatches.push({
        name,
        side: 'env',
        expected: expectedEnvPartition,
        actual: env.partitionKey,
      });
    }
    if (expectedLegacyPartition && expectedLegacyPartition !== legacy.partitionKey) {
      mappingMismatches.push({
        name,
        side: 'legacy',
        expected: expectedLegacyPartition,
        actual: legacy.partitionKey,
      });
    }

    overlapRows.push({
      name,
      envPartitionKey: env.partitionKey,
      legacyPartitionKey: legacy.partitionKey,
      mapping: 'mapped',
    });
  }

  for (const name of Object.keys(overlapAllowlist)) {
    if (!overlapNames.includes(name)) {
      staleAllowlistEntries.push(name);
    }
  }

  const missingRuntimeContainers = requiredRuntimeContainers
    .filter((name) => !envContainers.has(name))
    .sort();

  const hasFailures =
    unmappedOverlaps.length > 0 ||
    mappingMismatches.length > 0 ||
    missingRuntimeContainers.length > 0;

  return {
    envCount: envNames.length,
    legacyCount: legacyNames.length,
    overlapCount: overlapNames.length,
    overlapRows,
    unmappedOverlaps,
    mappingMismatches,
    staleAllowlistEntries,
    missingRuntimeContainers,
    hasFailures,
  };
}

function loadPolicy(policyPath) {
  const content = readText(policyPath);
  return JSON.parse(content);
}

function evaluateFromPolicy(policyPath, rootDir = process.cwd()) {
  const policy = loadPolicy(policyPath);
  const envContainers = collectEnvContainers(rootDir, policy.envStackFiles || []);
  const legacyContainers = collectLegacyContainers(rootDir, policy.legacyFiles || []);
  const evaluation = evaluateContract({
    envContainers,
    legacyContainers,
    overlapAllowlist: policy.overlapAllowlist || {},
    requiredRuntimeContainers: policy.requiredRuntimeContainers || [],
  });

  return {
    policy,
    evaluation,
    envContainers,
    legacyContainers,
  };
}

function printEvaluation(evaluation) {
  console.log('[cosmos-contract] container comparison summary');
  console.log(`[cosmos-contract] env containers: ${evaluation.envCount}`);
  console.log(`[cosmos-contract] legacy containers: ${evaluation.legacyCount}`);
  console.log(`[cosmos-contract] overlaps: ${evaluation.overlapCount}`);

  if (evaluation.overlapRows.length > 0) {
    console.log('[cosmos-contract] overlap diff (name env_pk legacy_pk mapping):');
    for (const row of evaluation.overlapRows) {
      console.log(
        `  - ${row.name}: env=${row.envPartitionKey} legacy=${row.legacyPartitionKey} mapping=${row.mapping}`
      );
    }
  }

  if (evaluation.unmappedOverlaps.length > 0) {
    console.error('[cosmos-contract] FAIL: unmapped overlapping containers');
    for (const item of evaluation.unmappedOverlaps) {
      console.error(
        `  - ${item.name}: env=${item.envPartitionKey} legacy=${item.legacyPartitionKey}`
      );
    }
  }

  if (evaluation.mappingMismatches.length > 0) {
    console.error('[cosmos-contract] FAIL: mapping partition key mismatch');
    for (const item of evaluation.mappingMismatches) {
      console.error(
        `  - ${item.name} (${item.side}): expected=${item.expected} actual=${item.actual}`
      );
    }
  }

  if (evaluation.missingRuntimeContainers.length > 0) {
    console.error('[cosmos-contract] FAIL: missing required runtime containers in canonical env track');
    for (const name of evaluation.missingRuntimeContainers) {
      console.error(`  - ${name}`);
    }
  }

  if (evaluation.staleAllowlistEntries.length > 0) {
    console.warn('[cosmos-contract] WARN: stale allowlist entries (no current overlap)');
    for (const name of evaluation.staleAllowlistEntries) {
      console.warn(`  - ${name}`);
    }
  }
}

function parseArgs(argv) {
  const args = { policy: 'infra/cosmos-container-policy.json', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--policy' && i + 1 < argv.length) {
      args.policy = argv[i + 1];
      i += 1;
    } else if (arg === '--json') {
      args.json = true;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = path.resolve(process.cwd(), args.policy);
  if (!fs.existsSync(policyPath)) {
    console.error(`[cosmos-contract] policy file not found: ${args.policy}`);
    process.exit(2);
  }

  const { evaluation } = evaluateFromPolicy(policyPath, process.cwd());
  if (args.json) {
    console.log(JSON.stringify(evaluation, null, 2));
  } else {
    printEvaluation(evaluation);
  }

  if (evaluation.hasFailures) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseEnvContainersFromText,
  parseLegacyContainersFromText,
  evaluateContract,
  evaluateFromPolicy,
};
