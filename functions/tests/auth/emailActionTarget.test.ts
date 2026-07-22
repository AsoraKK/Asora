import {
  parseEmailActionTarget,
  resolveEmailActionOrigin,
} from '../../src/auth/service/emailActionTarget';

describe('email action targets', () => {
  beforeEach(() => {
    process.env.APP_ORIGIN = 'https://app.lythaus.co';
    process.env.AUTH_EMAIL_PREVIEW_ORIGIN = 'https://e46064a9.lythaus-web.pages.dev';
  });

  afterEach(() => {
    delete process.env.APP_ORIGIN;
    delete process.env.AUTH_EMAIL_PREVIEW_ORIGIN;
  });

  it('maps only server-owned production and preview targets', () => {
    expect(parseEmailActionTarget('production')).toBe('production');
    expect(parseEmailActionTarget('preview')).toBe('preview');
    expect(resolveEmailActionOrigin('production')).toBe('https://app.lythaus.co');
    expect(resolveEmailActionOrigin('preview')).toBe('https://e46064a9.lythaus-web.pages.dev');
  });

  it('rejects raw origins and unsafe preview configuration', () => {
    expect(() => parseEmailActionTarget('https://attacker.example')).toThrow(/action_target/);
    process.env.AUTH_EMAIL_PREVIEW_ORIGIN = 'https://lythaus-web.pages.dev';
    expect(() => resolveEmailActionOrigin('preview')).toThrow(/AUTH_EMAIL_PREVIEW_ORIGIN/);
  });
});
