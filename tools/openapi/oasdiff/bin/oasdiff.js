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
  const metadata = collectSpecMetadata(document);

  return {
    location: absolutePath,
    format,
    document,
    metadata
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

function collectSpecMetadata(document) {
  const metadata = {};

  if (document && typeof document === 'object') {
    if (typeof document.openapi === 'string' && document.openapi.trim()) {
      metadata.openapiVersion = document.openapi.trim();
    }

    if (typeof document.jsonSchemaDialect === 'string' && document.jsonSchemaDialect.trim()) {
      metadata.jsonSchemaDialect = document.jsonSchemaDialect.trim();
    }
  }

  return metadata;
}

function createDiffSpec(resolvedSpec, documentOverride) {
  const specDocument = documentOverride || resolvedSpec.document;

  return {
    location: resolvedSpec.location,
    format: resolvedSpec.format,
    content: yaml.dump(specDocument, { noRefs: true })
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function downgradeOpenApiDocument(document) {
  const clone = deepClone(document);
  const openapiVersion = typeof clone.openapi === 'string' ? clone.openapi.trim() : undefined;
  let downgraded = false;

  if (openapiVersion && /^3\.1(\.|$)/.test(openapiVersion)) {
    clone.openapi = '3.0.3';
    downgraded = true;
  }

  return { document: clone, downgraded };
}

function isUnsupportedOpenApiVersionError(error) {
  const message = error instanceof Error ? error.message : '';
  if (typeof message !== 'string') {
    return false;
  }

  return /Unsupported OpenAPI version/i.test(message) || /Swagger Parser only supports versions/i.test(message);
}

async function diffWithDowngradedSpecs(diffFunction, baseResolved, headResolved) {
  const downgradedBase = downgradeOpenApiDocument(baseResolved.document);
  const downgradedHead = downgradeOpenApiDocument(headResolved.document);

  const result = await diffFunction({
    sourceSpec: createDiffSpec(baseResolved, downgradedBase.document),
    destinationSpec: createDiffSpec(headResolved, downgradedHead.document)
  });

  return {
    result,
    applied: downgradedBase.downgraded || downgradedHead.downgraded
  };
}

function annotateMetadataDifferences(diffResult, baseMetadata, headMetadata) {
  if (!diffResult || typeof diffResult !== 'object') {
    return diffResult;
  }

  const notices = [];
  const baseVersion = baseMetadata ? baseMetadata.openapiVersion : undefined;
  const headVersion = headMetadata ? headMetadata.openapiVersion : undefined;

  if (baseVersion !== headVersion) {
    notices.push(
      `OpenAPI version changed from ${baseVersion || 'unspecified'} to ${headVersion || 'unspecified'}.`
    );
  }

  const baseDialect = baseMetadata ? baseMetadata.jsonSchemaDialect : undefined;
  const headDialect = headMetadata ? headMetadata.jsonSchemaDialect : undefined;

  if (baseDialect !== headDialect) {
    notices.push(
      `jsonSchemaDialect changed from ${baseDialect || 'unspecified'} to ${headDialect || 'unspecified'}.`
    );
  }

  if (notices.length > 0) {
    const existing = Array.isArray(diffResult.unclassifiedDiffs) ? diffResult.unclassifiedDiffs.slice() : [];
    diffResult.unclassifiedDiffs = existing.concat(notices);
  }

  return diffResult;
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

  const baseResolved = resolveSpec(options.basePath);
  const headResolved = resolveSpec(options.headPath);

  let diffResult;
  try {
    diffResult = await diffFunction({
      sourceSpec: createDiffSpec(baseResolved),
      destinationSpec: createDiffSpec(headResolved)
    });
  } catch (error) {
    if (isUnsupportedOpenApiVersionError(error)) {
      let fallback;
      try {
        fallback = await diffWithDowngradedSpecs(diffFunction, baseResolved, headResolved);
      } catch (fallbackError) {
        console.error('Failed to diff the provided OpenAPI specifications.');
        console.error(fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        process.exit(1);
      }

      diffResult = fallback && fallback.result;

      if (!diffResult) {
        console.error('Failed to diff the provided OpenAPI specifications.');
        process.exit(1);
      }

      if (fallback.applied) {
        console.error('Detected OpenAPI 3.1 specification. Downgraded to OpenAPI 3.0.3 for diff compatibility.');
        diffResult = annotateMetadataDifferences(diffResult, baseResolved.metadata, headResolved.metadata);
      }
    } else {
      console.error('Failed to diff the provided OpenAPI specifications.');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
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
