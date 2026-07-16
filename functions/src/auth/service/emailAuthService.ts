import * as crypto from 'node:crypto';
import * as argon2 from 'argon2';
import { v7 as uuidv7 } from 'uuid';

import { getCosmosClient } from '@shared/clients/cosmos';
import { getPool } from '@shared/clients/postgres';
import { issueTokenPairForUser, type IssuedTokenPair } from './tokenService';
import { getAuthEmailSender, type AuthEmailSender } from './authEmailClient';

const VERIFY_TTL_MS = 30 * 60 * 1000;
const RESET_TTL_MS = 20 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let dummyHashPromise: Promise<string> | undefined;

export class EmailAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

export interface EmailAuthDependencies {
  sender?: AuthEmailSender;
  now?: () => Date;
}

export interface EmailAuthAccepted {
  message: string;
}

export function normalizeEmailAddress(value: string): string {
  const normalized = value.trim().normalize('NFKC').toLowerCase();
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    throw new EmailAuthError('INVALID_REQUEST', 'Enter a valid email address');
  }
  return normalized;
}

export function validatePassword(value: string): void {
  if (value.length < 12 || value.length > 128) {
    throw new EmailAuthError('INVALID_REQUEST', 'Password must be between 12 and 128 characters');
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  if (classes < 3) {
    throw new EmailAuthError('INVALID_REQUEST', 'Password must use at least three character classes');
  }
}

function tokenHmacKey(): string {
  const value = process.env.EMAIL_TOKEN_HMAC_SECRET?.trim();
  if (!value) throw new Error('Missing EMAIL_TOKEN_HMAC_SECRET');
  return value;
}

function clientAudience(): string {
  const value = process.env.AUTH_EMAIL_CLIENT_ID?.trim() || process.env.JWT_AUDIENCE?.trim();
  if (!value) throw new Error('Missing AUTH_EMAIL_CLIENT_ID or JWT_AUDIENCE');
  return value;
}

function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function digestToken(token: string): string {
  return crypto.createHmac('sha256', tokenHmacKey()).update(token, 'utf8').digest('hex');
}

function dummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('Lythaus-auth-timing-only-2026!', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  return dummyHashPromise;
}

async function upsertCosmosUser(user: {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}): Promise<void> {
  const client = getCosmosClient();
  const database = client.database(process.env.COSMOS_DATABASE_NAME || 'asora');
  await database.container('users').items.upsert({
    id: user.id,
    partitionKey: user.id,
    email: user.email,
    role: 'user',
    tier: 'free',
    reputationScore: 0,
    createdAt: user.createdAt,
    lastLoginAt: user.createdAt,
    isActive: user.isActive,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      publicProfile: true,
      allowDirectMessages: true,
    },
  });
}

async function patchCosmosUser(
  userId: string,
  operations: Array<{ op: 'add' | 'replace'; path: string; value: unknown }>
): Promise<void> {
  const client = getCosmosClient();
  const database = client.database(process.env.COSMOS_DATABASE_NAME || 'asora');
  await database.container('users').item(userId, userId).patch(operations);
}

export class EmailAuthService {
  private readonly sender: AuthEmailSender;
  private readonly now: () => Date;

  constructor(dependencies: EmailAuthDependencies = {}) {
    this.sender = dependencies.sender || getAuthEmailSender();
    this.now = dependencies.now || (() => new Date());
  }

  async register(email: string, password: string): Promise<EmailAuthAccepted> {
    const normalizedEmail = normalizeEmailAddress(email);
    validatePassword(password);
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const token = randomToken();
    const tokenDigest = digestToken(token);
    const now = this.now();
    const userId = uuidv7();
    const client = await getPool().connect();
    let created = false;

    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT user_id FROM email_auth_credentials WHERE email_normalized = $1 FOR UPDATE`,
        [normalizedEmail]
      );
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO users (id, primary_email, roles, tier, reputation_score, created_at, updated_at)
           VALUES ($1, $2, $3, 'free', 0, $4, $4)`,
          [userId, normalizedEmail, ['user'], now]
        );
        await client.query(
          `INSERT INTO email_auth_credentials
             (user_id, email_normalized, password_hash, password_changed_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $4, $4)`,
          [userId, normalizedEmail, passwordHash, now]
        );
        await client.query(
          `INSERT INTO email_auth_tokens (id, user_id, purpose, token_digest, expires_at, created_at)
           VALUES ($1, $2, 'verify_email', $3, $4, $5)`,
          [crypto.randomUUID(), userId, tokenDigest, new Date(now.getTime() + VERIFY_TTL_MS), now]
        );
        created = true;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (created) await this.sender.sendVerification(normalizedEmail, token);
    return { message: 'If the address can be registered, a verification email will be sent.' };
  }

  async resendVerification(email: string): Promise<EmailAuthAccepted> {
    const normalizedEmail = normalizeEmailAddress(email);
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.user_id, c.email_verified_at, t.created_at AS last_sent_at
       FROM email_auth_credentials c
       LEFT JOIN LATERAL (
         SELECT created_at FROM email_auth_tokens
         WHERE user_id = c.user_id AND purpose = 'verify_email'
         ORDER BY created_at DESC LIMIT 1
       ) t ON TRUE
       WHERE c.email_normalized = $1`,
      [normalizedEmail]
    );
    const row = result.rows[0];
    const now = this.now();
    if (
      !row ||
      row.email_verified_at ||
      (row.last_sent_at && now.getTime() - new Date(row.last_sent_at).getTime() < RESEND_COOLDOWN_MS)
    ) {
      return { message: 'If the address is eligible, a verification email will be sent.' };
    }

    const token = randomToken();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE email_auth_tokens SET used_at = $1
         WHERE user_id = $2 AND purpose = 'verify_email' AND used_at IS NULL`,
        [now, row.user_id]
      );
      await client.query(
        `INSERT INTO email_auth_tokens (id, user_id, purpose, token_digest, expires_at, created_at)
         VALUES ($1, $2, 'verify_email', $3, $4, $5)`,
        [crypto.randomUUID(), row.user_id, digestToken(token), new Date(now.getTime() + VERIFY_TTL_MS), now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await this.sender.sendVerification(normalizedEmail, token);
    return { message: 'If the address is eligible, a verification email will be sent.' };
  }

  async verifyEmail(token: string): Promise<EmailAuthAccepted> {
    if (!token || token.length > 256) {
      throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid');
    }
    const client = await getPool().connect();
    const now = this.now();
    const digest = digestToken(token);
    let verifiedUser: { id: string; email: string; createdAt: string } | undefined;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT t.user_id, u.primary_email, u.created_at
         FROM email_auth_tokens t JOIN users u ON u.id = t.user_id
         WHERE t.token_digest = $1 AND t.purpose = 'verify_email' AND t.used_at IS NULL AND t.expires_at > $2
         FOR UPDATE`,
        [digest, now]
      );
      if (result.rowCount !== 1) {
        throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid or expired');
      }
      const userId = result.rows[0].user_id as string;
      await client.query(`UPDATE email_auth_tokens SET used_at = $1 WHERE token_digest = $2`, [now, digest]);
      await client.query(
        `UPDATE email_auth_credentials SET email_verified_at = $1, updated_at = $1 WHERE user_id = $2`,
        [now, userId]
      );
      verifiedUser = {
        id: userId,
        email: result.rows[0].primary_email,
        createdAt: new Date(result.rows[0].created_at).toISOString(),
      };
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (!verifiedUser) throw new Error('Verified email user was not loaded');
    await upsertCosmosUser({
      id: verifiedUser.id,
      email: verifiedUser.email,
      isActive: true,
      createdAt: verifiedUser.createdAt,
    });
    return { message: 'Email verified. You can now sign in.' };
  }

  async login(email: string, password: string): Promise<IssuedTokenPair> {
    const normalizedEmail = normalizeEmailAddress(email);
    if (!password || password.length > 128) {
      throw new EmailAuthError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
    }
    const pool = getPool();
    const result = await pool.query(
      `SELECT c.user_id, c.password_hash, c.email_verified_at, c.failed_login_count, c.locked_until,
              u.primary_email, u.roles, u.tier, u.reputation_score, u.created_at
       FROM email_auth_credentials c JOIN users u ON u.id = c.user_id
       WHERE c.email_normalized = $1`,
      [normalizedEmail]
    );
    const row = result.rows[0];
    const validPassword = await argon2.verify(row?.password_hash || (await dummyHash()), password);
    const now = this.now();
    const locked = row?.locked_until && new Date(row.locked_until) > now;
    if (!row || !validPassword || locked) {
      if (row && !locked) {
        const failures = Number(row.failed_login_count || 0) + 1;
        await pool.query(
          `UPDATE email_auth_credentials
           SET failed_login_count = $1, locked_until = $2, updated_at = $3 WHERE user_id = $4`,
          [failures, failures >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCKOUT_MS) : null, now, row.user_id]
        );
      }
      throw new EmailAuthError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
    }
    if (!row.email_verified_at) {
      throw new EmailAuthError('EMAIL_NOT_VERIFIED', 'Verify your email before signing in', 403);
    }

    await pool.query(
      `UPDATE email_auth_credentials SET failed_login_count = 0, locked_until = NULL, updated_at = $1
       WHERE user_id = $2`,
      [now, row.user_id]
    );
    await patchCosmosUser(row.user_id, [
      { op: 'replace', path: '/lastLoginAt', value: now.toISOString() },
    ]);
    return issueTokenPairForUser(
      {
        id: row.user_id,
        email: row.primary_email,
        roles: row.roles,
        tier: row.tier,
        reputationScore: Number(row.reputation_score || 0),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : now.toISOString(),
        lastLoginAt: now.toISOString(),
      },
      clientAudience()
    );
  }

  async forgotPassword(email: string): Promise<EmailAuthAccepted> {
    const normalizedEmail = normalizeEmailAddress(email);
    const pool = getPool();
    const result = await pool.query(
      `SELECT user_id FROM email_auth_credentials
       WHERE email_normalized = $1 AND email_verified_at IS NOT NULL`,
      [normalizedEmail]
    );
    const row = result.rows[0];
    if (!row) {
      return { message: 'If the account exists, a password reset email will be sent.' };
    }
    const token = randomToken();
    const now = this.now();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE email_auth_tokens SET used_at = $1
         WHERE user_id = $2 AND purpose = 'reset_password' AND used_at IS NULL`,
        [now, row.user_id]
      );
      await client.query(
        `INSERT INTO email_auth_tokens (id, user_id, purpose, token_digest, expires_at, created_at)
         VALUES ($1, $2, 'reset_password', $3, $4, $5)`,
        [crypto.randomUUID(), row.user_id, digestToken(token), new Date(now.getTime() + RESET_TTL_MS), now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await this.sender.sendPasswordReset(normalizedEmail, token);
    return { message: 'If the account exists, a password reset email will be sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<EmailAuthAccepted> {
    if (!token || token.length > 256) {
      throw new EmailAuthError('INVALID_TOKEN', 'Reset link is invalid');
    }
    validatePassword(newPassword);
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const now = this.now();
    const digest = digestToken(token);
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT user_id FROM email_auth_tokens
         WHERE token_digest = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > $2
         FOR UPDATE`,
        [digest, now]
      );
      if (result.rowCount !== 1) {
        throw new EmailAuthError('INVALID_TOKEN', 'Reset link is invalid or expired');
      }
      const userId = result.rows[0].user_id as string;
      await client.query(`UPDATE email_auth_tokens SET used_at = $1 WHERE token_digest = $2`, [now, digest]);
      await client.query(
        `UPDATE email_auth_credentials SET password_hash = $1, password_changed_at = $2,
           failed_login_count = 0, locked_until = NULL, updated_at = $2 WHERE user_id = $3`,
        [passwordHash, now, userId]
      );
      await client.query(`DELETE FROM refresh_tokens WHERE user_uuid = $1`, [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { message: 'Password reset. Sign in with your new password.' };
  }
}
