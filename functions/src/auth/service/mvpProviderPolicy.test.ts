import { classifyMvpAuthProvider, isMvpAuthProviderEnabled } from './mvpProviderPolicy';

describe('MVP authentication provider policy', () => {
  it.each([
    [undefined, 'email'],
    ['', 'email'],
    ['Google', 'google'],
    ['email', 'email'],
    ['Apple', 'apple'],
    ['World ID', 'world'],
    ['unknown-provider', 'unknown'],
  ] as const)('classifies %p as %s', (hint, expected) => {
    expect(classifyMvpAuthProvider(hint)).toBe(expected);
  });

  it('enables only Google and email for MVP', () => {
    expect(isMvpAuthProviderEnabled('Google')).toBe(true);
    expect(isMvpAuthProviderEnabled()).toBe(true);
    expect(isMvpAuthProviderEnabled('Apple')).toBe(false);
    expect(isMvpAuthProviderEnabled('World ID')).toBe(false);
    expect(isMvpAuthProviderEnabled('unknown-provider')).toBe(false);
  });
});
