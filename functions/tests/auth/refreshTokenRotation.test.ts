/// <reference types="jest" />
/**
 * Refresh Token Rotation Tests
 *
 * Tests for:
 * - Refresh token stored on initial authorization_code grant
 * - Rotation issues new refresh token on use
 * - Reuse of old (rotated) token fails
 * - Invalid/expired tokens rejected
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// In-memory stores for mocking
const dbStub: { sessions: any[]; user: any } = { sessions: [], user: null };
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date; createdAt: Date }>();

// Mock Cosmos client
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: jest.fn(() => ({
    database: () => ({
      container: (name: string) => {
        if (name === 'auth_sessions') {
          return {
            items: {
              query: () => ({
                fetchAll: async () => ({ resources: dbStub.sessions }),
              }),
            },
            item: () => ({ patch: async () => ({}) }),
          };
        }
        if (name === 'users') {
          return {
            item: () => ({
              read: async () => ({ resource: dbStub.user }),
              patch: async () => ({}),
            }),
          };
        }
        return {} as any;
      },
    }),
  })),
}));

// Mock Postgres pool
jest.mock('@shared/clients/postgres', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(async (sql: string, params: any[]) => {
      // INSERT refresh token
      if (sql.includes('INSERT INTO refresh_tokens')) {
        const [jti, userId, expiresAt] = params;
        refreshTokenStore.set(jti, { userId, expiresAt, createdAt: new Date() });
        return { rowCount: 1 };
      }
      // SELECT refresh token
      if (sql.includes('SELECT') && sql.includes('refresh_tokens')) {
        const jti = params[0];
        const token = refreshTokenStore.get(jti);
        if (token && token.expiresAt > new Date()) {
          return {
            rows: [{
              jti,
              user_uuid: token.userId,
              expires_at: token.expiresAt,
              created_at: token.createdAt,
            }],
          };
        }
        return { rows: [] };
      }
      // DELETE refresh token
      if (sql.includes('DELETE FROM refresh_tokens')) {
        const jti = params[0];
        const existed = refreshTokenStore.has(jti);
        refreshTokenStore.delete(jti);
        return { rowCount: existed ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: jest.fn(async () => ({
      query: jest.fn(async (sql: string, params?: any[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return {};
        }
        // Handle rotation within transaction
        if (sql.includes('DELETE FROM refresh_tokens') && params) {
          const jti = params[0];
          refreshTokenStore.delete(jti);
          return { rowCount: 1 };
        }
        if (sql.includes('INSERT INTO refresh_tokens') && params) {
          const [jti, userId, expiresAt] = params;
          refreshTokenStore.set(jti, { userId, expiresAt, createdAt: new Date() });
          return { rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: jest.fn(),
    })),
  })),
}));

import { InvocationContext } from '@azure/functions';
import { tokenHandler } from '@auth/service/tokenService';
import { httpReqMock } from '../helpers/http';

const logFn = jest.fn();
const ctx: Partial<InvocationContext> = { invocationId: 'test-rotation', log: logFn, error: logFn, warn: logFn };

describe('Refresh Token Rotation', () => {
  const JWT_SECRET = 'test-secret-key-for-rotation-tests';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_ISSUER = 'asora-auth';
  });

  beforeEach(() => {
    dbStub.sessions = [];
    dbStub.user = null;
    refreshTokenStore.clear();
    logFn.mockClear();
  });

  describe('Initial token issuance', () => {
    it('stores refresh token jti on authorization_code grant', async () => {
      const code_verifier = 'test-verifier-for-storage';
      const sha = crypto.createHash('sha256').update(code_verifier).digest();
      const codeChallenge = sha.toString('base64url').replace(/=+$/g, '');

      dbStub.sessions = [{
        id: 's-store',
        partitionKey: 'pk',
        authorizationCode: 'code-store',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://callback',
        codeChallenge,
        nonce: 'nonce-store',
        userId: 'u-store',
      }];

      dbStub.user = {
        id: 'u-store',
        email: 'store@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 10,
        isActive: true,
      };

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'authorization_code',
          code: 'code-store',
          redirect_uri: 'http://callback',
          code_verifier,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(200);

      const body = JSON.parse(res.body as string);
      expect(body.data).toHaveProperty('refresh_token');

      // Decode the refresh token to get the jti
      const decoded = jwt.decode(body.data.refresh_token) as any;
      expect(decoded.jti).toBeDefined();

      // Verify it was stored
      expect(refreshTokenStore.has(decoded.jti)).toBe(true);
      expect(refreshTokenStore.get(decoded.jti)?.userId).toBe('u-store');
    });
  });

  describe('Refresh token rotation', () => {
    it('issues new refresh token and revokes old on use', async () => {
      // Set up user
      dbStub.user = {
        id: 'u-rotate',
        email: 'rotate@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      // Create initial refresh token
      const oldJti = crypto.randomUUID();
      const oldRefreshToken = jwt.sign(
        { sub: 'u-rotate', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d', jwtid: oldJti }
      );

      // Store it in our mock
      refreshTokenStore.set(oldJti, {
        userId: 'u-rotate',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: oldRefreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(200);

      const body = JSON.parse(res.body as string);
      expect(body.data).toHaveProperty('access_token');
      expect(body.data).toHaveProperty('refresh_token');

      // Verify old token was revoked
      expect(refreshTokenStore.has(oldJti)).toBe(false);

      // Verify new token was stored
      const newDecoded = jwt.decode(body.data.refresh_token) as any;
      expect(newDecoded.jti).toBeDefined();
      expect(newDecoded.jti).not.toBe(oldJti);
      expect(refreshTokenStore.has(newDecoded.jti)).toBe(true);
    });

    it('rejects reuse of old (rotated) refresh token', async () => {
      dbStub.user = {
        id: 'u-reuse',
        email: 'reuse@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      // Create a token that is NOT in the store (simulating rotation already happened)
      const oldJti = crypto.randomUUID();
      const oldRefreshToken = jwt.sign(
        { sub: 'u-reuse', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d', jwtid: oldJti }
      );

      // Note: NOT storing in refreshTokenStore - simulates it was already rotated

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: oldRefreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(500); // Should fail - token not in store
    });

    it('returns new refresh_token in response (changed from old behavior)', async () => {
      dbStub.user = {
        id: 'u-newrt',
        email: 'newrt@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      const jti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        { sub: 'u-newrt', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d', jwtid: jti }
      );

      refreshTokenStore.set(jti, {
        userId: 'u-newrt',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(200);

      const body = JSON.parse(res.body as string);
      // New behavior: refresh_token is returned
      expect(body.data.refresh_token).toBeDefined();
      expect(body.data.refresh_token).not.toBe(refreshToken); // Should be different
    });
  });

  describe('Edge cases', () => {
    it('rejects refresh token missing jti claim', async () => {
      dbStub.user = {
        id: 'u-nojti',
        email: 'nojti@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      // Create token WITHOUT jti
      const tokenWithoutJti = jwt.sign(
        { sub: 'u-nojti', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' } // No jwtid option
      );

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: tokenWithoutJti,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(500);
    });

    it('rejects token with mismatched user id', async () => {
      dbStub.user = {
        id: 'u-different',
        email: 'different@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      const jti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        { sub: 'u-different', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d', jwtid: jti }
      );

      // Store with DIFFERENT user
      refreshTokenStore.set(jti, {
        userId: 'u-other-user', // Mismatch!
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(500);
    });

    it('rejects expired refresh token in store', async () => {
      dbStub.user = {
        id: 'u-expired',
        email: 'expired@test.com',
        role: 'user',
        tier: 'free',
        reputationScore: 5,
        isActive: true,
      };

      const jti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        { sub: 'u-expired', iss: 'asora-auth', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d', jwtid: jti }
      );

      // Store with expired date
      refreshTokenStore.set(jti, {
        userId: 'u-expired',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(500); // Store validation fails - expired
    });

    it('rejects invalid JWT signature', async () => {
      const jti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        { sub: 'u-badsig', iss: 'asora-auth', type: 'refresh' },
        'wrong-secret-key',
        { expiresIn: '7d', jwtid: jti }
      );

      const req = httpReqMock({
        method: 'POST',
        body: {
          client_id: 'app',
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
      });

      const res = await tokenHandler(req as any, ctx as InvocationContext);
      expect(res.status).toBe(500);
    });
  });
});
