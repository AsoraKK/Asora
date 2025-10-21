#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const openapiDiff = require('openapi-diff');

function printUsage() {
  const usage = [
    'Usage: oasdiff [options] <baseSpec> <headSpec>',
    '',
    'Options:',
    '  --fail-on-breaking   Exit with code 1 when breaking changes are detected.',
    '  --fail-on-diff       Exit with code 1 when any change is detected.',
    '  --format <json|yaml> Control the output format (default: json).',
    '  -h, --help           Show this help message.'
  ];

  console.error(usage.join('\n'));
}

function parseArgs(argv) {
  const options = {
    failOnBreaking: false,
    failOnDiff: false,
    outputFormat: 'json',
    basePath: undefined,
    headPath: undefined
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case '--fail-on-breaking':
        options.failOnBreaking = true;
        break;
      case '--fail-on-diff':
        options.failOnDiff = true;
        break;
      case '--format': {
        const format = argv[i + 1];
        if (!format) {
          throw new Error('Missing value for --format.');
        }
        const normalized = format.toLowerCase();
        if (normalized !== 'json' && normalized !== 'yaml' && normalized !== 'yml') {
          throw new Error(`Unsupported format "${format}".`);
        }
        options.outputFormat = normalized === 'yml' ? 'yaml' : normalized;
        i += 1;
        break;
      }
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option "${arg}".`);
        }
        positional.push(arg);
        break;
    }
  }

  if (positional.length !== 2) {
    throw new Error('Expected exactly two OpenAPI specification paths.');
  }

  options.basePath = positional[0];
  options.headPath = positional[1];

  return options;
}

function resolveSpec(pathLike) {
  const absolutePath = path.resolve(process.cwd(), pathLike);
  const rawContent = fs.readFileSync(absolutePath, 'utf8');

  let document;
  try {
    document = yaml.load(rawContent);
  } catch (error) {
    console.error(`Failed to parse specification at ${absolutePath}.`);
    throw error;
  }

  if (!document || typeof document !== 'object') {
    throw new Error(`Specification at ${absolutePath} must parse to an object.`);
  }

  const format = detectSpecFormat(document);
  const yamlContent = yaml.dump(document, { noRefs: true });

  return {
    location: absolutePath,
    content: yamlContent,
    format
  };
}

function detectSpecFormat(document) {
  if (document && typeof document === 'object') {
    const openapiVersion = typeof document.openapi === 'string' ? document.openapi.trim() : undefined;
    if (openapiVersion && openapiVersion.startsWith('3')) {
      return 'openapi3';
    }

    const swaggerVersion = typeof document.swagger === 'string' ? document.swagger.trim() : undefined;
    if (swaggerVersion && swaggerVersion.startsWith('2')) {
      return 'swagger2';
    }
  }

  throw new Error('Unable to determine specification format. Expected OpenAPI 3.x or Swagger 2.0 document.');
}

function selectDiffFunction(moduleExports) {
  if (!moduleExports) {
    return undefined;
  }

  if (typeof moduleExports.diffSpecs === 'function') {
    return moduleExports.diffSpecs;
  }

  if (typeof moduleExports.diff === 'function') {
    return moduleExports.diff;
  }

  if (moduleExports.default) {
    return selectDiffFunction(moduleExports.default);
  }

  return undefined;
}

function hasEntries(value) {
  return Array.isArray(value) && value.length > 0;
}

function serializeResult(result, format) {
  if (format === 'yaml') {
    return yaml.dump(result, { noRefs: true });
  }

  return JSON.stringify(result, null, 2);
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    printUsage();
    console.error();
    console.error(error.message);
    process.exit(1);
  }

  let diffFunction = selectDiffFunction(openapiDiff);
  if (typeof diffFunction !== 'function') {
    console.error('Unable to locate diff function exported by openapi-diff.');
    process.exit(1);
  }

  const baseSpec = resolveSpec(options.basePath);
  const headSpec = resolveSpec(options.headPath);

  let diffResult;
  try {
    diffResult = await diffFunction({
      sourceSpec: baseSpec,
      destinationSpec: headSpec
    });
  } catch (error) {
    console.error('Failed to diff the provided OpenAPI specifications.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const output = serializeResult(diffResult, options.outputFormat);
  process.stdout.write(`${output}\n`);

  const breaking = hasEntries(diffResult && diffResult.breakingDifferences);
  const nonBreaking = hasEntries(diffResult && diffResult.nonBreakingDifferences);
  const unclassified = hasEntries(diffResult && diffResult.unclassifiedDiffs);

  const hasAnyDiff = breaking || nonBreaking || unclassified;

  if ((options.failOnBreaking && breaking) || (options.failOnDiff && hasAnyDiff)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
