/**
 * Service-layer tests for OIDC UserInfo endpoint
 */
import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

// Mock Cosmos DB BEFORE importing the service
jest.mock('@azure/cosmos');

import { CosmosClient } from '@azure/cosmos';
import { userInfoHandler } from '../../src/auth/service/userinfoService';
import { httpReqMock } from '../helpers/http';

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn(), invocationId: 'test-456' } as unknown as InvocationContext;

const mockRead = jest.fn();
const mockContainer = {
  item: jest.fn().mockReturnValue({ read: mockRead }),
  items: { query: jest.fn() },
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';

  // Setup Cosmos mock
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
});

afterAll(() => {
  process.env.JWT_SECRET = originalSecret;
});

function validToken(overrides: Record<string, any> = {}) {
  return jwt.sign({ sub: 'user-789', iss: 'asora', ...overrides }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
  });
}

describe('userinfoService - token validation', () => {
  it('returns 401 when authorization header is missing', async () => {
    const req = httpReqMock({ method: 'GET' });
    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(401);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ error: 'Bearer token required' });
  });

  it('returns 401 when authorization header format is invalid', async () => {
    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: 'InvalidFormat abc123' },
    });
    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(401);
  });

  it('returns 401 when JWT token is invalid', async () => {
    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(401);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ error: 'Invalid token' });
  });

  it('returns 401 when JWT token is expired', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-789', exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256' }
    );

    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(401);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ error: 'Invalid token' });
  });
});

describe('userinfoService - user lookup', () => {
  it('returns 404 when user not found in database', async () => {
    mockRead.mockResolvedValueOnce({ resource: undefined });

    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: `Bearer ${validToken()}` },
    });

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ error: 'User not found' });
  });

  it('returns user profile for valid token', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-789',
        username: 'testuser',
        email: 'test@example.com',
        email_verified: true,
        created_at: '2025-01-01T00:00:00Z',
      },
    });

    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: `Bearer ${validToken()}` },
    });

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    expect(body).toMatchObject({
      sub: 'user-789',
      username: 'testuser',
      email: 'test@example.com',
      email_verified: true,
    });
  });

  it('handles Cosmos DB errors gracefully', async () => {
    mockRead.mockRejectedValueOnce(new Error('Cosmos connection failed'));

    const req = httpReqMock({
      method: 'GET',
      headers: { authorization: `Bearer ${validToken()}` },
    });

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(500);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ error: 'Internal server error' });
  });
});
