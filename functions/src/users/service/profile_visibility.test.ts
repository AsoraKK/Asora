import {
  isTrustPassportVisibility,
  resolveTrustPassportVisibility,
} from './profileService';

describe('profile trust passport visibility helpers', () => {
  it('accepts all supported visibility enum values', () => {
    expect(isTrustPassportVisibility('public_expanded')).toBe(true);
    expect(isTrustPassportVisibility('public_minimal')).toBe(true);
    expect(isTrustPassportVisibility('private')).toBe(true);
  });

  it('rejects unsupported visibility values', () => {
    expect(isTrustPassportVisibility(undefined)).toBe(false);
    expect(isTrustPassportVisibility('friends_only')).toBe(false);
  });

  it('resolves default visibility when setting is absent or invalid', () => {
    expect(resolveTrustPassportVisibility()).toBe('public_minimal');
    expect(resolveTrustPassportVisibility({})).toBe('public_minimal');
    expect(
      resolveTrustPassportVisibility({
        trustPassportVisibility: 'invalid',
      })
    ).toBe('public_minimal');
  });

  it('resolves configured visibility when valid', () => {
    expect(
      resolveTrustPassportVisibility({
        trustPassportVisibility: 'public_expanded',
      })
    ).toBe('public_expanded');
  });
});
