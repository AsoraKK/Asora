import * as crypto from 'node:crypto';
import * as argon2 from 'argon2';
import { v7 as uuidv7 } from 'uuid';

import { getCosmosClient } from '@shared/clients/cosmos';
import { getPool } from '@shared/clients/postgres';
import { issueTokenPairForUser, type IssuedTokenPair } from './tokenService';
import { getAuthEmailSender, type AuthEmailSender } from './authEmailClient';
import { parseEmailActionTarget, type EmailActionTarget } from './emailActionTarget';
import {
  deliveryRecipientReference,
  issueEmailToken,
  legacyTokenDigest,
  parseVersionedEmailToken,
  tokenDigestMatches,
  type EmailTokenPurpose,
} from './emailToken';

const DEFAULT_VERIFY_TTL_MINUTES = 120;
const MIN_VERIFY_TTL_MINUTES = 30;
const MAX_VERIFY_TTL_MINUTES = 240;
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
  status?: 'verified' | 'already_verified';
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

export function verificationTokenTtlMs(): number {
  const configured = process.env.EMAIL_VERIFICATION_TTL_MINUTES?.trim();
  if (!configured) return DEFAULT_VERIFY_TTL_MINUTES * 60 * 1000;

  if (!/^\d+$/.test(configured)) {
    throw new Error('EMAIL_VERIFICATION_TTL_MINUTES must be a whole number between 30 and 240');
  }

  const minutes = Number(configured);
  if (minutes < MIN_VERIFY_TTL_MINUTES || minutes > MAX_VERIFY_TTL_MINUTES) {
    throw new Error('EMAIL_VERIFICATION_TTL_MINUTES must be a whole number between 30 and 240');
  }

  return minutes * 60 * 1000;
}

export function emailVerificationV2IssuanceEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_V2_ISSUANCE_ENABLED?.trim().toLowerCase() === 'true';
}

function requireEmailVerificationV2Issuance(): void {
  if (!emailVerificationV2IssuanceEnabled()) {
    throw new EmailAuthError(
      'EMAIL_VERIFICATION_UNAVAILABLE',
      'Email verification is temporarily unavailable. Please try again shortly.',
      503
    );
  }
}

function clientAudience(): string {
  const value = process.env.AUTH_EMAIL_CLIENT_ID?.trim() || process.env.JWT_AUDIENCE?.trim();
  if (!value) throw new Error('Missing AUTH_EMAIL_CLIENT_ID or JWT_AUDIENCE');
  return value;
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

  private actionTarget(value: unknown): EmailActionTarget {
    try {
      return parseEmailActionTarget(value);
    } catch {
      throw new EmailAuthError('INVALID_REQUEST', 'Choose a supported verification destination');
    }
  }

  private async recordDeliveryState(
    tokenId: string,
    state: 'send_submitted' | 'accepted' | 'failed',
    providerMessageId: string | null = null
  ): Promise<void> {
    await getPool().query(
      `UPDATE email_auth_deliveries
       SET state = $2, provider_message_id = COALESCE($3, provider_message_id), updated_at = NOW()
       WHERE token_id = $1`,
      [tokenId, state, providerMessageId]
    );
  }

  private async revokePreparedToken(tokenId: string): Promise<void> {
    const now = this.now();
    await getPool().query(
      `UPDATE email_auth_tokens SET revoked_at = $2
       WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
      [tokenId, now]
    );
    await this.recordDeliveryState(tokenId, 'failed');
  }

  private async deliverVerification(
    email: string,
    token: string,
    tokenId: string,
    actionTarget: EmailActionTarget
  ): Promise<void> {
    await this.recordDeliveryState(tokenId, 'send_submitted');
    try {
      const receipt = await this.sender.sendVerification(email, token, actionTarget);
      await this.recordDeliveryState(tokenId, 'accepted', receipt.providerMessageId);
    } catch {
      await this.revokePreparedToken(tokenId);
      throw new EmailAuthError(
        'EMAIL_DELIVERY_UNAVAILABLE',
        'Verification email delivery is temporarily unavailable. Please try again shortly.',
        503
      );
    }
  }

  private async deliverPasswordReset(
    email: string,
    token: string,
    tokenId: string,
    actionTarget: EmailActionTarget
  ): Promise<void> {
    await this.recordDeliveryState(tokenId, 'send_submitted');
    try {
      const receipt = await this.sender.sendPasswordReset(email, token, actionTarget);
      await this.recordDeliveryState(tokenId, 'accepted', receipt.providerMessageId);
    } catch {
      await this.revokePreparedToken(tokenId);
      throw new EmailAuthError(
        'EMAIL_DELIVERY_UNAVAILABLE',
        'Password reset email delivery is temporarily unavailable. Please try again shortly.',
        503
      );
    }
  }

  async register(email: string, password: string, actionTargetValue: unknown): Promise<EmailAuthAccepted> {
    requireEmailVerificationV2Issuance();
    const normalizedEmail = normalizeEmailAddress(email);
    validatePassword(password);
    const actionTarget = this.actionTarget(actionTargetValue);
    const verificationTtlMs = verificationTokenTtlMs();
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const issuedToken = issueEmailToken('verify_email');
    const now = this.now();
    const userId = uuidv7();
    const client = await getPool().connect();
    let preparedTokenId: string | undefined;

    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT user_id FROM email_auth_credentials WHERE email_normalized = $1 FOR UPDATE`,
        [normalizedEmail]
      );
      const existingUser = existing.rowCount === 0
        ? await client.query(
            `SELECT id FROM users WHERE primary_email = $1 FOR UPDATE`,
            [normalizedEmail]
          )
        : null;
      if (existing.rowCount === 0 && existingUser?.rowCount === 0) {
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
          `INSERT INTO email_auth_tokens
             (id, user_id, purpose, token_digest, key_id, action_target, expires_at, created_at)
           VALUES ($1, $2, 'verify_email', $3, $4, $5, $6, $7)`,
          [
            issuedToken.id,
            userId,
            issuedToken.digest,
            issuedToken.keyId,
            actionTarget,
            new Date(now.getTime() + verificationTtlMs),
            now,
          ]
        );
        await client.query(
          `INSERT INTO email_auth_deliveries
             (id, token_id, message_class, recipient_ref, state, created_at, updated_at)
           VALUES ($1, $2, 'verification', $3, 'created', $4, $4)`,
          [crypto.randomUUID(), issuedToken.id, deliveryRecipientReference(normalizedEmail), now]
        );
        preparedTokenId = issuedToken.id;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (preparedTokenId) {
      await this.deliverVerification(normalizedEmail, issuedToken.token, preparedTokenId, actionTarget);
    }
    return { message: 'If the address can be registered, a verification email will be sent.' };
  }

  async resendVerification(email: string, actionTargetValue: unknown): Promise<EmailAuthAccepted> {
    requireEmailVerificationV2Issuance();
    const normalizedEmail = normalizeEmailAddress(email);
    const actionTarget = this.actionTarget(actionTargetValue);
    const verificationTtlMs = verificationTokenTtlMs();
    const pool = getPool();
    const now = this.now();
    const issuedToken = issueEmailToken('verify_email');
    const client = await pool.connect();
    let preparedTokenId: string | undefined;
    try {
      await client.query('BEGIN');
      const credential = await client.query(
        `SELECT user_id, email_verified_at
         FROM email_auth_credentials WHERE email_normalized = $1 FOR UPDATE`,
        [normalizedEmail]
      );
      const row = credential.rows[0] as { user_id: string; email_verified_at: Date | null } | undefined;
      if (!row || row.email_verified_at) {
        await client.query('COMMIT');
        return { message: 'If the address is eligible, a verification email will be sent.' };
      }
      const tokenState = await client.query(
        `SELECT COUNT(*) FILTER (WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > $2) AS active_count,
                MAX(created_at) AS last_sent_at
         FROM email_auth_tokens
         WHERE user_id = $1 AND purpose = 'verify_email'`,
        [row.user_id, now]
      );
      const activeCount = Number(tokenState.rows[0]?.active_count || 0);
      const lastSentAt = tokenState.rows[0]?.last_sent_at as Date | null | undefined;
      if (
        activeCount >= 2 ||
        (lastSentAt && now.getTime() - new Date(lastSentAt).getTime() < RESEND_COOLDOWN_MS)
      ) {
        await client.query('COMMIT');
        return { message: 'A verification email was recently sent. Check your two most recent Lythaus verification messages.' };
      }
      await client.query(
        `INSERT INTO email_auth_tokens
           (id, user_id, purpose, token_digest, key_id, action_target, expires_at, created_at)
         VALUES ($1, $2, 'verify_email', $3, $4, $5, $6, $7)`,
        [
          issuedToken.id,
          row.user_id,
          issuedToken.digest,
          issuedToken.keyId,
          actionTarget,
          new Date(now.getTime() + verificationTtlMs),
          now,
        ]
      );
      await client.query(
        `INSERT INTO email_auth_deliveries
           (id, token_id, message_class, recipient_ref, state, created_at, updated_at)
         VALUES ($1, $2, 'verification', $3, 'created', $4, $4)`,
        [crypto.randomUUID(), issuedToken.id, deliveryRecipientReference(normalizedEmail), now]
      );
      preparedTokenId = issuedToken.id;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    if (preparedTokenId) {
      await this.deliverVerification(normalizedEmail, issuedToken.token, preparedTokenId, actionTarget);
    }
    return { message: 'If the address is eligible, a verification email will be sent.' };
  }

  async verifyEmail(token: string): Promise<EmailAuthAccepted> {
    if (!token || token.length > 256) {
      throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid');
    }
    const client = await getPool().connect();
    const now = this.now();
    const versioned = parseVersionedEmailToken(token);
    const legacyDigest = versioned ? null : legacyTokenDigest(token);
    try {
      await client.query('BEGIN');
      const result = versioned
        ? await client.query(
            `SELECT t.id, t.user_id, t.token_digest, t.key_id, t.used_at, t.revoked_at, t.expires_at,
                    c.email_verified_at
             FROM email_auth_tokens t JOIN email_auth_credentials c ON c.user_id = t.user_id
             WHERE t.id = $1 AND t.purpose = 'verify_email' FOR UPDATE`,
            [versioned.id]
          )
        : await client.query(
            `SELECT t.id, t.user_id, t.token_digest, t.key_id, t.used_at, t.revoked_at, t.expires_at,
                    c.email_verified_at
             FROM email_auth_tokens t JOIN email_auth_credentials c ON c.user_id = t.user_id
             WHERE t.token_digest = $1 AND t.purpose = 'verify_email' FOR UPDATE`,
            [legacyDigest]
          );
      if (result.rowCount !== 1) {
        throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid or expired');
      }
      const row = result.rows[0] as {
        id: string;
        user_id: string;
        token_digest: string;
        key_id: string;
        used_at: Date | null;
        revoked_at: Date | null;
        expires_at: Date;
        email_verified_at: Date | null;
      };
      if (versioned && (row.key_id !== versioned.keyId || !tokenDigestMatches(row.token_digest, 'verify_email', versioned))) {
        throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid or expired');
      }
      if (row.email_verified_at) {
        await client.query('COMMIT');
        return { message: 'Email is already verified. You can now sign in.', status: 'already_verified' };
      }
      if (row.used_at || row.revoked_at || new Date(row.expires_at) <= now) {
        throw new EmailAuthError('INVALID_TOKEN', 'Verification link is invalid or expired');
      }
      await client.query(`UPDATE email_auth_tokens SET used_at = $1 WHERE id = $2`, [now, row.id]);
      await client.query(
        `UPDATE email_auth_credentials SET email_verified_at = $1, updated_at = $1 WHERE user_id = $2`,
        [now, row.user_id]
      );
      await client.query(
        `UPDATE email_auth_tokens SET revoked_at = $1
         WHERE user_id = $2 AND purpose = 'verify_email' AND id <> $3
           AND used_at IS NULL AND revoked_at IS NULL`,
        [now, row.user_id, row.id]
      );
      await client.query(
        `INSERT INTO auth_email_projection_outbox
           (id, aggregate_type, aggregate_id, event_type, schema_version, payload, created_at, next_attempt_at)
         VALUES ($1, 'user', $2, 'email_verified', 1, $3::jsonb, $4, $4)`,
        [crypto.randomUUID(), row.user_id, JSON.stringify({ user_id: row.user_id }), now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { message: 'Email verified. You can now sign in.', status: 'verified' };
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

  async forgotPassword(email: string, actionTargetValue: unknown): Promise<EmailAuthAccepted> {
    const normalizedEmail = normalizeEmailAddress(email);
    const actionTarget = this.actionTarget(actionTargetValue);
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
    const issuedToken = issueEmailToken('reset_password');
    const now = this.now();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE email_auth_tokens SET revoked_at = $1
         WHERE user_id = $2 AND purpose = 'reset_password' AND used_at IS NULL AND revoked_at IS NULL`,
        [now, row.user_id]
      );
      await client.query(
        `INSERT INTO email_auth_tokens
           (id, user_id, purpose, token_digest, key_id, action_target, expires_at, created_at)
         VALUES ($1, $2, 'reset_password', $3, $4, $5, $6, $7)`,
        [
          issuedToken.id,
          row.user_id,
          issuedToken.digest,
          issuedToken.keyId,
          actionTarget,
          new Date(now.getTime() + RESET_TTL_MS),
          now,
        ]
      );
      await client.query(
        `INSERT INTO email_auth_deliveries
           (id, token_id, message_class, recipient_ref, state, created_at, updated_at)
         VALUES ($1, $2, 'password_reset', $3, 'created', $4, $4)`,
        [crypto.randomUUID(), issuedToken.id, deliveryRecipientReference(normalizedEmail), now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await this.deliverPasswordReset(normalizedEmail, issuedToken.token, issuedToken.id, actionTarget);
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
    const versioned = parseVersionedEmailToken(token);
    const legacyDigest = versioned ? null : legacyTokenDigest(token);
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = versioned
        ? await client.query(
            `SELECT id, user_id, token_digest, key_id FROM email_auth_tokens
             WHERE id = $1 AND purpose = 'reset_password' AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $2
             FOR UPDATE`,
            [versioned.id, now]
          )
        : await client.query(
            `SELECT id, user_id, token_digest, key_id FROM email_auth_tokens
             WHERE token_digest = $1 AND purpose = 'reset_password' AND used_at IS NULL AND revoked_at IS NULL AND expires_at > $2
             FOR UPDATE`,
            [legacyDigest, now]
          );
      if (result.rowCount !== 1) {
        throw new EmailAuthError('INVALID_TOKEN', 'Reset link is invalid or expired');
      }
      const row = result.rows[0] as { id: string; user_id: string; token_digest: string; key_id: string };
      if (versioned && (row.key_id !== versioned.keyId || !tokenDigestMatches(row.token_digest, 'reset_password', versioned))) {
        throw new EmailAuthError('INVALID_TOKEN', 'Reset link is invalid or expired');
      }
      const userId = row.user_id;
      await client.query(`UPDATE email_auth_tokens SET used_at = $1 WHERE id = $2`, [now, row.id]);
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
