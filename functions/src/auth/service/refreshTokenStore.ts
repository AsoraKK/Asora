/**
 * Refresh Token Store
 *
 * Manages refresh tokens in Postgres for rotation security.
 * Each refresh token is stored with its jti (JWT ID) as the primary key.
 * On rotation, the old token is deleted and a new one is created.
 * Reuse of an old token fails validation → signals potential compromise.
 */

import { getPool } from '@shared/clients/postgres';
import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('auth/refreshTokenStore');

export interface RefreshTokenRecord {
  jti: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Store a new refresh token in the database.
 */
export async function storeRefreshToken(
  jti: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  const pool = getPool();

  await pool.query(
    `INSERT INTO refresh_tokens (jti, user_uuid, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, userId, expiresAt]
  );

  logger.info('Refresh token stored', { jti: jti.slice(0, 8), userId: userId.slice(0, 8) });
}

/**
 * Validate that a refresh token exists and is not expired.
 * Returns the token record if valid, null otherwise.
 */
export async function validateRefreshToken(jti: string): Promise<RefreshTokenRecord | null> {
  const pool = getPool();

  const result = await pool.query<{
    jti: string;
    user_uuid: string;
    expires_at: Date;
    created_at: Date;
  }>(
    `SELECT jti, user_uuid, expires_at, created_at
     FROM refresh_tokens
     WHERE jti = $1 AND expires_at > NOW()`,
    [jti]
  );

  if (result.rows.length === 0) {
    logger.warn('Refresh token not found or expired', { jti: jti.slice(0, 8) });
    return null;
  }

  const row = result.rows[0]!; // Length checked above
  return {
    jti: row.jti,
    userId: row.user_uuid,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Revoke (delete) a refresh token.
 * Called during rotation to invalidate the old token.
 */
export async function revokeRefreshToken(jti: string): Promise<boolean> {
  const pool = getPool();

  const result = await pool.query(
    `DELETE FROM refresh_tokens WHERE jti = $1`,
    [jti]
  );

  const deleted = (result.rowCount ?? 0) > 0;
  if (deleted) {
    logger.info('Refresh token revoked', { jti: jti.slice(0, 8) });
  }

  return deleted;
}

/**
 * Revoke all refresh tokens for a user.
 * Useful for logout-all or account compromise scenarios.
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  const pool = getPool();

  const result = await pool.query(
    `DELETE FROM refresh_tokens WHERE user_uuid = $1`,
    [userId]
  );

  const count = result.rowCount ?? 0;
  logger.info('All user refresh tokens revoked', { userId: userId.slice(0, 8), count });

  return count;
}

/**
 * Clean up expired refresh tokens.
 * Should be called periodically (e.g., via a timer trigger).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const pool = getPool();

  const result = await pool.query(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
  );

  const count = result.rowCount ?? 0;
  if (count > 0) {
    logger.info('Expired refresh tokens cleaned up', { count });
  }

  return count;
}

/**
 * Rotate a refresh token: revoke old, issue new.
 * Returns the new jti that was stored.
 */
export async function rotateRefreshToken(
  oldJti: string,
  newJti: string,
  userId: string,
  expiresAt: Date
): Promise<string> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete old token
    await client.query('DELETE FROM refresh_tokens WHERE jti = $1', [oldJti]);

    // Insert new token
    await client.query(
      `INSERT INTO refresh_tokens (jti, user_uuid, expires_at)
       VALUES ($1, $2, $3)`,
      [newJti, userId, expiresAt]
    );

    await client.query('COMMIT');

    logger.info('Refresh token rotated', {
      oldJti: oldJti.slice(0, 8),
      newJti: newJti.slice(0, 8),
      userId: userId.slice(0, 8),
    });

    return newJti;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
