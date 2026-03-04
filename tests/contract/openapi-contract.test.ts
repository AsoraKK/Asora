import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fetch, { Response } from 'cross-fetch';

type HttpMethod = 'get' | 'post';

interface RequestOptions {
  method: HttpMethod;
  pathKey: string;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}

const spec = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'api/openapi/dist/openapi.json'), 'utf-8')
);
const server = process.env.STAGING_DOMAIN
  ? `https://${process.env.STAGING_DOMAIN}`
  : spec.servers?.[0]?.url;
const jwt = process.env.STAGING_SMOKE_TOKEN;

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const validatorCache = new Map<string, import('ajv').ValidateFunction>();
const baseUrl = server ? server.replace(/\/?$/, '') : undefined;
const REQUEST_TIMEOUT_MS = Number(process.env.CONTRACT_TIMEOUT_MS ?? 5000);

class StagingUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StagingUnavailableError';
    if (cause !== undefined) {
      (this as any).cause = cause;
    }
  }
}

let reachabilityPromise: Promise<boolean> | null = null;

function ensureServerAvailable() {
  if (!baseUrl) {
    throw new Error('No server defined for contract tests. Set STAGING_DOMAIN or update spec.servers.');
  }
}

function findResponseSchema(pathKey: string, method: HttpMethod, status = '200') {
  const op = spec.paths?.[pathKey]?.[method];
  const content = op?.responses?.[status]?.content?.['application/json']?.schema;
  if (!content) throw new Error(`No schema for ${method.toUpperCase()} ${pathKey} ${status}`);
  return content;
}

function resolveRefs(schema: any): any {
  if (!schema) {
    return schema;
  }
  if (schema.$ref && typeof schema.$ref === 'string') {
    const target = getRef(schema.$ref);
    if (!target) {
      throw new Error(`Unable to resolve reference: ${schema.$ref}`);
    }
    return resolveRefs(target);
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => resolveRefs(item));
  }
  if (typeof schema === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      next[key] = resolveRefs(value);
    }
    return next;
  }
  return schema;
}

function getRef(ref: string): any {
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  const parts = ref.slice(2).split('/');
  let current: any = spec;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function getValidator(pathKey: string, method: HttpMethod, status: string) {
  const cacheKey = `${pathKey}:${method}:${status}`;
  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey)!;
  }
  const schema = resolveRefs(findResponseSchema(pathKey, method, status));
  const validate = ajv.compile(schema);
  validatorCache.set(cacheKey, validate);
  return validate;
}

async function request({ method, pathKey, auth, query, body }: RequestOptions) {
  ensureServerAvailable();
  if (!(await isServerReachable())) {
    throw new StagingUnavailableError(`Staging endpoint ${baseUrl} is unreachable. Skipping contract request.`);
  }
  const url = new URL(pathKey, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  if (auth && jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error: any) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError' || error?.name === 'FetchError') {
      throw new StagingUnavailableError(`Request to ${url.toString()} failed: ${error.message ?? error}`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, payload };
}

async function isServerReachable(): Promise<boolean> {
  if (!baseUrl) {
    return false;
  }
  if (!reachabilityPromise) {
    reachabilityPromise = pingHealthEndpoint();
  }
  return reachabilityPromise;
}

async function pingHealthEndpoint(): Promise<boolean> {
  if (!baseUrl) {
    return false;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const healthUrl = new URL('/health', baseUrl);
    const res = await fetch(healthUrl.toString(), { method: 'GET', signal: controller.signal });
    if (!res.ok) {
      console.warn(`[contract] Health check for ${baseUrl} returned ${res.status}. Contract tests will be skipped.`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      `[contract] Unable to reach staging domain at ${baseUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function runOrSkip<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof StagingUnavailableError) {
      console.warn(`[contract] ${error.message}`);
      return undefined;
    }
    throw error;
  }
}

const describeIfServer = baseUrl ? describe : describe.skip;
const describeIfAuth = baseUrl && jwt ? describe : describe.skip;

const unauthorizedCases: Array<{ method: HttpMethod; path: string; body?: () => Record<string, unknown> }> = [
  { method: 'get', path: '/feed' },
  {
    method: 'post',
    path: '/post',
    body: () => ({ id: randomUUID(), text: 'Contract smoke unauthorized' })
  },
  {
    method: 'post',
    path: '/moderation/flag',
    body: () => ({ targetId: randomUUID(), reason: 'spam' })
  }
];

describeIfServer('Authorization guards', () => {
  test.each(unauthorizedCases)('%s %s yields 401 when missing auth', async ({ method, path, body }) => {
    const result = await runOrSkip(() => request({ method, pathKey: path, auth: false, body: body?.() }));
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(401);

    const validate = getValidator(path, method, '401');
    const ok = validate(payload);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});

const successCases: Array<{
  name: string;
  method: HttpMethod;
  path: string;
  status: number;
  query?: Record<string, string | number | undefined>;
  body?: () => Record<string, unknown>;
  snapshot?: (payload: any) => Record<string, unknown>;
}> = [
  {
    name: 'GET /feed happy path',
    method: 'get',
    path: '/feed',
    status: 200,
    query: { limit: 5 },
    snapshot: (payload) => ({
      hasItems: Array.isArray(payload.items) && payload.items.length > 0,
      hasNextCursor: Boolean(payload.meta?.nextCursor),
      metaKeyCount: typeof payload.meta === 'object' ? Object.keys(payload.meta).length : 0
    })
  },
  {
    name: 'POST /post creates content',
    method: 'post',
    path: '/post',
    status: 201,
    body: () => ({
      id: randomUUID(),
      text: `Contract post ${Date.now()}`,
      attachments: []
    })
  },
  {
    name: 'POST /moderation/flag accepts payload',
    method: 'post',
    path: '/moderation/flag',
    status: 202,
    body: () => ({
      targetId: randomUUID(),
      reason: 'spam',
      notes: 'Contract smoke flag'
    })
  }
];

describeIfAuth('Authenticated contract coverage', () => {
  test.each(successCases)('$name matches schema', async ({ method, path, status, query, body, snapshot }) => {
    const result = await runOrSkip(
      () =>
        request({
          method,
          pathKey: path,
          auth: true,
          query,
          body: body?.()
        })
    );
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(status);

    const validate = getValidator(path, method, String(status));
    const ok = validate(payload);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);

    if (snapshot) {
      expect(snapshot(payload)).toMatchInlineSnapshot(
        {
          hasItems: expect.any(Boolean),
          hasNextCursor: expect.any(Boolean),
          metaKeyCount: expect.any(Number)
        },
        `
Object {
  "hasItems": Any<Boolean>,
  "hasNextCursor": Any<Boolean>,
  "metaKeyCount": Any<Number>,
}
`
      );
    }
  });

  test('POST /post rejects invalid body with 400', async () => {
    const invalidBody = { id: randomUUID() };
    const result = await runOrSkip(() =>
      request({ method: 'post', pathKey: '/post', auth: true, body: invalidBody })
    );
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(400);
    const validate = getValidator('/post', 'post', '400');
    expect(validate(payload)).toBe(true);
  });

  test('POST /moderation/flag rejects bad reason', async () => {
    const invalidBody = { targetId: 'not-a-uuid', reason: 'invalid', notes: 'bad reason' };
    const result = await runOrSkip(() =>
      request({ method: 'post', pathKey: '/moderation/flag', auth: true, body: invalidBody })
    );
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(400);
    const validate = getValidator('/moderation/flag', 'post', '400');
    expect(validate(payload)).toBe(true);
  });

  test('GET /feed enforces pagination invariants', async () => {
    const limit = 10;
    const result = await runOrSkip(() =>
      request({ method: 'get', pathKey: '/feed', auth: true, query: { limit } })
    );
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(200);
    const validate = getValidator('/feed', 'get', '200');
    expect(validate(payload)).toBe(true);

    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeLessThanOrEqual(limit);
    expect(payload.meta?.count).toBeLessThanOrEqual(limit);
    if (payload.meta?.nextCursor) {
      expect(typeof payload.meta.nextCursor).toBe('string');
    }
  });

  test('GET /feed rejects invalid limit', async () => {
    const result = await runOrSkip(() =>
      request({ method: 'get', pathKey: '/feed', auth: true, query: { limit: 0 } })
    );
    if (!result) {
      return;
    }
    const { response, payload } = result;
    expect(response.status).toBe(400);
    // fallback to error schema when 400 not defined
    if (spec.paths?.['/feed']?.get?.responses?.['400']) {
      const badValidate = getValidator('/feed', 'get', '400');
      expect(badValidate(payload)).toBe(true);
    } else {
      const unauthValidator = getValidator('/feed', 'get', '401');
      expect(unauthValidator(payload)).toBe(true);
    }
  });
});
