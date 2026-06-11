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

jest.mock('./customFeedsService', () => ({
  createCustomFeed: jest.fn(),
}));

jest.mock('./customFeedsHandlerUtils', () => ({
  mapHttpErrorToResponse: jest.fn(),
}));

import { createCustomFeed } from './customFeedsService';
import { extractAuthContext } from '@shared/http/authContext';
import { customFeeds_create } from './customFeeds_create.function';

const extractAuthContextMock = jest.mocked(extractAuthContext);
const createCustomFeedMock = jest.mocked(createCustomFeed);

const contextStub = {
  invocationId: 'test-custom-feeds-create',
  correlationId: 'custom-feeds-correlation',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  context: {
    log: jest.fn(),
    error: jest.fn(),
  },
} as unknown as InvocationContext;

describe('customFeeds_create', () => {
  it('registers the POST route behind the auth guard', () => {
    expect(mockRequireAuth).toHaveBeenCalledTimes(1);
    expect(mockWithRateLimit).toHaveBeenCalledTimes(1);
    expect(mockAppHttp).toHaveBeenCalledWith(
      'customFeeds_create',
      expect.objectContaining({
        authLevel: 'anonymous',
        methods: ['POST'],
        route: 'custom-feeds',
      })
    );
  });

  it('returns 401 before body validation when auth is missing', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization header'));

    const response = await customFeeds_create(
      httpReqMock({
        method: 'POST',
      }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(createCustomFeedMock).not.toHaveBeenCalled();
  });
});
