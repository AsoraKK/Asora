import {
  ALPHA_STAGE_HARD_CAPS,
  assertAlphaWindow,
  getAlphaConfig,
  parseAlphaConfig,
} from '../../src/alpha/alphaConfig';

describe('Alpha config', () => {
  it('uses bounded test defaults', async () => {
    const config = await getAlphaConfig();
    expect(config.stage).toBe('technical_alpha');
    expect(config.maxRegisteredAccounts).toBe(50);
    expect(config.maxRegisteredAccounts).toBeLessThanOrEqual(
      ALPHA_STAGE_HARD_CAPS[config.stage]
    );
  });

  it('rejects paused and closed stages', () => {
    const base = {
      stage: 'paused' as const,
      maxRegisteredAccounts: 0,
      maxActiveInvites: 0,
      maxRedeemedInvites: 0,
      inviteExpiryDays: 14,
      stageStartDate: '2026-01-01T00:00:00Z',
      stageReviewDate: '2026-01-02T00:00:00Z',
      stageEndDate: '2026-01-03T00:00:00Z',
      aiClassificationFailureMode: 'fail_closed' as const,
      features: {} as never,
    };
    expect(() => assertAlphaWindow(base)).toThrow('Alpha stage is paused');
    expect(() => assertAlphaWindow({ ...base, stage: 'closed' })).toThrow(
      'Alpha stage is closed'
    );
  });

  it('accepts persisted paused configuration only with zero capacity', () => {
    const config = {
      stage: 'paused',
      maxRegisteredAccounts: 0,
      maxActiveInvites: 0,
      maxRedeemedInvites: 0,
      inviteExpiryDays: 14,
      stageStartDate: '2026-01-01T00:00:00Z',
      stageReviewDate: '2026-01-02T00:00:00Z',
      stageEndDate: '2026-01-03T00:00:00Z',
      aiClassificationFailureMode: 'fail_closed',
      features: {
        registrations: false,
        inviteRedemption: false,
        postCreation: false,
        commentCreation: false,
        reactions: false,
        mediaUpload: false,
        aiClassificationEnforcement: false,
        customFeedCreation: false,
        newsBoard: false,
        reputationAwards: false,
        communityVoting: false,
        nonEssentialNotifications: false,
        readOnlyMode: true,
      },
    };

    expect(parseAlphaConfig(config)?.stage).toBe('paused');
    expect(parseAlphaConfig({ ...config, maxRegisteredAccounts: 1 })).toBeNull();
  });
});
