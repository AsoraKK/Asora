#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const AUTH_GUARD_PATTERNS = [
  'requireAuth(',
  'requireRoles(',
  'requireAdmin(',
  'requireModerator(',
  'requirePrivacyAdmin(',
  'requireCloudflareAccess(',
  'requireActiveAdmin(',
  'requireActiveModerator(',
  'requireActiveUser(',
];

function getBlock(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let end = -1;
  let inString = false;
  let quoteChar = '';
  let escape = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quoteChar = char;
      continue;
    }

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
    throw new Error(`Unterminated block for ${openChar}${closeChar} starting at ${startIndex}`);
  }

  return { body: text.slice(startIndex + 1, end), end };
}

function splitTopLevel(text, delimiter = ',') {
  const segments = [];
  let current = '';
  let depthCurly = 0;
  let depthSquare = 0;
  let depthParen = 0;
  let inString = false;
  let quoteChar = '';
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      current += char;
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = '';
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      quoteChar = char;
      current += char;
      continue;
    }

    if (char === '{') depthCurly += 1;
    if (char === '}') depthCurly -= 1;
    if (char === '[') depthSquare += 1;
    if (char === ']') depthSquare -= 1;
    if (char === '(') depthParen += 1;
    if (char === ')') depthParen -= 1;

    if (
      char === delimiter &&
      depthCurly === 0 &&
      depthSquare === 0 &&
      depthParen === 0
    ) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const final = current.trim();
  if (final.length > 0) {
    segments.push(final);
  }

  return segments;
}

function parseObjectProperties(objectText) {
  const result = {};
  const entries = splitTopLevel(objectText, ',');
  for (const entry of entries) {
    const pair = splitTopLevel(entry, ':');
    if (pair.length < 2) {
      continue;
    }
    const key = pair[0].trim().replace(/^['"]|['"]$/g, '');
    const value = entry.slice(entry.indexOf(':') + 1).trim();
    result[key] = value;
  }
  return result;
}

function unquote(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return undefined;
}

function parseMethods(value) {
  if (!value) return [];
  const match = value.match(/['"]([A-Za-z]+)['"]/g);
  if (!match) return [];
  return match.map((item) => item.replace(/['"]/g, '').toUpperCase());
}

function parseAppHttpCalls(content) {
  const routes = [];
  const token = 'app.http(';
  let cursor = 0;

  while (cursor < content.length) {
    const callStart = content.indexOf(token, cursor);
    if (callStart < 0) {
      break;
    }

    const argsStart = content.indexOf('(', callStart);
    const { body: argsBody, end: argsEnd } = getBlock(content, argsStart, '(', ')');
    const argsParts = splitTopLevel(argsBody, ',');
    const functionName = unquote(argsParts[0]) || undefined;
    const optionsRaw = argsParts.slice(1).join(',').trim();
    if (!functionName || !optionsRaw.startsWith('{')) {
      cursor = argsEnd + 1;
      continue;
    }

    const { body: optionsBody } = getBlock(optionsRaw, optionsRaw.indexOf('{'), '{', '}');
    const props = parseObjectProperties(optionsBody);

    routes.push({
      functionName,
      methods: parseMethods(props.methods),
      route: unquote(props.route) || '',
      authLevel: unquote(props.authLevel) || '',
      handlerExpression: props.handler || '',
    });

    cursor = argsEnd + 1;
  }

  return routes;
}

function collectNamedAssignments(content, callNames) {
  const names = new Set();
  const alternation = callNames.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(?:${alternation})\\s*\\(`,
    'g'
  );
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  return names;
}

function isExpressionRateLimited(expression, rateLimitedNames) {
  const trimmed = expression.trim();
  if (trimmed.includes('withRateLimit(') || trimmed.includes('rateLimitedByRoute(')) {
    return true;
  }
  const directName = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
  if (directName && rateLimitedNames.has(directName)) {
    return true;
  }
  for (const rateLimitedName of rateLimitedNames) {
    const symbolRegex = new RegExp(`\\b${rateLimitedName}\\b`);
    if (symbolRegex.test(trimmed)) {
      return true;
    }
  }
  if (directName && directName.toLowerCase().includes('ratelimited')) {
    return true;
  }
  return false;
}

function findAssignedExpression(fileContent, symbol) {
  const assignmentRegex = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${symbol}\\s*=\\s*([\\s\\S]*?);`,
    'm'
  );
  const match = assignmentRegex.exec(fileContent);
  if (!match || !match[1]) {
    return '';
  }
  return match[1].trim();
}

function isNamedHandlerAuthGuarded(name, authWrappedNames, fileContent, visited = new Set()) {
  if (!name || visited.has(name)) {
    return false;
  }
  visited.add(name);

  if (authWrappedNames.has(name)) {
    return true;
  }

  const assignmentExpr = findAssignedExpression(fileContent, name);
  if (assignmentExpr) {
    for (const pattern of AUTH_GUARD_PATTERNS) {
      if (assignmentExpr.includes(pattern)) {
        return true;
      }
    }

    const wrappedArg = assignmentExpr.match(/withRateLimit\(\s*([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
    if (wrappedArg && isNamedHandlerAuthGuarded(wrappedArg, authWrappedNames, fileContent, visited)) {
      return true;
    }

    const genericWrappedArg = assignmentExpr.match(
      /^[A-Za-z_][A-Za-z0-9_]*\(\s*([A-Za-z_][A-Za-z0-9_]*)/
    )?.[1];
    if (
      genericWrappedArg &&
      genericWrappedArg !== name &&
      isNamedHandlerAuthGuarded(genericWrappedArg, authWrappedNames, fileContent, visited)
    ) {
      return true;
    }

    const directSymbol = assignmentExpr.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
    if (directSymbol && isNamedHandlerAuthGuarded(directSymbol, authWrappedNames, fileContent, visited)) {
      return true;
    }
  }

  const fnStartRegex = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(|(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=`
  );
  const startMatch = fnStartRegex.exec(fileContent);
  if (startMatch && startMatch.index !== undefined) {
    const functionSlice = fileContent.slice(startMatch.index, startMatch.index + 3000);
    for (const wrappedName of authWrappedNames) {
      if (functionSlice.includes(`${wrappedName}(`) || functionSlice.includes(`return ${wrappedName}`)) {
        return true;
      }
    }
    if (functionSlice.includes('requireCloudflareAccess(')) {
      return true;
    }
  }

  return false;
}

function isExpressionAuthGuarded(expression, authWrappedNames, fileContent, routePath = '') {
  const trimmed = expression.trim();
  for (const pattern of AUTH_GUARD_PATTERNS) {
    if (trimmed.includes(pattern)) {
      return true;
    }
  }

  if (routePath.startsWith('auth/')) {
    return true;
  }

  const wrappedNameFromExpression = trimmed.match(/withRateLimit\(\s*([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
  if (
    wrappedNameFromExpression &&
    isNamedHandlerAuthGuarded(wrappedNameFromExpression, authWrappedNames, fileContent)
  ) {
    return true;
  }

  const directName = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)?.[1];
  if (directName && isNamedHandlerAuthGuarded(directName, authWrappedNames, fileContent)) {
    return true;
  }

  const authSignalsByFile = AUTH_GUARD_PATTERNS.some((pattern) => fileContent.includes(pattern));

  if (directName && authSignalsByFile) {
    if (isNamedHandlerAuthGuarded(directName, authWrappedNames, fileContent)) {
      return true;
    }
  }

  // Heuristic: if handler is a named symbol in a file that performs JWT parsing,
  // treat it as auth-guarded.
  const authSignals =
    fileContent.includes('extractAuthContext(') ||
    fileContent.includes('parseAuth(') ||
    fileContent.includes('verifyAuthorizationHeader(');
  if (directName && authSignals) {
    const fnRegex = new RegExp(`(?:function|const|export\\s+const)\\s+${directName}\\b`);
    if (fnRegex.test(fileContent)) {
      return true;
    }
  }

  if (authSignals) {
    return true;
  }

  return false;
}

function walkTsFiles(rootDir) {
  const files = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && full.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(rootDir);
  return files.sort();
}

function loadAllowlist(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { rateLimitExempt: [], authGuardExempt: [] };
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    rateLimitExempt: Array.isArray(parsed.rateLimitExempt) ? parsed.rateLimitExempt : [],
    authGuardExempt: Array.isArray(parsed.authGuardExempt) ? parsed.authGuardExempt : [],
  };
}

function buildInventory(functionsRoot, allowlist) {
  const files = walkTsFiles(functionsRoot);
  const inventory = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('app.http(')) {
      continue;
    }

    const rateLimitedNames = collectNamedAssignments(content, [
      'withRateLimit',
      'rateLimited',
      'rateLimitedByRoute',
      'rateLimitedWith',
    ]);
    const authWrappedNames = collectNamedAssignments(content, [
      'requireAuth',
      'requireRoles',
      'requireAdmin',
      'requireModerator',
      'requirePrivacyAdmin',
      'requireActiveAdmin',
      'requireActiveModerator',
      'requireActiveUser',
    ]);

    for (const route of parseAppHttpCalls(content)) {
      const isWrite = route.methods.some((method) => WRITE_METHODS.has(method));
      const hasRateLimit = isExpressionRateLimited(route.handlerExpression, rateLimitedNames);
      const authGuardFromAuthLevel =
        route.authLevel && route.authLevel.toLowerCase() !== 'anonymous';
      const hasAuthGuard =
        authGuardFromAuthLevel ||
        isExpressionAuthGuarded(route.handlerExpression, authWrappedNames, content, route.route);

      const isRateLimitExempt = allowlist.rateLimitExempt.includes(route.functionName);
      const isAuthGuardExempt = allowlist.authGuardExempt.includes(route.functionName);

      inventory.push({
        file: path.relative(process.cwd(), file),
        functionName: route.functionName,
        methods: route.methods,
        route: route.route,
        authLevel: route.authLevel,
        isWrite,
        hasRateLimit,
        hasAuthGuard,
        rateLimitExempt: isRateLimitExempt,
        authGuardExempt: isAuthGuardExempt,
      });
    }
  }

  inventory.sort((a, b) => {
    if (a.route === b.route) {
      return a.functionName.localeCompare(b.functionName);
    }
    return a.route.localeCompare(b.route);
  });

  const missingRateLimit = inventory.filter(
    (item) => item.isWrite && !item.hasRateLimit && !item.rateLimitExempt
  );
  const missingAuthGuard = inventory.filter(
    (item) => item.isWrite && !item.hasAuthGuard && !item.authGuardExempt
  );

  return { inventory, missingRateLimit, missingAuthGuard };
}

function parseArgs(argv) {
  const args = {
    functionsRoot: 'functions/src',
    out: 'route-inventory.json',
    allowlist: 'scripts/route-guard-allowlist.json',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--functions-root' && argv[i + 1]) {
      args.functionsRoot = argv[i + 1];
      i += 1;
    } else if (arg === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--allowlist' && argv[i + 1]) {
      args.allowlist = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const allowlist = loadAllowlist(path.resolve(process.cwd(), args.allowlist));
  const { inventory, missingRateLimit, missingAuthGuard } = buildInventory(
    path.resolve(process.cwd(), args.functionsRoot),
    allowlist
  );

  const output = {
    generatedAt: new Date().toISOString(),
    functionsRoot: args.functionsRoot,
    totalRoutes: inventory.length,
    writeRoutes: inventory.filter((item) => item.isWrite).length,
    missingRateLimit: missingRateLimit.map((item) => ({
      functionName: item.functionName,
      route: item.route,
      methods: item.methods,
      file: item.file,
    })),
    missingAuthGuard: missingAuthGuard.map((item) => ({
      functionName: item.functionName,
      route: item.route,
      methods: item.methods,
      file: item.file,
    })),
    inventory,
  };

  fs.writeFileSync(path.resolve(process.cwd(), args.out), `${JSON.stringify(output, null, 2)}\n`);

  console.log(`[route-guards] total routes: ${output.totalRoutes}`);
  console.log(`[route-guards] write routes: ${output.writeRoutes}`);
  console.log(`[route-guards] missing rate limit: ${output.missingRateLimit.length}`);
  for (const item of output.missingRateLimit) {
    console.log(`  - ${item.functionName} (${item.methods.join('/')}) ${item.route} :: ${item.file}`);
  }
  console.log(`[route-guards] missing auth guard: ${output.missingAuthGuard.length}`);
  for (const item of output.missingAuthGuard) {
    console.log(`  - ${item.functionName} (${item.methods.join('/')}) ${item.route} :: ${item.file}`);
  }

  if (output.missingRateLimit.length > 0 || output.missingAuthGuard.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  splitTopLevel,
  parseObjectProperties,
  parseAppHttpCalls,
  buildInventory,
  isNamedHandlerAuthGuarded,
};
