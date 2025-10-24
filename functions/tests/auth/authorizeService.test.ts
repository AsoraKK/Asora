/**
 * Service-layer tests for OAuth2 Authorization endpoint
 */
import type { InvocationContext } from '@azure/functions';

// Mock Cosmos DB BEFORE importing the service
jest.mock('@azure/cosmos');

import { CosmosClient } from '@azure/cosmos';
import { authorizeHandler } from '../../src/auth/service/authorizeService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-123' } as unknown as InvocationContext;

const mockQuery = jest.fn();
const mockCreate = jest.fn();
const mockContainer = {
  item: jest.fn().mockReturnValue({ read: jest.fn() }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: mockQuery }),
    create: mockCreate,
  },
};

beforeEach(() => {
  jest.clearAllMocks();

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

describe('authorizeService - parameter validation', () => {
  it('returns error for missing client_id', async () => {
    const req = httpReqMock({
      query: {
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
    expect(response.headers?.Location).toContain('client_id');
  });

  it('returns error for missing response_type', async () => {
    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
  });

  it('returns error for unsupported response_type', async () => {
    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'token',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
  });

  it('returns error for missing redirect_uri', async () => {
    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'code',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
  });

  it('returns error for missing code_challenge in PKCE flow', async () => {
    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge_method: 'S256',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
  });

  it('returns error for unsupported code_challenge_method', async () => {
    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'plain',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=invalid_request');
  });
});

describe('authorizeService - user verification', () => {
  it('returns error when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [] });

    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
        user_id: 'missing-user',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('error=access_denied');
  });

  it('generates authorization code when user exists', async () => {
    mockQuery.mockResolvedValueOnce({ resources: [{ id: 'user-123' }] });
    mockCreate.mockResolvedValueOnce({ resource: { id: 'session-1' } });

    const req = httpReqMock({
      query: {
        client_id: 'test-client',
        response_type: 'code',
        redirect_uri: 'https://example.com/callback',
        state: 'xyz',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
        user_id: 'user-123',
      },
    });

    const response = await authorizeHandler(req, contextStub);
    expect(response.status).toBe(302);
    expect(response.headers?.Location).toContain('code=');
    expect(response.headers?.Location).toContain('state=xyz');
    expect(mockCreate).toHaveBeenCalled();
  });
});
