const query = jest.fn();
const connect = jest.fn();
const release = jest.fn();
const cosmosUpsert = jest.fn();
const cosmosPatch = jest.fn();
const issueTokenPairForUser = jest.fn();
const argonHash = jest.fn();
const argonVerify = jest.fn();

jest.mock('@shared/clients/postgres', () => ({
  getPool: () => ({ query, connect }),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: () => ({
    database: () => ({
      container: () => ({
        items: { upsert: cosmosUpsert },
        item: () => ({ patch: cosmosPatch }),
      }),
    }),
  }),
}));

jest.mock('@auth/service/tokenService', () => ({
  issueTokenPairForUser: (...args: unknown[]) => issueTokenPairForUser(...args),
}));

jest.mock('argon2', () => ({
  argon2id: 2,
  hash: (...args: unknown[]) => argonHash(...args),
  verify: (...args: unknown[]) => argonVerify(...args),
}));

import {
  EmailAuthError,
  EmailAuthService,
  normalizeEmailAddress,
  validatePassword,
  verificationTokenTtlMs,
} from '../../src/auth/service/emailAuthService';
import type { AuthEmailSender } from '../../src/auth/service/authEmailClient';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const USER_ID = '0190f4b8-5800-7000-8000-000000000001';

function clientWith(results: Array<{ rowCount?: number; rows?: unknown[] }> = []) {
  let index = 0;
  return {
    query: jest.fn(async () => results[index++] || { rowCount: 1, rows: [] }),
    release,
  };
}

function sender(): jest.Mocked<AuthEmailSender> {
  return {
    sendVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
}

describe('EmailAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_TOKEN_HMAC_SECRET = 'test-only-hmac-secret-with-sufficient-length';
    process.env.AUTH_EMAIL_CLIENT_ID = 'lythaus-test-client';
    delete process.env.EMAIL_VERIFICATION_TTL_MINUTES;
    argonHash.mockResolvedValue('$argon2id$test-hash');
    argonVerify.mockResolvedValue(true);
    cosmosUpsert.mockResolvedValue({});
    cosmosPatch.mockResolvedValue({});
    issueTokenPairForUser.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'read write',
      user: { id: USER_ID, email: 'person@example.com', role: 'user', roles: ['user'], tier: 'free', reputationScore: 0 },
    });
  });

  it('normalizes email consistently', () => {
    expect(normalizeEmailAddress('  Person@Example.COM ')).toBe('person@example.com');
    expect(() => normalizeEmailAddress('not-an-email')).toThrow(EmailAuthError);
  });

  it('enforces the MVP password policy', () => {
    expect(() => validatePassword('short')).toThrow('between 12 and 128');
    expect(() => validatePassword('alllowercasebutlong')).toThrow('three character classes');
    expect(() => validatePassword('ValidPassword-2026')).not.toThrow();
  });

  it('uses a bounded verification-token lifetime', () => {
    expect(verificationTokenTtlMs()).toBe(120 * 60 * 1000);

    process.env.EMAIL_VERIFICATION_TTL_MINUTES = '90';
    expect(verificationTokenTtlMs()).toBe(90 * 60 * 1000);

    process.env.EMAIL_VERIFICATION_TTL_MINUTES = '29';
    expect(() => verificationTokenTtlMs()).toThrow(/between 30 and 240/);

    process.env.EMAIL_VERIFICATION_TTL_MINUTES = '120.5';
    expect(() => verificationTokenTtlMs()).toThrow(/whole number/);
  });

  it('registers with Argon2id, hashed verification token, and neutral response', async () => {
    const db = clientWith();
    db.query.mockImplementation(async (sql) =>
      String(sql).includes('SELECT user_id FROM email_auth_credentials') ||
      String(sql).includes('SELECT id FROM users WHERE primary_email')
        ? { rows: [], rowCount: 0 }
        : { rows: [], rowCount: 1 }
    );
    connect.mockResolvedValue(db);
    const mail = sender();
    const service = new EmailAuthService({ sender: mail, now: () => NOW });

    const result = await service.register('Person@Example.com', 'ValidPassword-2026');

    expect(result.message).not.toContain('person@example.com');
    expect(argonHash).toHaveBeenCalledWith(
      'ValidPassword-2026',
      expect.objectContaining({ type: 2, memoryCost: 19456 })
    );
    expect(mail.sendVerification).toHaveBeenCalledTimes(1);
    expect(mail.sendVerification.mock.calls[0]?.[1]).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    const insertTokenCall = db.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO email_auth_tokens'));
    expect(insertTokenCall?.[1]?.[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(insertTokenCall?.[1]?.[2]).not.toBe(mail.sendVerification.mock.calls[0]?.[1]);
    expect(insertTokenCall?.[1]?.[3]).toEqual(new Date('2026-07-16T14:00:00.000Z'));
    expect(cosmosUpsert).not.toHaveBeenCalled();
  });

  it('applies the configured lifetime to a resent verification token', async () => {
    process.env.EMAIL_VERIFICATION_TTL_MINUTES = '90';
    query.mockResolvedValue({
      rows: [{ user_id: USER_ID, email_verified_at: null, last_sent_at: new Date(NOW.getTime() - 60_001) }],
      rowCount: 1,
    });
    const db = clientWith();
    connect.mockResolvedValue(db);
    const mail = sender();

    await new EmailAuthService({ sender: mail, now: () => NOW }).resendVerification('person@example.com');

    const insertTokenCall = db.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO email_auth_tokens'));
    expect(insertTokenCall?.[1]?.[3]).toEqual(new Date('2026-07-16T13:30:00.000Z'));
    expect(mail.sendVerification).toHaveBeenCalledTimes(1);
  });

  it('keeps duplicate registration neutral and does not send another email', async () => {
    const db = clientWith();
    db.query.mockImplementation(async (sql) =>
      String(sql).includes('SELECT user_id FROM email_auth_credentials')
        ? { rows: [{ user_id: USER_ID }], rowCount: 1 }
        : { rows: [], rowCount: 1 }
    );
    connect.mockResolvedValue(db);
    const mail = sender();
    const result = await new EmailAuthService({ sender: mail, now: () => NOW })
      .register('person@example.com', 'ValidPassword-2026');
    expect(result.message).toContain('If the address');
    expect(mail.sendVerification).not.toHaveBeenCalled();
  });

  it('keeps an existing non-email identity neutral without creating or merging an account', async () => {
    const db = clientWith();
    db.query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('SELECT user_id FROM email_auth_credentials')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('SELECT id FROM users WHERE primary_email')) {
        return { rows: [{ id: USER_ID }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    connect.mockResolvedValue(db);
    const mail = sender();

    const result = await new EmailAuthService({ sender: mail, now: () => NOW })
      .register('person@example.com', 'ValidPassword-2026');

    expect(result.message).toContain('If the address');
    expect(mail.sendVerification).not.toHaveBeenCalled();
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO users'))).toBe(false);
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO email_auth_credentials'))).toBe(false);
  });

  it('verifies only an unexpired single-use digest and activates the user', async () => {
    const db = clientWith([
      {},
      {
        rows: [{
          user_id: USER_ID,
          primary_email: 'person@example.com',
          created_at: NOW,
        }],
        rowCount: 1,
      },
    ]);
    connect.mockResolvedValue(db);
    await new EmailAuthService({ sender: sender(), now: () => NOW }).verifyEmail('verification-token');
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes("purpose = 'verify_email'"))).toBe(true);
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('SET used_at'))).toBe(true);
    expect(cosmosUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_ID, isActive: true })
    );
  });

  it('rejects invalid or replayed verification tokens neutrally', async () => {
    const db = clientWith([{}, { rows: [], rowCount: 0 }]);
    connect.mockResolvedValue(db);
    await expect(
      new EmailAuthService({ sender: sender(), now: () => NOW }).verifyEmail('replayed-token')
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('returns the same login error for missing users and wrong passwords', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    argonVerify.mockResolvedValue(false);
    const service = new EmailAuthService({ sender: sender(), now: () => NOW });
    await expect(service.login('missing@example.com', 'WrongPassword-2026'))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    expect(argonVerify).toHaveBeenCalled();
  });

  it('requires verification even when the password is correct', async () => {
    query.mockResolvedValue({
      rows: [{
        user_id: USER_ID,
        password_hash: '$argon2id$hash',
        email_verified_at: null,
        failed_login_count: 0,
        locked_until: null,
      }],
      rowCount: 1,
    });
    await expect(
      new EmailAuthService({ sender: sender(), now: () => NOW })
        .login('person@example.com', 'ValidPassword-2026')
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED', status: 403 });
  });

  it('issues the canonical access and rotating refresh pair after verified login', async () => {
    query.mockResolvedValue({
      rows: [{
        user_id: USER_ID,
        password_hash: '$argon2id$hash',
        email_verified_at: NOW,
        failed_login_count: 0,
        locked_until: null,
        primary_email: 'person@example.com',
        roles: ['user'],
        tier: 'free',
        reputation_score: 0,
      }],
      rowCount: 1,
    });
    await new EmailAuthService({ sender: sender(), now: () => NOW })
      .login('person@example.com', 'ValidPassword-2026');
    expect(issueTokenPairForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_ID, email: 'person@example.com' }),
      'lythaus-test-client'
    );
  });

  it('keeps unknown forgot-password requests neutral', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    const mail = sender();
    const result = await new EmailAuthService({ sender: mail, now: () => NOW })
      .forgotPassword('missing@example.com');
    expect(result.message).toContain('If the account exists');
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('resets the password once and revokes all refresh sessions', async () => {
    const db = clientWith([{}, { rows: [{ user_id: USER_ID }], rowCount: 1 }]);
    connect.mockResolvedValue(db);
    await new EmailAuthService({ sender: sender(), now: () => NOW })
      .resetPassword('reset-token', 'NewValidPassword-2026!');
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('password_hash'))).toBe(true);
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM refresh_tokens'))).toBe(true);
    expect(db.query.mock.calls.some(([sql]) => String(sql).includes('SET used_at'))).toBe(true);
  });
});
