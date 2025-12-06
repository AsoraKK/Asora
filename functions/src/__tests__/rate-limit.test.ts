import type { InvocationContext } from '@azure/functions';

import { withDailyPostLimit, AuthenticatedRequest } from '@shared/middleware/dailyPostLimit';

jest.mock('@shared/clients/cosmos', () => {
  const mockContainer = {
    items: {
      query: jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    item: jest.fn().mockReturnValue({
      delete: jest.fn().mockResolvedValue({}),
      replace: jest.fn().mockResolvedValue({}),
      read: jest.fn().mockResolvedValue({ resource: {} }),
    }),
  };

  const mockDatabase = {
    container: jest.fn().mockReturnValue(mockContainer),
  };

  return {
    getCosmos: jest.fn().mockReturnValue({
      database: jest.fn().mockReturnValue(mockDatabase),
    }),
    getCosmosClient: jest.fn().mockReturnValue({
      database: jest.fn().mockReturnValue(mockDatabase),
    }),
    createCosmosClient: jest.fn().mockReturnValue({
      database: jest.fn().mockReturnValue(mockDatabase),
    }),
    getCosmosDatabase: jest.fn().mockReturnValue(mockDatabase),
    getTargetDatabase: jest.fn().mockReturnValue(mockDatabase),
    resetCosmosClient: jest.fn(),
  };
});

jest.mock('@shared/services/dailyPostLimitService', () => {
  const actual = jest.requireActual('@shared/services/dailyPostLimitService');
  return {
    ...actual,
    checkAndIncrementDailyActionCount: jest.fn(),
  };
});

const dailyLimitModule = require('@shared/services/dailyPostLimitService');
const mockCheckAndIncrementDailyActionCount = jest.mocked(
  dailyLimitModule.checkAndIncrementDailyActionCount
);

const contextStub = { log: jest.fn() } as unknown as InvocationContext;
const baseHandler = jest.fn(async () => ({
  status: 201,
  headers: {},
  body: JSON.stringify({ success: true }),
}));

const request = {
  principal: { sub: 'user-123', tier: 'free' },
} as AuthenticatedRequest;

describe('withDailyPostLimit', () => {
  beforeAll(() => {
    process.env.COSMOS_CONNECTION_STRING =
      'AccountEndpoint=https://localhost:8081/;AccountKey=key;';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets requests through when under the tier limit', async () => {
    mockCheckAndIncrementDailyActionCount.mockResolvedValue({
      success: true,
      newCount: 1,
      limit: 5,
      remaining: 4,
      tier: 'free',
    });

    const handler = withDailyPostLimit(baseHandler);
    const response = await handler(request, contextStub);

    expect(baseHandler).toHaveBeenCalledWith(request, contextStub);
    expect(response.status).toBe(201);
    expect(mockCheckAndIncrementDailyActionCount).toHaveBeenCalledWith('user-123', 'free', 'post');
  });

  it('returns the new 429 body when the daily limit is exceeded', async () => {
    const limitPayload = {
      allowed: false,
      currentCount: 5,
      limit: 5,
      remaining: 0,
      tier: 'free' as const,
      resetDate: '2025-01-01T00:00:00.000Z',
      action: 'post' as const,
    };

    // Create a mock error that matches the DailyActionLimitExceededError interface
    const mockError = {
      action: 'post' as const,
      code: 'DAILY_ACTION_LIMIT_EXCEEDED',
      statusCode: 429,
      tier: 'free' as const,
      currentCount: 5,
      toResponse: () => ({
        code: 'DAILY_ACTION_LIMIT_EXCEEDED',
        tier: 'free',
        action: 'post',
        limit: 5,
        current: 5,
        resetAt: '2025-01-01T00:00:00.000Z',
        message: 'Daily limit reached for this action. Try again tomorrow.',
      }),
    } as unknown as Error;

    mockCheckAndIncrementDailyActionCount.mockRejectedValue(mockError);

    const handler = withDailyPostLimit(baseHandler);
    const response = await handler(request, contextStub);

    expect(response.status).toBe(429);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Retry-After': '86400',
    });
    expect(baseHandler).not.toHaveBeenCalled();

    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      code: 'DAILY_ACTION_LIMIT_EXCEEDED',
      tier: 'free',
      action: 'post',
      limit: 5,
      current: 5,
      resetAt: '2025-01-01T00:00:00.000Z',
      message: 'Daily limit reached for this action. Try again tomorrow.',
    });
  });
});
