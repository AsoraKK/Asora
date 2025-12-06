import { getPolicyForFunction } from '@rate-limit/policies';

describe('auth rate limit wiring', () => {
  it('maps redeem invite to the auth endpoint backoff policy', () => {
    const policy = getPolicyForFunction('auth-redeem-invite');

    expect(policy.routeId).toBe('auth-redeem-invite');
    expect(policy.authBackoff).toBeDefined();
    expect(policy.authBackoff?.failureStatusCodes).toEqual(
      expect.arrayContaining([400, 401, 403])
    );
  });
});
