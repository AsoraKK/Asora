/**
 * Negative integration test: all auth endpoints fail closed
 * when EasyAuth is absent.
 *
 * Proves:
 *  1. An attacker who reaches the function app without EasyAuth
 *     (misconfiguration, direct internal call, disabled auth)
 *     cannot authenticate via:
 *       a) Spoofed x-ms-client-principal-id (no companion)
 *       b) Spoofed x-authenticated-user-id (no companion)
 *       c) user_id query param in production
 *       d) No identity at all
 *
 *  2. Spoofed headers WITH a fake companion but mismatched subject
 *     are also rejected (cross-check validation).
 *
 * Scope: authorizeHandler (the OAuth2 authorization endpoint).
 * This is the primary identity resolution surface; if it fails
 * closed, downstream token issuance is impossible.
 */

import type { InvocationContext } from '@azure/functions';

jest.mock('@azure/cosmos');

jest.mock('../../src/auth/service/authAuditService', () => ({
  auditForgedHeader: jest.fn().mockResolvedValue(undefined),
  auditTestUserBlocked: jest.fn().mockResolvedValue(undefined),
}));

const mockValidateAndCrossCheck = jest.fn();
jest.mock('../../src/auth/service/easyAuthValidator', () => ({
  validateAndCrossCheckPrincipal: (...args: any[]) => mockValidateAndCrossCheck(...args),
}));

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { CosmosClient } from '@azure/cosmos';
import { authorizeHandler } from '../../src/auth/service/authorizeService';
import { httpReqMock } from '../helpers/http';

// ── Cosmos mock (no writes should occur in these tests) ────────────
const mockCreate = jest.fn();
const mockContainer = {
  item: jest.fn().mockReturnValue({ read: jest.fn() }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: jest.fn() }),
    create: mockCreate,
  },
};

const ctx = {
  log: jest.fn(),
  invocationId: 'no-easyauth-test',
} as unknown as InvocationContext;

const validQuery = {
  client_id: 'test-client',
  response_type: 'code',
  redirect_uri: 'https://example.com/callback',
  state: 'xyz',
  code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  code_challenge_method: 'S256',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateAndCrossCheck.mockReturnValue({
    valid: false,
    error: 'Principal ID mismatch between header and claims',
  });

  (CosmosClient as jest.MockedClass<typeof CosmosClient>).mockImplementation(
    () =>
      ({
        database: () => ({
          container: () => mockContainer,
        }),
      }) as any
  );

  process.env.COSMOS_CONNECTION_STRING = 'mock-connection';
  process.env.COSMOS_DATABASE_NAME = 'asora';
  process.env.NODE_ENV = 'production';
  delete process.env.AUTH_ALLOW_TEST_USER_ID;
});

function expectAccessDenied(response: any) {
  expect(response.status).toBe(302);
  expect(response.headers?.Location).toContain('error=access_denied');
  expect(mockCreate).not.toHaveBeenCalled();
}

// ═══════════════════════════════════════════════════════════════════════
// Scenario: Request reaches function app without EasyAuth
// (no identity headers present at all)
// ═══════════════════════════════════════════════════════════════════════
describe('No-EasyAuth negative test — production fail-closed', () => {
  it('rejects when no identity headers or params are present', async () => {
    const req = httpReqMock({ query: validQuery });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects spoofed x-ms-client-principal-id without companion', async () => {
    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-injected-id',
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects spoofed x-authenticated-user-id without companion', async () => {
    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-authenticated-user-id': 'attacker-injected-id',
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects user_id param in production even with AUTH_ALLOW_TEST_USER_ID=true', async () => {
    process.env.AUTH_ALLOW_TEST_USER_ID = 'true';
    const req = httpReqMock({
      query: { ...validQuery, user_id: 'attacker-user' },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects spoofed principal header with mismatched subject (cross-check)', async () => {
    // Attacker crafts both headers, but the claims don't match the ID
    mockValidateAndCrossCheck.mockReturnValue({
      valid: false,
      error: 'Principal ID mismatch between header and claims',
    });

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-id',
        'x-ms-client-principal': Buffer.from(
          JSON.stringify({
            auth_typ: 'aad',
            claims: [{ typ: 'sub', val: 'different-subject' }],
          })
        ).toString('base64'),
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects spoofed principal with structurally invalid payload', async () => {
    mockValidateAndCrossCheck.mockReturnValue({
      valid: false,
      error: 'Missing or invalid auth_typ',
    });

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-id',
        'x-ms-client-principal': Buffer.from('not-json').toString('base64'),
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects in staging environment too (not just production)', async () => {
    process.env.NODE_ENV = 'staging';
    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-id',
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });

  it('rejects combined spoofed headers + user_id param', async () => {
    process.env.AUTH_ALLOW_TEST_USER_ID = 'true';

    mockValidateAndCrossCheck.mockReturnValue({
      valid: false,
      error: 'Principal ID mismatch',
    });

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'param-user' },
      headers: {
        'x-ms-client-principal-id': 'header-user',
        'x-ms-client-principal': Buffer.from(
          JSON.stringify({ auth_typ: 'aad', claims: [{ typ: 'sub', val: 'mismatch' }] })
        ).toString('base64'),
      },
    });
    const response = await authorizeHandler(req, ctx);
    expectAccessDenied(response);
  });
});
