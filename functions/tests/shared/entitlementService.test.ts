import { resolveTierFromUserDocument } from '@shared/services/entitlementService';

describe('entitlementService', () => {
  it('uses server truth instead of a stale higher JWT tier', () => {
    const result = resolveTierFromUserDocument(
      { tier: 'free', tierGrant: null },
      'black',
      new Date('2026-07-10T00:00:00Z')
    );

    expect(result.tier).toBe('free');
    expect(result.source).toBe('user_document');
  });

  it('expires manual paid-tier grants back to Free', () => {
    const result = resolveTierFromUserDocument(
      {
        tier: 'black',
        tierGrant: {
          tier: 'black',
          grantedBy: 'admin-1',
          reason: 'Alpha evaluation',
          grantedAt: '2026-07-01T00:00:00Z',
          reviewAt: '2026-07-07T00:00:00Z',
          expiresAt: '2026-07-09T00:00:00Z',
        },
      },
      'black',
      new Date('2026-07-10T00:00:00Z')
    );

    expect(result.tier).toBe('free');
    expect(result.source).toBe('expired_manual_grant');
  });

  it('maps legacy admin tier claims to Free entitlements', () => {
    expect(resolveTierFromUserDocument(null, 'admin').tier).toBe('free');
  });
});
