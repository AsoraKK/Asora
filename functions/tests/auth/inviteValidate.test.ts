/**
 * Tests for invite_validate.function.ts
 * Covers the auth/invite/validate endpoint
 */
import { HttpRequest, InvocationContext } from '@azure/functions';

// Mock the shared modules before importing the function
const mockGetInvite = jest.fn();
const mockIsInviteActive = jest.fn();
jest.mock('../../src/auth/service/inviteStore', () => ({
  getInvite: (...args: any[]) => mockGetInvite(...args),
  isInviteActive: (...args: any[]) => mockIsInviteActive(...args),
}));

// Mock rate limiting to allow all requests
jest.mock('@http/withRateLimit', () => ({
  withRateLimit: (handler: any) => handler,
}));
jest.mock('@rate-limit/policies', () => ({
  getPolicyForFunction: jest.fn(() => ({})),
}));

// Import after mocks are set up
import { validateInvitePublic } from '../../src/auth/routes/invite_validate.function';

function createMockRequest(overrides: Partial<{
  method: string;
  url: string;
  queryParams: Record<string, string>;
}>): HttpRequest {
  const queryParams = overrides.queryParams || {};
  return {
    method: overrides.method || 'GET',
    url: overrides.url || 'https://example.com/api/auth/invite/validate',
    query: {
      get: (key: string) => queryParams[key] || null,
    },
    headers: {
      get: () => null,
    },
  } as unknown as HttpRequest;
}

function createMockContext(): InvocationContext {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as unknown as InvocationContext;
}

describe('auth-invite-validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to parse response body
  function parseBody(response: any): any {
    if (response.jsonBody) return response.jsonBody;
    if (response.body) {
      const parsed = JSON.parse(response.body);
      return parsed.data || parsed;
    }
    return null;
  }

  describe('CORS and method handling', () => {
    it('should handle OPTIONS request (CORS preflight)', async () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      // OPTIONS returns either 200/204 or goes through CORS handling
      expect(response.status).toBeLessThanOrEqual(204);
    });
  });

  describe('input validation', () => {
    it('should return { valid: false } when no code provided', async () => {
      const req = createMockRequest({ method: 'GET', queryParams: {} });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: false });
    });

    it('should return { valid: false } for empty code', async () => {
      const req = createMockRequest({ method: 'GET', queryParams: { code: '' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: false });
    });

    it('should return { valid: false } for whitespace-only code', async () => {
      const req = createMockRequest({ method: 'GET', queryParams: { code: '   ' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: false });
    });

    it('should return { valid: false } for invalid code format', async () => {
      const invalidCodes = [
        'ABCD', // Too short
        'ABCD-EFGH-IJKL', // Too long
        'abcd-efgh', // Wrong case (normalized but still may fail pattern)
        'ABCD_EFGH', // Wrong separator
        '1234567890', // No separator
        'ABCD-EFG', // Second part too short
      ];

      for (const code of invalidCodes) {
        const req = createMockRequest({ method: 'GET', queryParams: { code } });
        const ctx = createMockContext();

        const response = await validateInvitePublic(req, ctx);

        expect(response.status).toBe(200);
        const body = parseBody(response);
        expect(body).toEqual({ valid: false });
      }
    });
  });

  describe('valid invite codes', () => {
    it('should return { valid: true } for active invite', async () => {
      mockGetInvite.mockResolvedValue({ code: 'ABCD-1234', status: 'active' });
      mockIsInviteActive.mockReturnValue(true);

      const req = createMockRequest({ method: 'GET', queryParams: { code: 'ABCD-1234' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: true });
      expect(mockGetInvite).toHaveBeenCalledWith('ABCD-1234');
    });

    it('should normalize code to uppercase', async () => {
      mockGetInvite.mockResolvedValue({ code: 'ABCD-1234', status: 'active' });
      mockIsInviteActive.mockReturnValue(true);

      const req = createMockRequest({ method: 'GET', queryParams: { code: 'abcd-1234' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(mockGetInvite).toHaveBeenCalledWith('ABCD-1234');
    });

    it('should return { valid: false } for inactive invite', async () => {
      mockGetInvite.mockResolvedValue({ code: 'ABCD-1234', status: 'revoked' });
      mockIsInviteActive.mockReturnValue(false);

      const req = createMockRequest({ method: 'GET', queryParams: { code: 'ABCD-1234' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: false });
    });

    it('should return { valid: false } for non-existent invite', async () => {
      mockGetInvite.mockResolvedValue(null);

      const req = createMockRequest({ method: 'GET', queryParams: { code: 'XXXX-9999' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(200);
      const body = parseBody(response);
      expect(body).toEqual({ valid: false });
    });
  });

  describe('error handling', () => {
    it('should return 500 when invite store throws an error', async () => {
      mockGetInvite.mockRejectedValue(new Error('Database connection failed'));

      const req = createMockRequest({ method: 'GET', queryParams: { code: 'ABCD-1234' } });
      const ctx = createMockContext();

      const response = await validateInvitePublic(req, ctx);

      expect(response.status).toBe(500);
      // Response structure is { success: false, message: "..." }
      const parsed = response.jsonBody || (response.body ? JSON.parse(response.body) : null);
      expect(parsed).toHaveProperty('success', false);
      expect(ctx.error).toHaveBeenCalled();
    });
  });
});
