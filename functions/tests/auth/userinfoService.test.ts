/**
 * Service-layer tests for OIDC UserInfo endpoint
 */
import type { InvocationContext } from '@azure/functions';
import type { Principal } from '@shared/middleware/auth';

const mockRead = jest.fn();
const mockContainer = {
  item: jest.fn().mockReturnValue({ read: mockRead }),
  items: { query: jest.fn() },
};

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: jest.fn(async () => ({
    database: () => ({
      container: () => mockContainer,
    }),
  })),
}));

import { userInfoHandler } from '../../src/auth/service/userinfoService';
import { httpReqMock } from '../helpers/http';

const contextStub = { log: jest.fn(), invocationId: 'test-456' } as unknown as InvocationContext;
const USER_ID = '01944c1d-5672-7000-8000-0c91f95a72a1';

beforeEach(() => {
  jest.clearAllMocks();
});

function authenticatedRequest() {
  const req = httpReqMock({ method: 'GET' }) as ReturnType<typeof httpReqMock> & {
    principal: Principal;
  };
  req.principal = {
    sub: USER_ID,
    raw: {
      sub: USER_ID,
      type: 'access',
      iss: 'asora-auth',
      exp: Math.floor(Date.now() / 1000) + 900,
    },
  };
  return req;
}

describe('userinfoService - user lookup', () => {
  it('returns 404 when user not found in database', async () => {
    mockRead.mockResolvedValueOnce({ resource: undefined });

    const req = authenticatedRequest();

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ message: 'User not found' });
  });

  it('returns user profile for valid token', async () => {
    mockRead.mockResolvedValueOnce({
      resource: {
        id: USER_ID,
        username: 'testuser',
        email: 'test@example.com',
        email_verified: true,
        created_at: '2025-01-01T00:00:00Z',
        isActive: true,
      },
    });

    const req = authenticatedRequest();

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body || '{}');
    const claims = body.data ?? body;
    expect(claims).toMatchObject({
      sub: USER_ID,
      preferred_username: 'testuser',
      email: 'test@example.com',
      email_verified: true,
    });
  });

  it('handles Cosmos DB errors gracefully', async () => {
    mockRead.mockRejectedValueOnce(new Error('Cosmos connection failed'));

    const req = authenticatedRequest();

    const response = await userInfoHandler(req, contextStub);
    expect(response.status).toBe(500);
    expect(JSON.parse(response.body || '{}')).toMatchObject({ message: 'UserInfo request failed' });
  });
});
