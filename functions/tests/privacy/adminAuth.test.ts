import { AuthError } from '@auth/verifyJwt';
import { ensurePrivacyAdmin } from '../../src/privacy/common/authz';

describe('ensurePrivacyAdmin', () => {
  it('throws when principal is missing', () => {
    expect(() => ensurePrivacyAdmin(undefined)).toThrow(AuthError);
  });

  it('throws when principal lacks the privacy_admin role', () => {
    expect(() =>
      ensurePrivacyAdmin({
        roles: ['user_admin'],
      } as any)
    ).toThrow(AuthError);
  });

  it('accepts principals with the privacy_admin role string', () => {
    expect(() =>
      ensurePrivacyAdmin({
        roles: 'privacy_admin',
      } as any)
    ).not.toThrow();
  });

  it('accepts principals with the privacy_admin role in an array', () => {
    expect(() =>
      ensurePrivacyAdmin({
        roles: ['reader', 'privacy_admin'],
      } as any)
    ).not.toThrow();
  });
});