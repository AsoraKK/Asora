import type { HttpRequest, InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';

import { customFeeds_create } from '../../src/custom-feeds/customFeeds_create.function';
import { customFeeds_list } from '../../src/custom-feeds/customFeeds_list.function';
import { customFeeds_getById } from '../../src/custom-feeds/customFeeds_getById.function';
import { customFeeds_update } from '../../src/custom-feeds/customFeeds_update.function';
import { customFeeds_delete } from '../../src/custom-feeds/customFeeds_delete.function';
import { customFeeds_getItems } from '../../src/custom-feeds/customFeeds_getItems.function';
import { httpReqMock } from '../helpers/http';
import { AuthError, verifyAuthorizationHeader } from '@auth/verifyJwt';
import {
  createCustomFeed,
  listCustomFeeds,
  getCustomFeed,
  updateCustomFeed,
  deleteCustomFeed,
  getCustomFeedItems,
} from '../../src/custom-feeds/customFeedsService';
import { extractAuthContext } from '../../src/shared/http/authContext';
import { HttpError } from '../../src/shared/utils/errors';

jest.mock('../../src/custom-feeds/customFeedsService', () => ({
  createCustomFeed: jest.fn(),
  listCustomFeeds: jest.fn(),
  getCustomFeed: jest.fn(),
  updateCustomFeed: jest.fn(),
  deleteCustomFeed: jest.fn(),
  getCustomFeedItems: jest.fn(),
}));

jest.mock('../../src/shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

const mockedService = {
  createCustomFeed: jest.mocked(createCustomFeed),
  listCustomFeeds: jest.mocked(listCustomFeeds),
  getCustomFeed: jest.mocked(getCustomFeed),
  updateCustomFeed: jest.mocked(updateCustomFeed),
  deleteCustomFeed: jest.mocked(deleteCustomFeed),
  getCustomFeedItems: jest.mocked(getCustomFeedItems),
};
const mockedAuthContext = jest.mocked(extractAuthContext);
const mockedVerifyAuth = jest.mocked(verifyAuthorizationHeader);
const mockedHttp = jest.mocked(app.http);

function getRegisteredHandler(routeName: string): Function {
  const call = mockedHttp.mock.calls.find(([name]) => name === routeName);
  if (!call) {
    throw new Error(`Route not registered: ${routeName}`);
  }
  const route = call[1] as { handler?: Function };
  if (!route?.handler) {
    throw new Error(`Route handler missing: ${routeName}`);
  }
  return route.handler;
}

const registeredCustomFeedsCreateHandler = getRegisteredHandler('customFeeds_create');

const contextStub = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  traceContext: {},
  invocationId: 'test-id',
  functionName: 'customFeedsTest',
  triggerMetadata: {},
  retryContext: {},
  extraInputs: {},
  extraOutputs: {},
  options: {},
} as unknown as InvocationContext;

const authResponse = {
  userId: 'user-123',
  roles: ['user'],
  tier: 'free',
  token: {},
};

describe('custom feed handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthContext.mockResolvedValue(authResponse);
    mockedVerifyAuth.mockResolvedValue({
      sub: authResponse.userId,
      roles: authResponse.roles,
      tier: authResponse.tier,
      raw: {},
    } as any);
  });

  function authRequest(body?: unknown, method = 'POST'): HttpRequest {
    return httpReqMock({
      method,
      headers: { authorization: 'Bearer token' },
      body,
    });
  }

  it('creates a custom feed and returns 201', async () => {
    const feed = {
      id: 'custom::1',
      ownerId: 'user-123',
      name: 'news',
      contentType: 'text',
      sorting: 'new',
      includeKeywords: [],
      excludeKeywords: [],
      includeAccounts: [],
      excludeAccounts: [],
      isHome: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedService.createCustomFeed.mockResolvedValue(feed);

    const response = await registeredCustomFeedsCreateHandler(
      authRequest({ name: 'news', contentType: 'text', sorting: 'new' }),
      contextStub
    );

    expect(mockedService.createCustomFeed).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ name: 'news' }),
      'free'
    );
    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual(feed);
  });

  it('blocks guest custom-feed creation before the handler runs', async () => {
    mockedVerifyAuth.mockRejectedValueOnce(new AuthError('invalid_request', 'Authorization header missing'));

    const response = await registeredCustomFeedsCreateHandler(
      httpReqMock({
        method: 'POST',
        body: { name: 'news', contentType: 'text', sorting: 'new' },
      }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(mockedService.createCustomFeed).not.toHaveBeenCalled();
  });

  it('returns 403 when the service enforces limits', async () => {
    mockedService.createCustomFeed.mockRejectedValue(new HttpError(403, 'limit reached'));

    const response = await customFeeds_create(
      authRequest({ name: 'news', contentType: 'text', sorting: 'new' }),
      contextStub
    );

    expect(response.status).toBe(403);
    expect(response.jsonBody?.error?.message).toBe('limit reached');
  });

  it('lists feeds with cursor support', async () => {
    mockedService.listCustomFeeds.mockResolvedValue({
      feeds: [],
      nextCursor: 'next1',
    });

    const response = await customFeeds_list(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { cursor: 'prev', limit: '10' },
      }),
      contextStub
    );

    expect(mockedService.listCustomFeeds).toHaveBeenCalledWith('user-123', 'prev', 10);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ items: [], nextCursor: 'next1' });
  });

  it('fetches a custom feed by id', async () => {
    const feed = {
      id: 'custom::1',
      ownerId: 'user-123',
      name: 'news',
      contentType: 'text',
      sorting: 'new',
      includeKeywords: [],
      excludeKeywords: [],
      includeAccounts: [],
      excludeAccounts: [],
      isHome: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedService.getCustomFeed.mockResolvedValue(feed);

    const response = await customFeeds_getById(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'custom::1' },
      }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(feed);
  });

  it('updates a custom feed and returns the updated record', async () => {
    const updated = {
      id: 'custom::1',
      ownerId: 'user-123',
      name: 'updated',
      contentType: 'text',
      sorting: 'new',
      includeKeywords: [],
      excludeKeywords: [],
      includeAccounts: [],
      excludeAccounts: [],
      isHome: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedService.updateCustomFeed.mockResolvedValue(updated);

    const response = await customFeeds_update(
      httpReqMock({
        method: 'PATCH',
        headers: { authorization: 'Bearer token' },
        params: { id: 'custom::1' },
        body: { name: 'updated' },
      }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(updated);
  });

  it('deletes a custom feed', async () => {
    mockedService.deleteCustomFeed.mockResolvedValue(true);

    const response = await customFeeds_delete(
      httpReqMock({
        method: 'DELETE',
        headers: { authorization: 'Bearer token' },
        params: { id: 'custom::1' },
      }),
      contextStub
    );

    expect(response.status).toBe(204);
    expect(response.jsonBody).toBeUndefined();
  });

  it('returns custom feed items via the service', async () => {
    mockedService.getCustomFeedItems.mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });

    const response = await customFeeds_getItems(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'custom::1' },
        query: { limit: '10' },
      }),
      contextStub
    );

    expect(mockedService.getCustomFeedItems).toHaveBeenCalledWith(
      'user-123',
      'custom::1',
      undefined,
      10,
      'user-123'
    );
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ items: [], nextCursor: undefined });
  });
});
