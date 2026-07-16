jest.mock('../appInsights', () => ({
  trackAppEvent: jest.fn(),
}));

import { HttpRequest } from '@azure/functions';
import { trackAppEvent } from '../appInsights';
import {
  authorizeGatewayRequest,
  constantTimeTokenMatches,
  GATEWAY_CLASS_HEADER,
  OPERATIONAL_TOKEN_HEADER,
  ORIGIN_TOKEN_HEADER,
  parseLegacyAllowlist,
  resolveOriginGatewayConfiguration,
  wrapOriginGatewayHandler,
} from './originGatewayAuth';

const trackAppEventMock = jest.mocked(trackAppEvent);
const managedKeys = [
  'NODE_ENV',
  'APP_ENV',
  'ALPHA_RELEASE_ENVIRONMENT',
  'ORIGIN_GATEWAY_AUTH_MODE',
  'ORIGIN_GATEWAY_TOKEN',
  'ORIGIN_GATEWAY_TOKEN_NEXT',
  'ORIGIN_OPERATIONAL_TOKEN',
  'ORIGIN_GATEWAY_DUAL_UNTIL',
  'ORIGIN_GATEWAY_LEGACY_ALLOWLIST',
];
const fixedNow = new Date('2026-07-15T12:00:00.000Z');

function applyEnvironment(overrides: Record<string, string | undefined> = {}): void {
  for (const key of managedKeys) delete process.env[key];
  const values: Record<string, string> = {
    NODE_ENV: 'test',
    ORIGIN_GATEWAY_AUTH_MODE: 'enforce',
    ORIGIN_GATEWAY_TOKEN: 'fixture-current',
    ORIGIN_GATEWAY_TOKEN_NEXT: 'fixture-next',
    ORIGIN_OPERATIONAL_TOKEN: 'fixture-operational',
    ORIGIN_GATEWAY_LEGACY_ALLOWLIST: JSON.stringify([{ method: 'GET', path: '/api/feed/discover' }]),
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete values[key];
    else values[key] = value;
  }
  Object.assign(process.env, values);
}

function request(
  path = '/api/health',
  method = 'GET',
  headers: Record<string, string> = {},
  host = 'asora-function-dev.azurewebsites.net'
): HttpRequest {
  return new HttpRequest({
    url: `https://${host}${path}`,
    method,
    headers,
  });
}

describe('origin gateway authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyEnvironment();
  });

  afterEach(() => {
    for (const key of managedKeys) delete process.env[key];
  });

  it('allows local off mode but rejects it in production validation', () => {
    applyEnvironment({
      ORIGIN_GATEWAY_AUTH_MODE: 'off',
      ORIGIN_GATEWAY_TOKEN: undefined,
      ORIGIN_GATEWAY_TOKEN_NEXT: undefined,
      ORIGIN_OPERATIONAL_TOKEN: undefined,
      ORIGIN_GATEWAY_LEGACY_ALLOWLIST: undefined,
    });
    expect(authorizeGatewayRequest(request(), fixedNow)).toBeUndefined();

    applyEnvironment({ NODE_ENV: 'production', ORIGIN_GATEWAY_AUTH_MODE: 'off' });
    expect(resolveOriginGatewayConfiguration(process.env, fixedNow).errors).toContain(
      'ORIGIN_GATEWAY_AUTH_MODE=off is not allowed in production'
    );
  });

  it('observes missing and invalid tokens without blocking', () => {
    applyEnvironment({ ORIGIN_GATEWAY_AUTH_MODE: 'observe' });
    expect(authorizeGatewayRequest(request('/api/posts/1'), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/posts/1', 'GET', { [ORIGIN_TOKEN_HEADER]: 'fixture-invalid' }), fixedNow)).toBeUndefined();
    expect(trackAppEventMock).toHaveBeenLastCalledWith({
      name: 'origin_gateway_auth',
      properties: expect.objectContaining({
        authMode: 'observe',
        authOutcome: 'invalid',
        routeClass: 'posts',
        hostClass: 'azure_default',
        methodClass: 'read',
      }),
    });
  });

  it('records aggregate-only telemetry without route, query, or token values', () => {
    authorizeGatewayRequest(
      request('/api/auth/token?email=person@example.test', 'POST', {
        [ORIGIN_TOKEN_HEADER]: 'fixture-current',
        [GATEWAY_CLASS_HEADER]: 'lythaus_gateway',
      }),
      fixedNow
    );
    expect(trackAppEventMock).toHaveBeenCalledWith({
      name: 'origin_gateway_auth',
      properties: {
        authMode: 'enforce',
        authOutcome: 'valid_current',
        routeClass: 'auth',
        hostClass: 'lythaus_gateway',
        methodClass: 'write',
      },
    });
    const serialized = JSON.stringify(trackAppEventMock.mock.calls);
    expect(serialized).not.toContain('fixture-current');
    expect(serialized).not.toContain('person@example.test');
    expect(serialized).not.toContain('/api/auth/token');
  });

  it('accepts current and next gateway tokens and rejects missing or invalid tokens', () => {
    expect(authorizeGatewayRequest(request('/api/feed/discover', 'GET', { [ORIGIN_TOKEN_HEADER]: 'fixture-current' }), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/feed/discover', 'GET', { [ORIGIN_TOKEN_HEADER]: 'fixture-next' }), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/feed/discover'), fixedNow)).toMatchObject({ status: 403 });
    expect(authorizeGatewayRequest(request('/api/feed/discover', 'GET', { [ORIGIN_TOKEN_HEADER]: 'fixture-invalid' }), fixedNow)).toMatchObject({ status: 403 });
  });

  it('permits the operational token only for GET and HEAD health', () => {
    expect(authorizeGatewayRequest(request('/api/health', 'GET', { [OPERATIONAL_TOKEN_HEADER]: 'fixture-operational' }), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/health', 'HEAD', { [OPERATIONAL_TOKEN_HEADER]: 'fixture-operational' }), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/feed/discover', 'GET', { [OPERATIONAL_TOKEN_HEADER]: 'fixture-operational' }), fixedNow)).toMatchObject({ status: 403 });
    expect(authorizeGatewayRequest(request('/api/health', 'POST', { [OPERATIONAL_TOKEN_HEADER]: 'fixture-operational' }), fixedNow)).toMatchObject({ status: 403 });
  });

  it('allows only exact method/path entries while dual mode is active', () => {
    applyEnvironment({ ORIGIN_GATEWAY_AUTH_MODE: 'dual', ORIGIN_GATEWAY_DUAL_UNTIL: '2026-07-15T12:05:00.000Z' });
    expect(authorizeGatewayRequest(request('/api/feed/discover'), fixedNow)).toBeUndefined();
    expect(authorizeGatewayRequest(request('/api/feed/discover', 'POST'), fixedNow)).toMatchObject({ status: 403 });
    expect(authorizeGatewayRequest(request('/api/feed/discover/extra'), fixedNow)).toMatchObject({ status: 403 });
    expect(trackAppEventMock).toHaveBeenCalledWith({
      name: 'origin_gateway_auth',
      properties: expect.objectContaining({ authMode: 'dual', authOutcome: 'legacy_allowlist' }),
    });
  });

  it('treats an expired dual window as enforce mode at request time', () => {
    applyEnvironment({ ORIGIN_GATEWAY_AUTH_MODE: 'dual', ORIGIN_GATEWAY_DUAL_UNTIL: '2026-07-15T12:05:00.000Z' });
    expect(authorizeGatewayRequest(request('/api/feed/discover'), new Date('2026-07-15T12:06:00.000Z'))).toMatchObject({ status: 403 });
  });

  it('fails closed for malformed configuration, duplicate tokens, and empty production tokens', () => {
    applyEnvironment({ ORIGIN_GATEWAY_AUTH_MODE: 'dual', ORIGIN_GATEWAY_DUAL_UNTIL: 'tomorrow', ORIGIN_GATEWAY_LEGACY_ALLOWLIST: '["/api/health"]' });
    expect(authorizeGatewayRequest(request(), fixedNow)).toMatchObject({ status: 503 });

    applyEnvironment({ NODE_ENV: 'production', ORIGIN_GATEWAY_TOKEN: '', ORIGIN_GATEWAY_TOKEN_NEXT: 'fixture-operational', ORIGIN_OPERATIONAL_TOKEN: 'fixture-operational' });
    const errors = resolveOriginGatewayConfiguration(process.env, fixedNow).errors.join(' ');
    expect(errors).toMatch(/ORIGIN_GATEWAY_TOKEN is required/);
    expect(errors).toMatch(/ORIGIN_OPERATIONAL_TOKEN must differ/);
    expect(authorizeGatewayRequest(request(), fixedNow)).toMatchObject({ status: 503 });
  });

  it('uses digest comparison and rejects broad or malformed allowlists', () => {
    expect(constantTimeTokenMatches('fixture-current', 'fixture-current')).toBe(true);
    expect(constantTimeTokenMatches('fixture-current', 'fixture-next')).toBe(false);
    expect(constantTimeTokenMatches(null, 'fixture-current')).toBe(false);
    expect(constantTimeTokenMatches('fixture-current', undefined)).toBe(false);
    expect(parseLegacyAllowlist('[{"method":"GET","path":"/api/feed/discover"}]')).toEqual([{ method: 'GET', path: '/api/feed/discover' }]);
    expect(parseLegacyAllowlist('[{"method":"GET","path":"/api/*"}]')).toBeUndefined();
    expect(parseLegacyAllowlist('[{"method":"GET","path":"/api/feed/discover?x=1"}]')).toBeUndefined();
  });

  it('blocks the wrapped handler before application invocation', async () => {
    const handler = jest.fn(async () => ({ status: 200 }));
    const wrapped = wrapOriginGatewayHandler(handler as never) as unknown as (...inputs: unknown[]) => Promise<unknown>;
    const blocked = await wrapped(request('/api/feed/discover'));
    expect(blocked).toMatchObject({ status: 403 });
    expect(handler).not.toHaveBeenCalled();

    await wrapped(request('/api/feed/discover', 'GET', { [ORIGIN_TOKEN_HEADER]: 'fixture-current' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
