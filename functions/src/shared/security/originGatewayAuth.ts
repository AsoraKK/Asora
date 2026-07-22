import { app, type FunctionHandler, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { createHash, timingSafeEqual } from 'node:crypto';

import { trackAppEvent } from '../appInsights';

export const ORIGIN_TOKEN_HEADER = 'x-lythaus-origin-token';
export const OPERATIONAL_TOKEN_HEADER = 'x-lythaus-operational-token';
export const GATEWAY_CLASS_HEADER = 'x-lythaus-gateway-class';

export type OriginGatewayAuthMode = 'off' | 'observe' | 'dual' | 'enforce';
export type OriginGatewayAuthOutcome =
  | 'valid_current'
  | 'valid_next'
  | 'valid_operational'
  | 'missing'
  | 'invalid'
  | 'legacy_allowlist';
export type OriginGatewayRouteClass =
  | 'health'
  | 'auth'
  | 'feed'
  | 'posts'
  | 'users'
  | 'admin'
  | 'privacy'
  | 'moderation'
  | 'other';
export type OriginGatewayHostClass =
  | 'azure_default'
  | 'legacy_custom'
  | 'lythaus_gateway'
  | 'admin_gateway';
export type OriginGatewayMethodClass = 'read' | 'write' | 'options';

export interface LegacyRouteAllowance {
  method: string;
  path: string;
}

interface OriginGatewayConfiguration {
  mode: OriginGatewayAuthMode;
  currentToken?: string;
  nextToken?: string;
  operationalToken?: string;
  dualUntil?: Date;
  legacyAllowlist: LegacyRouteAllowance[];
}

interface ConfigurationResolution {
  configuration?: OriginGatewayConfiguration;
  errors: string[];
}

const VALID_MODES = new Set<OriginGatewayAuthMode>(['off', 'observe', 'dual', 'enforce']);
const VALID_LEGACY_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const OPERATIONAL_HEALTH_METHODS = new Set(['GET', 'HEAD']);

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function hashToken(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function constantTimeTokenMatches(actual: string | null, expected: string | undefined): boolean {
  if (!expected) return false;
  const actualDigest = hashToken(actual || '');
  const expectedDigest = hashToken(expected);
  return timingSafeEqual(actualDigest, expectedDigest) && Boolean(actual);
}

function isProductionEnvironment(env: NodeJS.ProcessEnv): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.ALPHA_RELEASE_ENVIRONMENT]
    .map((value) => value?.trim().toLowerCase())
    .some((value) => value === 'production' || value === 'prod' || value === 'mvp');
}

function parseMode(rawValue: string | undefined): OriginGatewayAuthMode | undefined {
  const value = (rawValue || 'off').trim().toLowerCase();
  return VALID_MODES.has(value as OriginGatewayAuthMode)
    ? (value as OriginGatewayAuthMode)
    : undefined;
}

function parseUtcExpiry(value: string | undefined): Date | undefined {
  const raw = trimEnv(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)) {
    return undefined;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseLegacyAllowlist(value: string | undefined): LegacyRouteAllowance[] | undefined {
  const raw = trimEnv(value);
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!Array.isArray(parsed)) return undefined;

  const entries: LegacyRouteAllowance[] = [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return undefined;
    const candidate = entry as Record<string, unknown>;
    if (Object.keys(candidate).length !== 2 || typeof candidate.method !== 'string' || typeof candidate.path !== 'string') {
      return undefined;
    }

    const method = candidate.method.trim().toUpperCase();
    const path = candidate.path.trim();
    if (
      !VALID_LEGACY_METHODS.has(method) ||
      !path.startsWith('/api/') ||
      path.includes('*') ||
      path.includes('?') ||
      path.includes('#') ||
      path.includes('..') ||
      path.includes('//') ||
      new URL(path, 'https://allowlist.invalid').pathname !== path
    ) {
      return undefined;
    }

    const key = `${method} ${path}`;
    if (seen.has(key)) return undefined;
    seen.add(key);
    entries.push({ method, path });
  }

  return entries;
}

export function resolveOriginGatewayConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  now = new Date(),
  requireFutureDualExpiry = false
): ConfigurationResolution {
  const errors: string[] = [];
  const mode = parseMode(env.ORIGIN_GATEWAY_AUTH_MODE);
  if (!mode) {
    return { errors: ['ORIGIN_GATEWAY_AUTH_MODE must be off, observe, dual, or enforce'] };
  }

  if (isProductionEnvironment(env) && mode === 'off') {
    errors.push('ORIGIN_GATEWAY_AUTH_MODE=off is not allowed in production');
  }

  const currentToken = trimEnv(env.ORIGIN_GATEWAY_TOKEN);
  const nextToken = trimEnv(env.ORIGIN_GATEWAY_TOKEN_NEXT);
  const operationalToken = trimEnv(env.ORIGIN_OPERATIONAL_TOKEN);
  const legacyAllowlist = parseLegacyAllowlist(env.ORIGIN_GATEWAY_LEGACY_ALLOWLIST);
  const dualUntil = parseUtcExpiry(env.ORIGIN_GATEWAY_DUAL_UNTIL);

  if (mode !== 'off') {
    if (!currentToken) errors.push('ORIGIN_GATEWAY_TOKEN is required when origin authentication is enabled');
    if (!nextToken) errors.push('ORIGIN_GATEWAY_TOKEN_NEXT is required when origin authentication is enabled');
    if (!operationalToken) errors.push('ORIGIN_OPERATIONAL_TOKEN is required when origin authentication is enabled');
    if (!legacyAllowlist) errors.push('ORIGIN_GATEWAY_LEGACY_ALLOWLIST must be a strict JSON method/path array');
  }

  if (currentToken && nextToken && currentToken === nextToken) {
    errors.push('ORIGIN_GATEWAY_TOKEN and ORIGIN_GATEWAY_TOKEN_NEXT must differ');
  }
  if (operationalToken && (operationalToken === currentToken || operationalToken === nextToken)) {
    errors.push('ORIGIN_OPERATIONAL_TOKEN must differ from gateway tokens');
  }

  if (mode === 'dual') {
    if (!dualUntil) {
      errors.push('ORIGIN_GATEWAY_DUAL_UNTIL must be an ISO-8601 UTC timestamp in dual mode');
    } else if (requireFutureDualExpiry && dualUntil.getTime() <= now.getTime()) {
      errors.push('ORIGIN_GATEWAY_DUAL_UNTIL must be in the future when dual mode starts');
    }
  }

  if (errors.length > 0) return { errors };
  return {
    configuration: {
      mode,
      currentToken,
      nextToken,
      operationalToken,
      dualUntil,
      legacyAllowlist: legacyAllowlist || [],
    },
    errors,
  };
}

export function originGatewayConfigurationErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  return resolveOriginGatewayConfiguration(env, new Date(), true).errors;
}

function classifyRoute(pathname: string): OriginGatewayRouteClass {
  if (pathname === '/api/health') return 'health';
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/feed')) return 'feed';
  if (pathname.startsWith('/api/posts') || pathname.startsWith('/api/post')) return 'posts';
  if (pathname.startsWith('/api/users') || pathname.startsWith('/api/user')) return 'users';
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/_admin')) return 'admin';
  if (pathname.startsWith('/api/privacy') || pathname.startsWith('/api/dsr')) return 'privacy';
  if (pathname.startsWith('/api/moderation') || pathname.startsWith('/api/appeals')) return 'moderation';
  return 'other';
}

function classifyMethod(method: string): OriginGatewayMethodClass {
  const normalized = method.toUpperCase();
  if (normalized === 'OPTIONS') return 'options';
  return normalized === 'GET' || normalized === 'HEAD' ? 'read' : 'write';
}

function classifyHost(request: HttpRequest, gatewayTokenValid: boolean): OriginGatewayHostClass {
  if (gatewayTokenValid) {
    const workerClass = request.headers.get(GATEWAY_CLASS_HEADER)?.trim().toLowerCase();
    if (workerClass === 'lythaus_gateway') return 'lythaus_gateway';
    if (workerClass === 'admin_gateway') return 'admin_gateway';
  }

  try {
    const host = new URL(request.url).hostname.toLowerCase();
    if (host.endsWith('.azurewebsites.net')) return 'azure_default';
    if (host === 'admin-api.lythaus.co' || host === 'admin-api.asora.co.za' || host === 'control.asora.co.za') {
      return 'admin_gateway';
    }
    if (host === 'api.lythaus.co') return 'lythaus_gateway';
  } catch {
    // Fall back to a non-authoritative legacy classification for telemetry only.
  }
  return 'legacy_custom';
}

function gatewayResponse(status: number, error: string): HttpResponseInit {
  return {
    status,
    jsonBody: { error },
    headers: { 'Cache-Control': 'private, no-store' },
  };
}

function isOperationalHealthRequest(request: HttpRequest): boolean {
  if (!OPERATIONAL_HEALTH_METHODS.has(request.method.toUpperCase())) return false;
  try {
    return new URL(request.url).pathname === '/api/health';
  } catch {
    return false;
  }
}

function isLegacyAllowed(request: HttpRequest, allowlist: LegacyRouteAllowance[]): boolean {
  let pathname: string;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return false;
  }
  const method = request.method.toUpperCase();
  return allowlist.some((entry) => entry.method === method && entry.path === pathname);
}

function trackDecision(
  mode: OriginGatewayAuthMode,
  outcome: OriginGatewayAuthOutcome,
  request: HttpRequest,
  gatewayTokenValid: boolean
): void {
  let pathname = '/';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // Keep telemetry aggregate-only when a malformed URL reaches the runtime.
  }
  trackAppEvent({
    name: 'origin_gateway_auth',
    properties: {
      authMode: mode,
      authOutcome: outcome,
      routeClass: classifyRoute(pathname),
      hostClass: classifyHost(request, gatewayTokenValid),
      methodClass: classifyMethod(request.method),
    },
  });
}

export function authorizeGatewayRequest(request: HttpRequest, now = new Date()): HttpResponseInit | undefined {
  const resolved = resolveOriginGatewayConfiguration(process.env, now);
  if (!resolved.configuration) {
    trackDecision('enforce', 'invalid', request, false);
    return gatewayResponse(503, 'origin_gateway_not_configured');
  }

  const configuration = resolved.configuration;
  if (configuration.mode === 'off') return undefined;

  const suppliedGatewayToken = request.headers.get(ORIGIN_TOKEN_HEADER);
  const suppliedOperationalToken = request.headers.get(OPERATIONAL_TOKEN_HEADER);
  const currentMatches = constantTimeTokenMatches(suppliedGatewayToken, configuration.currentToken);
  const nextMatches = constantTimeTokenMatches(suppliedGatewayToken, configuration.nextToken);
  const operationalMatches = constantTimeTokenMatches(suppliedOperationalToken, configuration.operationalToken);
  const gatewayTokenValid = currentMatches || nextMatches;
  const outcome: OriginGatewayAuthOutcome = currentMatches
    ? 'valid_current'
    : nextMatches
      ? 'valid_next'
      : operationalMatches
        ? 'valid_operational'
        : suppliedGatewayToken || suppliedOperationalToken
          ? 'invalid'
          : 'missing';

  if (configuration.mode === 'observe') {
    trackDecision(configuration.mode, outcome, request, gatewayTokenValid);
    return undefined;
  }

  if (gatewayTokenValid) {
    trackDecision(configuration.mode, outcome, request, true);
    return undefined;
  }

  if (operationalMatches) {
    trackDecision(configuration.mode, outcome, request, false);
    return isOperationalHealthRequest(request)
      ? undefined
      : gatewayResponse(403, 'origin_gateway_auth_required');
  }

  const dualActive = configuration.mode === 'dual' && Boolean(configuration.dualUntil && configuration.dualUntil > now);
  if (dualActive && outcome === 'missing' && isLegacyAllowed(request, configuration.legacyAllowlist)) {
    trackDecision(configuration.mode, 'legacy_allowlist', request, false);
    return undefined;
  }

  trackDecision(configuration.mode, outcome, request, false);
  return gatewayResponse(403, 'origin_gateway_auth_required');
}

function isHttpRequest(value: unknown): value is HttpRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HttpRequest>;
  return typeof candidate.method === 'string' && typeof candidate.url === 'string' && Boolean(candidate.headers);
}

export function wrapOriginGatewayHandler(handler: FunctionHandler): FunctionHandler {
  return (async (...inputs: unknown[]) => {
    const request = inputs.find(isHttpRequest);
    if (request) {
      const rejection = authorizeGatewayRequest(request);
      if (rejection) return rejection;
    }
    return (handler as (...args: unknown[]) => unknown)(...inputs);
  }) as FunctionHandler;
}

export function registerOriginGatewayGuard(): void {
  app.hook.preInvocation((context) => {
    context.functionHandler = wrapOriginGatewayHandler(context.functionHandler);
  });
}
