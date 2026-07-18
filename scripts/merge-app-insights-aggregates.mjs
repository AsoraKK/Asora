#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readPayload(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read aggregate telemetry input ${filePath}: ${error.message}`);
  }
}

function rowFromPayload(payload, source) {
  const table = payload?.tables?.[0];
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows) || table.rows.length !== 1) {
    throw new Error(`${source} must contain exactly one aggregate telemetry row.`);
  }

  const row = table.rows[0];
  if (!Array.isArray(row) || row.length !== table.columns.length) {
    throw new Error(`${source} has an invalid aggregate telemetry row.`);
  }

  return table.columns.map((column, index) => ({
    name: column?.name,
    type: column?.type ?? 'dynamic',
    value: row[index] ?? null,
  }));
}

export function mergeApplicationInsightsAggregates(payloads) {
  const columns = [];
  const values = [];
  const names = new Set();

  for (const { payload, source } of payloads) {
    for (const column of rowFromPayload(payload, source)) {
      if (typeof column.name !== 'string' || column.name.length === 0) {
        throw new Error(`${source} contains an unnamed aggregate telemetry column.`);
      }
      if (names.has(column.name)) {
        throw new Error(`Duplicate aggregate telemetry column: ${column.name}`);
      }
      names.add(column.name);
      columns.push({ name: column.name, type: column.type });
      values.push(column.value);
    }
  }

  if (columns.length === 0) {
    throw new Error('At least one aggregate telemetry input is required.');
  }

  return {
    tables: [{ name: 'MergedAggregateTelemetry', columns, rows: [values] }],
  };
}

function parseArgs(argv) {
  if (argv[0] !== '--output' || !argv[1] || argv.length < 3) {
    throw new Error('Usage: merge-app-insights-aggregates.mjs --output <file> <aggregate-json>...');
  }
  return { output: argv[1], inputs: argv.slice(2) };
}

function main() {
  const { output, inputs } = parseArgs(process.argv.slice(2));
  const merged = mergeApplicationInsightsAggregates(
    inputs.map((source) => ({ payload: readPayload(source), source })),
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(merged, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
