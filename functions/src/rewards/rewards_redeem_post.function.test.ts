import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../../tests/helpers/http';

jest.mock('@azure/functions', () => ({
  app: { http: jest.fn() },
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('./rewardsService', () => ({
  redeemReward: jest.fn(),
}));

import { extractAuthContext } from '@shared/http/authContext';
import { redeemReward } from './rewardsService';
import { rewards_redeem_post } from './rewards_redeem_post.function';

const extractAuthContextMock = extractAuthContext as jest.Mock;
const redeemRewardMock = redeemReward as jest.Mock;

const contextStub = {
  invocationId: 'test-rewards-redeem',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

describe('rewards_redeem_post', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when authentication fails', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization'));

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: { id: 'lvl1-privacy-basics' } }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(redeemRewardMock).not.toHaveBeenCalled();
  });

  it('returns 400 when reward id is missing', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: {} }),
      contextStub
    );

    expect(response.status).toBe(400);
    expect(redeemRewardMock).not.toHaveBeenCalled();
  });

  it('returns 201 when redemption succeeds', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });
    redeemRewardMock.mockResolvedValue({
      id: 'red-1',
      userId: 'u1',
      rewardId: 'lvl1-privacy-basics',
      rewardLevel: 1,
      rewardTitle: 'Privacy Starter Pack',
      redeemedAt: '2026-05-27T00:00:00.000Z',
      status: 'redeemed',
    });

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: { id: 'lvl1-privacy-basics' } }),
      contextStub
    );

    expect(response.status).toBe(201);
    expect(redeemRewardMock).toHaveBeenCalledWith('u1', 'lvl1-privacy-basics', 'premium');
    expect(response.jsonBody).toMatchObject({ rewardId: 'lvl1-privacy-basics' });
  });

  it('maps not found service error to 404', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });
    redeemRewardMock.mockRejectedValue(Object.assign(new Error('Reward not found'), { statusCode: 404 }));

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: { id: 'unknown' } }),
      contextStub
    );

    expect(response.status).toBe(404);
  });

  it('maps forbidden service error to 403', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });
    redeemRewardMock.mockRejectedValue(Object.assign(new Error('Reward is locked'), { statusCode: 403 }));

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: { id: 'lvl5-elite' } }),
      contextStub
    );

    expect(response.status).toBe(403);
  });

  it('maps already redeemed service error to 400 with expected code', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });
    redeemRewardMock.mockRejectedValue(Object.assign(new Error('Reward already redeemed'), { statusCode: 409 }));

    const response = await rewards_redeem_post(
      httpReqMock({ method: 'POST', params: { id: 'lvl1-privacy-basics' } }),
      contextStub
    );

    expect(response.status).toBe(400);
    expect((response.jsonBody as any)?.error?.code).toBe('ALREADY_REDEEMED');
  });
});
