import type { InvocationContext } from '@azure/functions';

import { withDailyPostLimit, AuthenticatedRequest } from '@shared/middleware/dailyPostLimit';

jest.mock('@shared/services/dailyPostLimitService', () => {
  const actual = jest.requireActual('@shared/services/dailyPostLimitService');
  return {
    ...actual,
    checkAndIncrementPostCount: jest.fn(),
  };
});

const dailyLimitModule = require('@shared/services/dailyPostLimitService');
const mockCheckAndIncrementPostCount = jest.mocked(
  dailyLimitModule.checkAndIncrementPostCount
);
const { DailyPostLimitExceededError } = dailyLimitModule;

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets requests through when under the tier limit', async () => {
    mockCheckAndIncrementPostCount.mockResolvedValue({
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
    expect(mockCheckAndIncrementPostCount).toHaveBeenCalledWith('user-123', 'free');
  });

  it('returns the new 429 body when the daily limit is exceeded', async () => {
    const limitPayload = {
      allowed: false,
      currentCount: 5,
      limit: 5,
      remaining: 0,
      tier: 'free',
      resetDate: '2025-01-01T00:00:00.000Z',
    };
    mockCheckAndIncrementPostCount.mockRejectedValue(new DailyPostLimitExceededError(limitPayload));

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
      code: 'DAILY_POST_LIMIT_EXCEEDED',
      tier: limitPayload.tier,
      limit: limitPayload.limit,
      resetAt: limitPayload.resetDate,
      message: 'Daily post limit reached. Try again tomorrow.',
    });
  });
});
