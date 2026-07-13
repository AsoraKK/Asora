import { app, type FunctionHandler, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { createHash, timingSafeEqual } from 'node:crypto';

export const ORIGIN_TOKEN_HEADER = 'x-lythaus-origin-token';

function hashToken(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function constantTimeTokenMatches(actual: string | null, expected: string): boolean {
  const actualDigest = hashToken(actual || '');
  const expectedDigest = hashToken(expected);
  return timingSafeEqual(actualDigest, expectedDigest) && Boolean(actual);
}

export function isOriginGatewayAuthRequired(): boolean {
  return (process.env.ORIGIN_GATEWAY_AUTH_REQUIRED || '').toLowerCase() === 'true';
}

export function authorizeGatewayRequest(request: HttpRequest): HttpResponseInit | undefined {
  if (!isOriginGatewayAuthRequired()) return undefined;

  const expected = process.env.ORIGIN_GATEWAY_TOKEN?.trim();
  if (!expected) {
    return {
      status: 503,
      jsonBody: { error: 'origin_gateway_not_configured' },
      headers: { 'Cache-Control': 'private, no-store' },
    };
  }

  if (!constantTimeTokenMatches(request.headers.get(ORIGIN_TOKEN_HEADER), expected)) {
    return {
      status: 403,
      jsonBody: { error: 'origin_gateway_auth_required' },
      headers: { 'Cache-Control': 'private, no-store' },
    };
  }

  return undefined;
}

function isHttpRequest(value: unknown): value is HttpRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HttpRequest>;
  return typeof candidate.method === 'string' && typeof candidate.url === 'string' && Boolean(candidate.headers);
}

export function registerOriginGatewayGuard(): void {
  app.hook.preInvocation((context) => {
    const originalHandler = context.functionHandler;
    context.functionHandler = (async (...inputs: unknown[]) => {
      const request = inputs.find(isHttpRequest);
      if (request) {
        const rejection = authorizeGatewayRequest(request);
        if (rejection) return rejection;
      }
      return (originalHandler as (...args: unknown[]) => unknown)(...inputs);
    }) as FunctionHandler;
  });
}
