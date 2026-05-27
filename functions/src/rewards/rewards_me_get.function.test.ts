import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../../tests/helpers/http';

jest.mock('@azure/functions', () => ({
  app: { http: jest.fn() },
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('./rewardsService', () => ({
  getRewardsSnapshot: jest.fn(),
}));

import { extractAuthContext } from '@shared/http/authContext';
import { getRewardsSnapshot } from './rewardsService';
import { rewards_me_get } from './rewards_me_get.function';

const extractAuthContextMock = extractAuthContext as jest.Mock;
const getRewardsSnapshotMock = getRewardsSnapshot as jest.Mock;

const contextStub = {
  invocationId: 'test-rewards-me',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

describe('rewards_me_get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when authentication fails', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization'));

    const response = await rewards_me_get(
      httpReqMock({ method: 'GET', params: {} }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(getRewardsSnapshotMock).not.toHaveBeenCalled();
  });

  it('returns rewards snapshot for authenticated user', async () => {
    extractAuthContextMock.mockResolvedValue({ userId: 'u1', tier: 'premium' });
    getRewardsSnapshotMock.mockResolvedValue({
      subscriptionTier: 'premium',
      reputationLevel: 3,
      reputationBand: 'established',
      availableRewardLevels: [1, 2, 3, 4, 5],
      maxOptionsPerLevel: 1,
      redemptionStatus: 'active',
      fraudRiskStatus: 'normal',
      offers: [],
      redemptionHistory: [],
      affiliateDisclosure: 'Some reward links may include affiliate relationships.',
    });

    const response = await rewards_me_get(
      httpReqMock({ method: 'GET', headers: { authorization: 'Bearer token' } }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect(getRewardsSnapshotMock).toHaveBeenCalledWith('u1', 'premium');
    expect(response.jsonBody).toMatchObject({
      subscriptionTier: 'premium',
      reputationLevel: 3,
    });
  });
});
