import type { InvocationContext } from '@azure/functions';
import type { Principal } from '@shared/middleware/auth';
import {
  AuthenticatedRequest,
  withDailyAppealLimit,
} from '@shared/middleware/dailyPostLimit';

import { submitAppealRoute } from '@moderation/routes/submitAppeal';
import { submitAppealHandler } from '@moderation/service/appealService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/appealService', () => ({
  submitAppealHandler: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn((name: string) => {
      if (name === 'users') {
        return {
          item: jest.fn(() => ({
            read: jest.fn().mockResolvedValue({ resource: { id: 'moderator-1', isActive: true } }),
          })),
        };
      }
      return {
        item: jest.fn(() => ({
          read: jest.fn().mockResolvedValue({ resource: {} }),
        })),
      };
    }),
  })),
}));

const dailyLimitModule = require('@shared/services/dailyPostLimitService');
const mockCheckAndIncrementDailyActionCount = jest.spyOn(
  dailyLimitModule,
  'checkAndIncrementDailyActionCount'
);
const { DailyAppealLimitExceededError } = dailyLimitModule;

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn() } as unknown as InvocationContext;
const { trackAppEvent } = require('@shared/appInsights');

function authorizedRequest(body?: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body,
  });
}

describe('submitAppeal route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAndIncrementDailyActionCount.mockResolvedValue({
      success: true,
      newCount: 1,
      limit: 5,
      remaining: 4,
    });
    contextStub.log = jest.fn();
    verifyMock.mockImplementation(async header => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { sub: 'moderator-1', tier: 'free', raw: {} } as any;
    });
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await submitAppealRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects disallowed methods', async () => {
    const response = await submitAppealRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method GET not allowed',
    });
  });

  it('returns 401 when authorization is missing', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    const response = await submitAppealRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('returns 403 when device integrity headers indicate compromised', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    const response = await submitAppealRoute(
      httpReqMock({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'x-device-emulator': 'true',
        },
        body: { reason: 'please review' },
      }),
      contextStub
    );
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.code).toBe('DEVICE_INTEGRITY_BLOCKED');
  });

  it('delegates to handler for authorized requests', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    handler.mockResolvedValueOnce({ status: 201, jsonBody: { id: 'appeal-1' } });

    const request = authorizedRequest({ reason: 'please review' });
    const response = await submitAppealRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'moderator-1',
    });
    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual({ id: 'appeal-1' });
  });

  it('returns a standardized 429 when the daily appeal limit is exceeded', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    const limitPayload = {
      allowed: false,
      currentCount: 1,
      limit: 1,
      remaining: 0,
      tier: 'free',
      resetDate: '2025-12-01T00:00:00.000Z',
    };

    mockCheckAndIncrementDailyActionCount.mockRejectedValueOnce(
      new DailyAppealLimitExceededError(limitPayload)
    );

    const response = await submitAppealRoute(
      authorizedRequest({ reason: 'please review' }),
      contextStub
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Retry-After': '86400',
      'X-RateLimit-Limit': '1',
      'X-RateLimit-Remaining': '0',
    });

    expect(JSON.parse(response.body as string)).toEqual({
      error: 'rate_limited',
      scope: 'user',
      limit: 1,
      window_seconds: 86400,
      retry_after_seconds: 86400,
      trace_id: null,
      code: 'DAILY_APPEAL_LIMIT_EXCEEDED',
      tier: 'free',
      current: 1,
      resetAt: '2025-12-01T00:00:00.000Z',
      message: 'Daily appeal limit reached. Try again tomorrow.',
    });
  });

  it('returns 500 when handler throws', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    handler.mockRejectedValueOnce(new Error('database down'));

    const response = await submitAppealRoute(authorizedRequest({ reason: 'please review' }), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.appeal.submit.error',
      expect.objectContaining({ message: 'database down' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });

});
