/**
 * Tests for requireRoles authorization guard (B3)
 *
 * Tests cover:
 * - User with correct role (passes)
 * - User without required role (403)
 * - Missing/invalid token (401)
 * - Multiple roles (any match)
 * - requireAll option
 */
import type { HttpResponseInit, InvocationContext } from '@azure/functions';

// ─────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────

const mockVerifyAuthorizationHeader = jest.fn();

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: (...args: unknown[]) => mockVerifyAuthorizationHeader(...args),
  };
});

import {
  requireRoles,
  requireModerator,
  requirePrivacyAdmin,
  requireAdmin,
} from '../../src/auth/requireRoles';
import { AuthError } from '../../src/auth/verifyJwt';
import { httpReqMock } from '../helpers/http';

// ─────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────

const contextStub = {
  log: jest.fn(),
  invocationId: 'test-roles-invocation',
} as unknown as InvocationContext;

function createPrincipal(sub: string, roles: string[] = []) {
  return {
    sub,
    name: `User ${sub}`,
    email: `${sub}@example.com`,
    roles,
    raw: { sub, roles },
  };
}

const successHandler = jest.fn(async (req, ctx): Promise<HttpResponseInit> => {
  return {
    status: 200,
    jsonBody: {
      success: true,
      userId: (req as any).principal?.sub,
      roles: (req as any).principal?.roles,
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  contextStub.log = jest.fn();
});

// ─────────────────────────────────────────────────────────────
// Core requireRoles Tests
// ─────────────────────────────────────────────────────────────

describe('requireRoles - authentication (401)', () => {
  it('returns 401 when authorization header is missing', async () => {
    mockVerifyAuthorizationHeader.mockRejectedValue(
      new AuthError('invalid_request', 'Authorization header missing')
    );

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({ method: 'POST' });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('invalid_request');
    expect(body.message).toBe('Authorization header missing');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    mockVerifyAuthorizationHeader.mockRejectedValue(
      new AuthError('invalid_token', 'Unable to validate token')
    );

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('invalid_token');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', async () => {
    mockVerifyAuthorizationHeader.mockRejectedValue(
      new AuthError('token_expired', 'Token has expired')
    );

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer expired-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(401);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('token_expired');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('includes WWW-Authenticate header in 401 responses', async () => {
    mockVerifyAuthorizationHeader.mockRejectedValue(
      new AuthError('invalid_token', 'Unable to validate token')
    );

    const protectedHandler = requireRoles(['admin'])(successHandler);
    const req = httpReqMock({ method: 'POST' });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(401);
    expect(response.headers?.['WWW-Authenticate']).toContain('Bearer');
    expect(response.headers?.['WWW-Authenticate']).toContain('invalid_token');
  });
});

describe('requireRoles - authorization (403)', () => {
  it('returns 403 when user lacks required role', async () => {
    const principal = createPrincipal('user-1', ['user']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('forbidden');
    expect(body.code).toBe('insufficient_permissions');
    expect(body.requiredRoles).toContain('moderator');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no roles', async () => {
    const principal = createPrincipal('user-1', []);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['admin'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.error).toBe('forbidden');
    expect(body.requiredRoles).toContain('admin');
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('logs forbidden access attempts', async () => {
    const principal = createPrincipal('user-1', ['user']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    await protectedHandler(req, contextStub);

    expect(contextStub.log).toHaveBeenCalledWith(
      'auth.requireRoles.forbidden',
      expect.objectContaining({
        userId: 'user-1',
        userRoles: ['user'],
        requiredRoles: ['moderator'],
      })
    );
  });
});

describe('requireRoles - successful access', () => {
  it('allows access when user has required role', async () => {
    const principal = createPrincipal('mod-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      success: true,
      userId: 'mod-1',
    });
    expect(successHandler).toHaveBeenCalled();
  });

  it('attaches principal to request object', async () => {
    const principal = createPrincipal('mod-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    await protectedHandler(req, contextStub);

    expect(successHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: expect.objectContaining({ sub: 'mod-1' }),
      }),
      contextStub
    );
  });

  it('allows access when user has ANY of multiple required roles', async () => {
    const principal = createPrincipal('admin-1', ['admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    // Require moderator OR admin
    const protectedHandler = requireRoles(['moderator', 'admin'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });

  it('logs successful access', async () => {
    const principal = createPrincipal('mod-1', ['moderator', 'user']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    await protectedHandler(req, contextStub);

    expect(contextStub.log).toHaveBeenCalledWith(
      'auth.requireRoles.granted',
      expect.objectContaining({
        userId: 'mod-1',
        matchedRoles: ['moderator'],
      })
    );
  });
});

describe('requireRoles - requireAll option', () => {
  it('requires ALL roles when requireAll=true', async () => {
    const principal = createPrincipal('user-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    // Require BOTH moderator AND senior_mod
    const protectedHandler = requireRoles(['moderator', 'senior_mod'], {
      requireAll: true,
    })(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(403);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('allows access when user has ALL required roles', async () => {
    const principal = createPrincipal('senior-1', ['moderator', 'senior_mod']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator', 'senior_mod'], {
      requireAll: true,
    })(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });
});

describe('requireRoles - custom error message', () => {
  it('uses custom forbidden message when provided', async () => {
    const principal = createPrincipal('user-1', ['user']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['admin'], {
      forbiddenMessage: 'Only administrators can perform this action',
    })(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.message).toBe('Only administrators can perform this action');
  });
});

describe('requireRoles - role extraction edge cases', () => {
  it('handles space-separated role string', async () => {
    const principal = {
      sub: 'user-1',
      name: 'User 1',
      roles: 'moderator admin', // Space-separated string
      raw: {},
    };
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });

  it('handles undefined roles', async () => {
    const principal = {
      sub: 'user-1',
      name: 'User 1',
      roles: undefined,
      raw: {},
    };
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles(['moderator'])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(403);
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('passes when no roles are required (empty array)', async () => {
    const principal = createPrincipal('user-1', []);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireRoles([])(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);

    expect(response.status).toBe(200);
    expect(successHandler).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Convenience Preset Tests
// ─────────────────────────────────────────────────────────────

describe('requireModerator preset', () => {
  it('allows moderator role', async () => {
    const principal = createPrincipal('mod-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireModerator(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(200);
  });

  it('allows admin role (fallback)', async () => {
    const principal = createPrincipal('admin-1', ['admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireModerator(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(200);
  });

  it('denies regular user', async () => {
    const principal = createPrincipal('user-1', ['user']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireModerator(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(403);
  });
});

describe('requirePrivacyAdmin preset', () => {
  it('allows privacy_admin role', async () => {
    const principal = createPrincipal('privacy-1', ['privacy_admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requirePrivacyAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(200);
  });

  it('allows admin role (fallback)', async () => {
    const principal = createPrincipal('admin-1', ['admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requirePrivacyAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(200);
  });

  it('denies moderator', async () => {
    const principal = createPrincipal('mod-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requirePrivacyAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(403);
  });
});

describe('requireAdmin preset', () => {
  it('allows only admin role', async () => {
    const principal = createPrincipal('admin-1', ['admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(200);
  });

  it('denies moderator', async () => {
    const principal = createPrincipal('mod-1', ['moderator']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(403);
  });

  it('denies privacy_admin', async () => {
    const principal = createPrincipal('privacy-1', ['privacy_admin']);
    mockVerifyAuthorizationHeader.mockResolvedValue(principal);

    const protectedHandler = requireAdmin(successHandler);
    const req = httpReqMock({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    const response = await protectedHandler(req, contextStub);
    expect(response.status).toBe(403);
  });
});
