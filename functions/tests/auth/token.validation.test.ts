/// <reference types="jest" />
// Mock cosmos to avoid parsing real connection string at import time
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Mutable stub the Cosmos mock can read at call-time
const dbStub: { sessions: any[]; user: any } = { sessions: [], user: null };

// In-memory refresh token store for mocking
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date; createdAt: Date }>();

// Mock the cosmos client factory instead of the CosmosClient class
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

// Mock Postgres pool for refresh token store
jest.mock('@shared/clients/postgres', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO refresh_tokens')) {
        const [jti, userId, expiresAt] = params;
        refreshTokenStore.set(jti, { userId, expiresAt, createdAt: new Date() });
        return { rowCount: 1 };
      }
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
      if (sql.includes('DELETE FROM refresh_tokens')) {
        const jti = params[0];
        refreshTokenStore.delete(jti);
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: jest.fn(async () => ({
      query: jest.fn(async (sql: string, params?: any[]) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
        if (sql.includes('DELETE') && params) {
          refreshTokenStore.delete(params[0]);
          return { rowCount: 1 };
        }
        if (sql.includes('INSERT') && params) {
          refreshTokenStore.set(params[0], { userId: params[1], expiresAt: params[2], createdAt: new Date() });
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
const ctx: Partial<InvocationContext> = { invocationId: 'test', log: logFn, error: logFn };

describe('auth/token validation and method handling', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-token-validation';
    process.env.JWT_ISSUER = 'asora-auth';
  });

  beforeEach(() => {
    dbStub.sessions = [];
    dbStub.user = null;
    refreshTokenStore.clear();
    jest.restoreAllMocks();
    logFn.mockClear();
  });
  it('rejects non-POST with 405', async () => {
    const req = httpReqMock({ method: 'GET' });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(405);
  });

  it('rejects missing client_id/grant_type with 400', async () => {
    const req = httpReqMock({ method: 'POST', body: {} });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(400);
  });

  it('rejects unsupported grant_type with 400', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'password' as any },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(400);
  });

  it('rejects invalid client_id (too long) with 400', async () => {
    const longId = 'a'.repeat(101);
    const req = httpReqMock({
      method: 'POST',
      body: {
        client_id: longId,
        grant_type: 'authorization_code',
        code: 'x',
        redirect_uri: 'x',
        code_verifier: 'y',
      },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(400);
  });

  it('handles missing required parameters for authorization_code with error path', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'authorization_code' },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect([500, 400]).toContain(res.status); // token handler throws -> caught as 500 in current code
  });

  it('authorization_code: session missing user info', async () => {
    const verifier = 'no-user';
    const sha = crypto.createHash('sha256').update(verifier).digest();
    const codeChallenge = sha.toString('base64url').replace(/=+$/g, '');
    dbStub.sessions = [
      {
        id: 's0',
        partitionKey: 'pk',
        authorizationCode: 'abc0',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge,
        nonce: 'n0',
      },
    ];
    dbStub.user = null;
    const req = httpReqMock({
      method: 'POST',
      body: {
        client_id: 'app',
        grant_type: 'authorization_code',
        code: 'abc0',
        redirect_uri: 'http://cb',
        code_verifier: verifier,
      },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: user not found', async () => {
    const verifier = 'user-missing';
    const sha = crypto.createHash('sha256').update(verifier).digest();
    const codeChallenge = sha.toString('base64url').replace(/=+$/g, '');
    dbStub.sessions = [
      {
        id: 's4',
        partitionKey: 'pk',
        authorizationCode: 'abc4',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge,
        nonce: 'n4',
        userId: 'u4',
      },
    ];
    dbStub.user = null;
    const req = httpReqMock({
      method: 'POST',
      body: {
        client_id: 'app',
        grant_type: 'authorization_code',
        code: 'abc4',
        redirect_uri: 'http://cb',
        code_verifier: verifier,
      },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: invalid code (no session)', async () => {
    dbStub.sessions = [];
    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'x',
      redirect_uri: 'http://cb',
      code_verifier: 'v',
    };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: expired session', async () => {
    dbStub.sessions = [
      {
        id: 's1',
        partitionKey: 'pk',
        authorizationCode: 'abc',
        clientId: 'app',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge: 'not-used',
        nonce: 'n',
      },
    ];
    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: 'http://cb',
      code_verifier: 'v',
    };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: redirect mismatch', async () => {
    dbStub.sessions = [
      {
        id: 's1',
        partitionKey: 'pk',
        authorizationCode: 'abc',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://expected',
        codeChallenge: 'x',
        nonce: 'n',
      },
    ];
    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: 'http://cb',
      code_verifier: 'v',
    };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: invalid PKCE', async () => {
    dbStub.sessions = [
      {
        id: 's1',
        partitionKey: 'pk',
        authorizationCode: 'abc',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge: 'does-not-match',
        nonce: 'n',
      },
    ];
    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: 'http://cb',
      code_verifier: 'verifier',
    };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('authorization_code: success flow (active user)', async () => {
    // Build a PKCE-matching verifier/challenge
    const code_verifier = 's3cret-verifier-123';
    const sha = crypto.createHash('sha256').update(code_verifier).digest();
    const b64url = sha.toString('base64url');
    const normalize = (s: string) => s.replace(/=+$/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const codeChallenge = normalize(b64url);

    dbStub.sessions = [
      {
        id: 's1',
        partitionKey: 'pk',
        authorizationCode: 'abc',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge,
        nonce: 'n',
        userId: 'u1',
      },
    ];
    dbStub.user = {
      id: 'u1',
      email: 'u@example.com',
      role: 'user',
      tier: 'free',
      reputationScore: 1,
      isActive: true,
    };

    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: 'http://cb',
      code_verifier,
    };
    const req = httpReqMock({ method: 'POST', body });
    
    let res;
    try {
      res = await tokenHandler(req as any, ctx as InvocationContext);
    } catch (err) {
      console.error('EXCEPTION IN TOKEN HANDLER:', err);
      throw err;
    }
    
    // Debug: log error response if not 200
    if (res.status !== 200) {
      console.error('ERROR RESPONSE:', { status: res.status, body: res.body });
      console.error('LOGS:', logFn.mock.calls);
    }
    
    expect(res.status).toBe(200);
    const payload = JSON.parse(res.body as string);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveProperty('access_token');
    expect(payload.data).toHaveProperty('refresh_token');
  });

  it('authorization_code: success via base64 PKCE branch', async () => {
    const code_verifier = 'another-verifier-456';
    const sha = crypto.createHash('sha256').update(code_verifier).digest();
    const b64 = sha.toString('base64');
    const normalize = (s: string) => s.replace(/=+$/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const codeChallenge = normalize(b64);

    dbStub.sessions = [
      {
        id: 's2',
        partitionKey: 'pk',
        authorizationCode: 'abc2',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge,
        nonce: 'n2',
        userId: 'u2',
      },
    ];
    dbStub.user = {
      id: 'u2',
      email: 'u2@example.com',
      role: 'user',
      tier: 'free',
      reputationScore: 1,
      isActive: true,
    };

    const body = {
      client_id: 'app',
      grant_type: 'authorization_code',
      code: 'abc2',
      redirect_uri: 'http://cb',
      code_verifier,
    };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(200);
  });

  it('authorization_code: inactive user returns 403 invite_required', async () => {
    const verifier = 'needs-invite';
    const sha = crypto.createHash('sha256').update(verifier).digest();
    const codeChallenge = sha.toString('base64url').replace(/=+$/g, '');
    dbStub.sessions = [
      {
        id: 's3',
        partitionKey: 'pk',
        authorizationCode: 'abc3',
        clientId: 'app',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        redirectUri: 'http://cb',
        codeChallenge,
        nonce: 'n3',
        userId: 'u3',
      },
    ];
    dbStub.user = {
      id: 'u3',
      email: 'u3@example.com',
      role: 'user',
      tier: 'free',
      reputationScore: 1,
      isActive: false,
    };
    const req = httpReqMock({
      method: 'POST',
      body: {
        client_id: 'app',
        grant_type: 'authorization_code',
        code: 'abc3',
        redirect_uri: 'http://cb',
        code_verifier: verifier,
      },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(403);
    const body = JSON.parse(res.body as string);
    expect(body.error).toBe('invite_required');
  });

  it('refresh_token: invalid or malformed token triggers error path', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token', refresh_token: 'not-a-jwt' },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('refresh_token: missing refresh_token parameter', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token' } as any,
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('refresh_token: success flow issues new access token', async () => {
    dbStub.user = {
      id: 'u1',
      email: 'u1@example.com',
      role: 'user',
      tier: 'free',
      reputationScore: 1,
      isActive: true,
    };
    // Create refresh token WITH jti and pre-populate store
    const jti = crypto.randomUUID();
    refreshTokenStore.set(jti, {
      userId: 'u1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    const refresh = jwt.sign(
      { sub: 'u1', iss: 'asora-auth', type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d', jwtid: jti }
    );
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token', refresh_token: refresh },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('access_token');
    expect(body.data).toHaveProperty('refresh_token'); // Now returns new refresh token
  });

  it('refresh_token: user not found', async () => {
    const refresh = jwt.sign(
      { sub: 'missing', iss: 'asora-auth', type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    dbStub.user = null;
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token', refresh_token: refresh },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('refresh_token: inactive user', async () => {
    dbStub.user = {
      id: 'u9',
      email: 'u9@example.com',
      role: 'user',
      tier: 'free',
      reputationScore: 1,
      isActive: false,
    };
    const refresh = jwt.sign(
      { sub: 'u9', iss: 'asora-auth', type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token', refresh_token: refresh },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('refresh_token: invalid token type (access)', async () => {
    // create a signed token with type access so verify succeeds but type check fails
    const tok = jwt.sign(
      { sub: 'u1', iss: 'asora-auth', type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' }
    );
    const req = httpReqMock({
      method: 'POST',
      body: { client_id: 'app', grant_type: 'refresh_token', refresh_token: tok },
    });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(500);
  });

  it('invalid request size returns 400', async () => {
    const big = 'x'.repeat(1024 * 1024 + 50000);
    const body: any = { big, client_id: 'app', grant_type: 'authorization_code' };
    const req = httpReqMock({ method: 'POST', body });
    const res = await tokenHandler(req as any, ctx as InvocationContext);
    expect(res.status).toBe(400);
  });
});
