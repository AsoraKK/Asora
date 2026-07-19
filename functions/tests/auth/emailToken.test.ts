import {
  deliveryRecipientReference,
  issueEmailToken,
  parseVersionedEmailToken,
  tokenDigestMatches,
  validateEmailTokenKeyConfiguration,
} from '../../src/auth/service/emailToken';

describe('email token v2', () => {
  beforeEach(() => {
    process.env.EMAIL_TOKEN_HMAC_SECRET = 'current-email-token-hmac-secret-with-at-least-32-characters';
    process.env.EMAIL_TOKEN_HMAC_KEY_ID = 'email-2026-07';
    delete process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS;
    delete process.env.EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID;
  });

  afterEach(() => {
    delete process.env.EMAIL_TOKEN_HMAC_SECRET;
    delete process.env.EMAIL_TOKEN_HMAC_KEY_ID;
    delete process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS;
    delete process.env.EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID;
  });

  it('issues a versioned purpose-bound token whose stored digest can be verified', () => {
    const issued = issueEmailToken('verify_email');
    const parsed = parseVersionedEmailToken(issued.token);

    expect(parsed).not.toBeNull();
    expect(tokenDigestMatches(issued.digest, 'verify_email', parsed!)).toBe(true);
    expect(tokenDigestMatches(issued.digest, 'reset_password', parsed!)).toBe(false);
  });

  it('rejects malformed and tampered token envelopes', () => {
    const issued = issueEmailToken('verify_email');
    expect(parseVersionedEmailToken('not-a-token')).toBeNull();
    expect(parseVersionedEmailToken(`${issued.token}x`)).toBeNull();

    const parsed = parseVersionedEmailToken(issued.token)!;
    expect(tokenDigestMatches(`${issued.digest.slice(0, -1)}0`, 'verify_email', parsed)).toBe(false);
  });

  it('derives an independent delivery recipient reference without exposing an email', () => {
    const reference = deliveryRecipientReference('person@example.test');
    expect(reference).toMatch(/^[a-f0-9]{64}$/);
    expect(reference).not.toContain('person@example.test');
  });

  it('rejects duplicate current and previous key material', () => {
    process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS = process.env.EMAIL_TOKEN_HMAC_SECRET;
    expect(validateEmailTokenKeyConfiguration()).toMatch(/must differ/);
  });

  it('continues to validate a prior key identifier during a bounded rotation', () => {
    const issued = issueEmailToken('verify_email');
    const parsed = parseVersionedEmailToken(issued.token)!;

    process.env.EMAIL_TOKEN_HMAC_SECRET_PREVIOUS = process.env.EMAIL_TOKEN_HMAC_SECRET;
    process.env.EMAIL_TOKEN_HMAC_PREVIOUS_KEY_ID = 'email-2026-07';
    process.env.EMAIL_TOKEN_HMAC_SECRET = 'next-email-token-hmac-secret-with-at-least-32-characters';
    process.env.EMAIL_TOKEN_HMAC_KEY_ID = 'email-2026-08';

    expect(tokenDigestMatches(issued.digest, 'verify_email', parsed)).toBe(true);
    expect(tokenDigestMatches(issued.digest, 'reset_password', parsed)).toBe(false);
  });

  it('rejects a key identifier that is not configured', () => {
    const issued = issueEmailToken('verify_email');
    const parsed = parseVersionedEmailToken(issued.token)!;
    process.env.EMAIL_TOKEN_HMAC_KEY_ID = 'email-2026-08';

    expect(tokenDigestMatches(issued.digest, 'verify_email', parsed)).toBe(false);
  });
});
