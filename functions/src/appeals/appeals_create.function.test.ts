import type { InvocationContext } from '@azure/functions';

import { httpReqMock } from '../../tests/helpers/http';

const mockAppHttp = jest.fn();
const mockRequireAuth = jest.fn((handler: any) => handler);
const mockWithRateLimit = jest.fn((handler: any) => handler);

jest.mock('@azure/functions', () => ({
  app: { http: mockAppHttp },
}));

jest.mock('@auth/requireAuth', () => ({
  requireAuth: mockRequireAuth,
}));

jest.mock('@http/withRateLimit', () => ({
  withRateLimit: mockWithRateLimit,
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('./appealsService', () => ({
  createAppeal: jest.fn(),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

import { getCosmosDatabase } from '@shared/clients/cosmos';
import { extractAuthContext } from '@shared/http/authContext';
import { createAppeal } from './appealsService';
import { appeals_create } from './appeals_create.function';

const extractAuthContextMock = jest.mocked(extractAuthContext);
const createAppealMock = jest.mocked(createAppeal);
const getCosmosDatabaseMock = jest.mocked(getCosmosDatabase);

const contextStub = {
  invocationId: 'test-appeals-create',
  correlationId: 'appeals-correlation',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  context: {
    log: jest.fn(),
    error: jest.fn(),
  },
} as unknown as InvocationContext;

describe('appeals_create', () => {
  it('registers the POST route behind the auth guard', () => {
    expect(mockRequireAuth).toHaveBeenCalledTimes(1);
    expect(mockWithRateLimit).toHaveBeenCalledTimes(1);
    expect(mockAppHttp).toHaveBeenCalledWith(
      'appeals_create',
      expect.objectContaining({
        authLevel: 'anonymous',
        methods: ['POST'],
        route: 'appeals',
      })
    );
  });

  it('returns 401 before body validation when auth is missing', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization header'));

    const response = await appeals_create(
      httpReqMock({
        method: 'POST',
      }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(createAppealMock).not.toHaveBeenCalled();
    expect(getCosmosDatabaseMock).not.toHaveBeenCalled();
  });
});
