/**
 * Auth hardening tests for resolveAuthenticatedUserId
 *
 * Covers:
 *  - Production block of AUTH_ALLOW_TEST_USER_ID
 *  - Forged x-ms-client-principal-id detection (missing companion header)
 *  - Forged x-authenticated-user-id detection (missing companion header)
 *  - Valid EasyAuth flow in production (both headers present)
 *  - Regression: test env still allows user_id param
 */
import type { InvocationContext } from '@azure/functions';

jest.mock('@azure/cosmos');

// Mock audit service — fire-and-forget, should not affect auth flow tests
jest.mock('../../src/auth/service/authAuditService', () => ({
  auditForgedHeader: jest.fn().mockResolvedValue(undefined),
  auditTestUserBlocked: jest.fn().mockResolvedValue(undefined),
}));

// Mock easyAuth validator — return valid by default, overridden per-test where needed
const mockValidateAndCrossCheck = jest.fn().mockReturnValue({
  valid: true,
  subjectId: 'user-123',
  provider: 'aad',
});
jest.mock('../../src/auth/service/easyAuthValidator', () => ({
  validateAndCrossCheckPrincipal: (...args: any[]) => mockValidateAndCrossCheck(...args),
}));

import { CosmosClient } from '@azure/cosmos';
import { authorizeHandler } from '../../src/auth/service/authorizeService';
import { httpReqMock } from '../helpers/http';

// ── Logger spy ─────────────────────────────────────────────────────────
// Must use var for hoisting — jest.mock factory executes before const init
var loggerWarnSpy = jest.fn(); // eslint-disable-line no-var

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: (...args: any[]) => loggerWarnSpy(...args),
    error: jest.fn(),
  })),
}));

// ── Cosmos mocks ───────────────────────────────────────────────────────
const mockQuery = jest.fn();
const mockCreate = jest.fn();
const mockContainer = {
  item: jest.fn().mockReturnValue({ read: jest.fn() }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: mockQuery }),
    create: mockCreate,
  },
};

const contextStub = {
  log: jest.fn(),
  invocationId: 'hardening-test-1',
} as unknown as InvocationContext;

/** Valid PKCE query params shared by all tests */
const validQuery = {
  client_id: 'test-client',
  response_type: 'code',
  redirect_uri: 'https://example.com/callback',
  state: 'xyz',
  code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', // 43 chars base64url
  code_challenge_method: 'S256',
};

function userExists() {
  // verifyUserExists uses item(userId, userId).read()
  mockContainer.item.mockReturnValueOnce({
    read: jest.fn().mockResolvedValueOnce({
      resource: { id: 'user-123', isActive: true },
    }),
  });
  mockCreate.mockResolvedValueOnce({ resource: { id: 'session-1' } });
}

beforeEach(() => {
  jest.clearAllMocks();
  loggerWarnSpy.mockClear();
  mockValidateAndCrossCheck.mockReturnValue({
    valid: true,
    subjectId: 'user-123',
    provider: 'aad',
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
  process.env.NODE_ENV = 'test';
  delete process.env.AUTH_ALLOW_TEST_USER_ID;
});

// ═══════════════════════════════════════════════════════════════════════
// 1. AUTH_ALLOW_TEST_USER_ID hard-block in production
// ═══════════════════════════════════════════════════════════════════════
describe('resolveAuthenticatedUserId — production block of test user ID', () => {
  it('blocks user_id param even when AUTH_ALLOW_TEST_USER_ID=true in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_ALLOW_TEST_USER_ID = 'true';

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'user-123' },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('blocks user_id param in staging environment', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.AUTH_ALLOW_TEST_USER_ID = 'true';

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'user-123' },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('allows user_id param in test environment (regression)', async () => {
    process.env.NODE_ENV = 'test';

    userExists();

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'user-123' },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('allows user_id param in development environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_ALLOW_TEST_USER_ID = 'true';

    userExists();

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'user-123' },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Forged header detection — x-ms-client-principal-id
// ═══════════════════════════════════════════════════════════════════════
describe('resolveAuthenticatedUserId — forged x-ms-client-principal-id', () => {
  it('rejects forged x-ms-client-principal-id when companion header is missing in production', async () => {
    process.env.NODE_ENV = 'production';

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-user',
        // NOTE: no x-ms-client-principal — EasyAuth would always set both
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('logs security warning for forged x-ms-client-principal-id', async () => {
    process.env.NODE_ENV = 'production';

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'attacker-user',
      },
    });

    await authorizeHandler(req, contextStub);

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'auth.resolve.forged_header_suspected',
      expect.objectContaining({
        header: 'x-ms-client-principal-id',
        reason: expect.stringContaining('x-ms-client-principal missing'),
      })
    );
  });

  it('accepts x-ms-client-principal-id with valid EasyAuth companion in production', async () => {
    process.env.NODE_ENV = 'production';

    userExists();

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'user-123',
        'x-ms-client-principal': btoa(JSON.stringify({ claims: [] })),
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
    expect(mockCreate).toHaveBeenCalled();
  });

  it('accepts x-ms-client-principal-id without companion in test env', async () => {
    process.env.NODE_ENV = 'test';

    userExists();

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'user-123',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Forged header detection — x-authenticated-user-id
// ═══════════════════════════════════════════════════════════════════════
describe('resolveAuthenticatedUserId — forged x-authenticated-user-id', () => {
  it('rejects forged x-authenticated-user-id when companion header is missing in production', async () => {
    process.env.NODE_ENV = 'production';

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-authenticated-user-id': 'attacker-user',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('logs security warning for forged x-authenticated-user-id', async () => {
    process.env.NODE_ENV = 'production';

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-authenticated-user-id': 'attacker-user',
      },
    });

    await authorizeHandler(req, contextStub);

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'auth.resolve.forged_header_suspected',
      expect.objectContaining({
        header: 'x-authenticated-user-id',
        reason: expect.stringContaining('x-ms-client-principal missing'),
      })
    );
  });

  it('accepts x-authenticated-user-id with valid EasyAuth companion in production', async () => {
    process.env.NODE_ENV = 'production';

    userExists();

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-authenticated-user-id': 'user-123',
        'x-ms-client-principal': btoa(JSON.stringify({ claims: [] })),
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
    expect(mockCreate).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Edge cases
// ═══════════════════════════════════════════════════════════════════════
describe('resolveAuthenticatedUserId — edge cases', () => {
  it('returns access_denied when no identity source is available in production', async () => {
    process.env.NODE_ENV = 'production';

    const req = httpReqMock({ query: validQuery });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
  });

  it('prefers x-ms-client-principal-id over user_id param', async () => {
    process.env.NODE_ENV = 'test';

    // Mock user lookup for 'principal-user' (the header value)
    mockContainer.item.mockReturnValueOnce({
      read: jest.fn().mockResolvedValueOnce({
        resource: { id: 'principal-user', isActive: true },
      }),
    });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'session-1' } });

    const req = httpReqMock({
      query: { ...validQuery, user_id: 'param-user' },
      headers: {
        'x-ms-client-principal-id': 'principal-user',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
    // Verify Cosmos query was called with the header user, not the param user
    expect(mockContainer.item).toHaveBeenCalledWith('principal-user', 'principal-user');
  });

  it('does not log forged header warning in development env', async () => {
    process.env.NODE_ENV = 'development';

    userExists();

    const req = httpReqMock({
      query: validQuery,
      headers: {
        'x-ms-client-principal-id': 'user-123',
        // No companion header — but dev env doesn't enforce
      },
    });

    await authorizeHandler(req, contextStub);

    // Should NOT have logged a forged header warning
    const forgedCalls = loggerWarnSpy.mock.calls.filter(
      (call: any[]) => call[0] === 'auth.resolve.forged_header_suspected'
    );
    expect(forgedCalls).toHaveLength(0);
  });
});
