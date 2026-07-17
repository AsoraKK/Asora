/// <reference lib="dom" />

import {
  applyEdgeRateLimitHeaders,
  enforceEdgeRateLimit,
  type EdgeRateLimitOptions,
  type EdgeRateLimitResult,
} from '../../edge/worker/src/rateLimit';

export interface Env {
  ENVIRONMENT?: string;
  EXPECTED_HOSTNAMES?: string;
  ORIGIN_BASE?: string;
  ORIGIN_AUTH_TOKEN?: string;
  CORS_ALLOWED_ORIGINS?: string;
  RATE_LIMIT_REQUIRED?: string;
  RATE_LIMIT_KV?: KVNamespace;
  EMAIL_HASH_SALT?: string;
  GATEWAY_CLASS?: 'lythaus_gateway' | 'legacy_custom' | 'admin_gateway';
  GATEWAY_POLICY?: 'public' | 'admin';
  LEGACY_API_SUNSET?: string;
  LEGACY_SUCCESSOR?: string;
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const CACHE_KEY_PARAMS = new Set([
  'cursor',
  'limit',
  'page',
  'pageSize',
  'timeWindow',
  'region',
  'includeTopics',
  'excludeTopics',
  'includeHighReputation',
  'authorId',
  'since',
]);
const ANONYMOUS_CACHE_PATH = '/api/feed/discover';
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const CLIENT_SPOOFABLE_HEADERS = [
  'x-lythaus-origin-token',
  'x-lythaus-operational-token',
  'x-lythaus-gateway-class',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-original-host',
  'x-original-url',
  'x-internal-user',
  'x-internal-roles',
  'x-azure-clientip',
];
const ADMIN_ROUTE_PATTERN = /^\/api\/(?:_admin|admin|moderation|privacy|appeals|dsr)(?:\/|$)/;
const ORIGIN_DISCLOSURE_HEADERS = [
  'server',
  'x-powered-by',
  'x-azure-ref',
  'x-azure-ref-originshield',
  'x-ms-request-id',
  'x-ms-routing-request-id',
];

function splitExactValues(raw: string | undefined): Set<string> {
  return new Set(
    (raw || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function getCorrelationId(request: Request): string {
  const supplied = request.headers.get('x-correlation-id')?.trim();
  return supplied && CORRELATION_ID_PATTERN.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function getAllowedCorsOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get('origin')?.trim();
  if (!origin) return undefined;
  return splitExactValues(env.CORS_ALLOWED_ORIGINS).has(origin) ? origin : undefined;
}

function appendVary(headers: Headers, value: string): void {
  const values = new Set(
    (headers.get('Vary') || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
  values.add(value);
  headers.set('Vary', [...values].join(', '));
}

function applyGatewayHeaders(
  response: Response,
  correlationId: string,
  corsOrigin?: string
): Response {
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  appendVary(response.headers, 'Origin');
  appendVary(response.headers, 'Authorization');
  if (corsOrigin) {
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.delete('Access-Control-Allow-Origin');
    response.headers.delete('Access-Control-Allow-Credentials');
  }
  return response;
}

function gatewayError(
  status: number,
  code: string,
  correlationId: string,
  corsOrigin?: string
): Response {
  const response = new Response(
    JSON.stringify({ error: code, correlationId }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
      },
    }
  );
  return applyGatewayHeaders(response, correlationId, corsOrigin);
}

export function isExpectedHostname(url: URL, env: Env): boolean {
  return splitExactValues(env.EXPECTED_HOSTNAMES).has(url.hostname);
}

function gatewayClass(env: Env): NonNullable<Env['GATEWAY_CLASS']> {
  return env.GATEWAY_CLASS ?? 'lythaus_gateway';
}

export function isAdminGatewayRoute(url: URL, env: Env): boolean {
  return env.GATEWAY_POLICY !== 'admin' || ADMIN_ROUTE_PATTERN.test(url.pathname);
}

function requireOriginBase(env: Env): URL {
  const raw = env.ORIGIN_BASE?.trim();
  if (!raw) throw new Error('origin_not_configured');
  const origin = new URL(raw);
  if (origin.protocol !== 'https:' || origin.username || origin.password) {
    throw new Error('origin_invalid');
  }
  origin.pathname = origin.pathname.replace(/\/+$/, '');
  origin.search = '';
  origin.hash = '';
  return origin;
}

export function buildOriginRequest(
  request: Request,
  env: Env,
  correlationId: string
): Request {
  if (!env.ORIGIN_AUTH_TOKEN?.trim()) {
    throw new Error('origin_token_not_configured');
  }

  const incomingUrl = new URL(request.url);
  const origin = requireOriginBase(env);
  const originUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, origin);
  const originRequest = new Request(originUrl.toString(), request);
  for (const header of CLIENT_SPOOFABLE_HEADERS) originRequest.headers.delete(header);
  originRequest.headers.set('X-Lythaus-Origin-Token', env.ORIGIN_AUTH_TOKEN);
  originRequest.headers.set('X-Lythaus-Gateway-Class', gatewayClass(env));
  originRequest.headers.set('X-Correlation-ID', correlationId);
  return originRequest;
}

export function isAnonymousCacheRequest(request: Request, env?: Env): boolean {
  const url = new URL(request.url);
  return (
    env?.GATEWAY_POLICY !== 'admin' &&
    request.method.toUpperCase() === 'GET' &&
    url.pathname === ANONYMOUS_CACHE_PATH &&
    !request.headers.has('authorization') &&
    !request.headers.has('cookie')
  );
}

function applyLegacyDeprecationHeaders(response: Response, env: Env): Response {
  if (gatewayClass(env) !== 'legacy_custom') return response;
  response.headers.set('Deprecation', 'true');
  if (env.LEGACY_API_SUNSET?.trim()) response.headers.set('Sunset', env.LEGACY_API_SUNSET.trim());
  if (env.LEGACY_SUCCESSOR?.trim()) {
    response.headers.set('Link', `<${env.LEGACY_SUCCESSOR.trim()}>; rel="successor-version"`);
  }
  return response;
}

export function buildCacheKeyUrl(requestUrl: URL): URL {
  const cacheUrl = new URL(requestUrl.toString());
  const entries: Array<[string, string]> = [];
  cacheUrl.searchParams.forEach((value, key) => {
    if (CACHE_KEY_PARAMS.has(key)) entries.push([key, value]);
  });
  entries.sort(([aKey, aValue], [bKey, bValue]) => {
    const keyCompare = aKey.localeCompare(bKey);
    return keyCompare !== 0 ? keyCompare : aValue.localeCompare(bValue);
  });
  cacheUrl.search = '';
  for (const [key, value] of entries) cacheUrl.searchParams.append(key, value);
  return cacheUrl;
}

function endpointRateLimit(request: Request): EdgeRateLimitOptions {
  const path = new URL(request.url).pathname;
  const method = request.method.toUpperCase();
  if (path.startsWith('/api/auth/')) return { limit: 10, windowSeconds: 60, scope: 'ip' };
  if (/^\/api\/(?:_admin|admin|moderation|privacy|appeals)(?:\/|$)/.test(path)) {
    return { limit: 30, windowSeconds: 60, scope: 'ip' };
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { limit: 30, windowSeconds: 60, scope: 'ip' };
  }
  if (path === ANONYMOUS_CACHE_PATH) return { limit: 60, windowSeconds: 60, scope: 'ip' };
  return { limit: 120, windowSeconds: 60, scope: 'ip' };
}

function sanitizeOriginResponse(originResponse: Response): Response {
  const headers = new Headers(originResponse.headers);
  for (const header of ORIGIN_DISCLOSURE_HEADERS) headers.delete(header);
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Access-Control-Allow-Credentials');
  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers,
  });
}

function isCacheableDiscoveryResponse(response: Response): boolean {
  return (
    response.status === 200 &&
    !response.headers.has('set-cookie') &&
    (response.headers.get('content-type') || '').toLowerCase().includes('application/json')
  );
}

function applyRateLimit(response: Response, result: EdgeRateLimitResult): Response {
  applyEdgeRateLimitHeaders(response, result);
  return response;
}

async function handlePreflight(
  request: Request,
  env: Env,
  correlationId: string,
  corsOrigin: string | undefined
): Promise<Response> {
  if (!request.headers.get('origin') || !corsOrigin) {
    return gatewayError(403, 'cors_origin_denied', correlationId);
  }
  const requestedMethod = request.headers.get('access-control-request-method')?.toUpperCase();
  if (!requestedMethod || !ALLOWED_METHODS.has(requestedMethod)) {
    return gatewayError(405, 'method_not_allowed', correlationId, corsOrigin);
  }
  const response = new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': [...ALLOWED_METHODS].join(', '),
      'Access-Control-Allow-Headers': [
        'Authorization',
        'Content-Type',
        'Idempotency-Key',
        'X-Correlation-ID',
        'X-Device-Rooted',
        'X-Device-Emulator',
        'X-Device-Debug',
      ].join(', '),
      'Access-Control-Max-Age': '600',
      'Cache-Control': 'private, no-store',
    },
  });
  return applyGatewayHeaders(response, correlationId, corsOrigin);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const correlationId = getCorrelationId(request);
    const corsOrigin = getAllowedCorsOrigin(request, env);

    if (!isExpectedHostname(url, env)) {
      return gatewayError(421, 'unexpected_hostname', correlationId);
    }
    if (!ALLOWED_METHODS.has(method)) {
      return gatewayError(405, 'method_not_allowed', correlationId, corsOrigin);
    }
    if (!isAdminGatewayRoute(url, env)) {
      return gatewayError(403, 'admin_route_restricted', correlationId, corsOrigin);
    }
    if (request.headers.has('origin') && !corsOrigin) {
      return gatewayError(403, 'cors_origin_denied', correlationId);
    }
    if (method === 'OPTIONS') {
      return handlePreflight(request, env, correlationId, corsOrigin);
    }
    if ((env.RATE_LIMIT_REQUIRED || '').toLowerCase() === 'true' && !env.RATE_LIMIT_KV) {
      return gatewayError(503, 'rate_limit_unavailable', correlationId, corsOrigin);
    }

    let originRequest: Request;
    try {
      originRequest = buildOriginRequest(request, env, correlationId);
    } catch {
      return gatewayError(503, 'gateway_not_configured', correlationId, corsOrigin);
    }

    const rateLimitResult = await enforceEdgeRateLimit(request, env, endpointRateLimit(request));
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      const limited = applyGatewayHeaders(rateLimitResult.response, correlationId, corsOrigin);
      limited.headers.set('Cache-Control', 'private, no-store');
      return limited;
    }

    const anonymousDiscovery = isAnonymousCacheRequest(request, env);
    const cacheKey = new Request(buildCacheKeyUrl(url).toString(), { method: 'GET' });
    if (anonymousDiscovery) {
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const response = applyGatewayHeaders(new Response(cached.body, cached), correlationId, corsOrigin);
        response.headers.set('X-Cache', 'HIT');
        return applyRateLimit(response, rateLimitResult);
      }
    }

    let originResponse: Response;
    try {
      originResponse = await fetch(originRequest);
    } catch {
      console.error('api-gateway origin request failed', {
        correlationId,
        endpointClass: endpointRateLimit(request).limit,
      });
      return gatewayError(502, 'bad_gateway', correlationId, corsOrigin);
    }

    const response = sanitizeOriginResponse(originResponse);
    if (anonymousDiscovery && isCacheableDiscoveryResponse(response)) {
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      response.headers.set('X-Cache', 'MISS');
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    } else {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Cache', 'BYPASS');
    }

    return applyRateLimit(
      applyGatewayHeaders(applyLegacyDeprecationHeaders(response, env), correlationId, corsOrigin),
      rateLimitResult
    );
  },
};
