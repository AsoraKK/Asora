import { PoolClient } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { withClient } from '@shared/clients/postgres';
import { isInternalUserId } from '@auth/verifyJwt';

export interface PGUser {
  id: string;
  primary_email: string;
  roles: string[];
  tier: string;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderLink {
  provider: string;
  provider_sub: string;
  user_id: string;
  created_at: string;
}

const VALID_PROVIDER_PATTERN = /^[a-z][a-z0-9-]*$/;

function normalizeProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Provider is required');
  }

  if (!VALID_PROVIDER_PATTERN.test(normalized)) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  return normalized;
}

export class ProviderAccountLinkRequiredError extends Error {
  constructor() {
    super('An existing account must be linked through an authenticated account-linking flow');
  }
}

function assertInternalUserId(userId: string, context: string): void {
  if (!isInternalUserId(userId)) {
    throw new Error(`${context} must be an internal UUIDv7 user ID`);
  }
}

class UsersService {
  /**
   * Get user by ID from PostgreSQL
   */
  async getUserById(userId: string): Promise<PGUser | null> {
    return withClient(async (client) => {
      const result = await client.query(
        `SELECT id, primary_email, roles, tier, reputation_score, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    });
  }

  /**
   * Get user by email from PostgreSQL
   */
  async getUserByEmail(email: string): Promise<PGUser | null> {
    return withClient(async (client) => {
      const result = await client.query(
        `SELECT id, primary_email, roles, tier, reputation_score, created_at, updated_at
         FROM users WHERE primary_email = $1`,
        [email]
      );
      return result.rows[0] || null;
    });
  }

  /**
   * Create a new user in PostgreSQL
   */
  async createUser(
    email: string,
    tier: string = 'free'
  ): Promise<PGUser> {
    const userId = uuidv7();
    assertInternalUserId(userId, 'Generated user ID');
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO users (id, primary_email, roles, tier, reputation_score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, primary_email, roles, tier, reputation_score, created_at, updated_at`,
        [userId, email, ['user'], tier, 0, now, now]
      );
      return result.rows[0];
    });
  }

  /**
   * Update user tier
   */
  async updateUserTier(
    userId: string,
    tier: string
  ): Promise<PGUser | null> {
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `UPDATE users
         SET tier = $1, updated_at = $2
         WHERE id = $3
         RETURNING id, primary_email, roles, tier, reputation_score, created_at, updated_at`,
        [tier, now, userId]
      );
      return result.rows[0] || null;
    });
  }

  /**
   * Get provider link by provider and provider_sub
   */
  async getProviderLink(
    provider: string,
    providerSub: string
  ): Promise<ProviderLink | null> {
    const normalizedProvider = normalizeProvider(provider);

    return withClient(async (client) => {
      const result = await client.query(
        `SELECT provider, provider_sub, user_id, created_at
         FROM provider_links
         WHERE provider = $1 AND provider_sub = $2`,
        [normalizedProvider, providerSub]
      );
      return result.rows[0] || null;
    });
  }

  /**
   * Create a provider link
   */
  async createProviderLink(
    provider: string,
    providerSub: string,
    userId: string
  ): Promise<ProviderLink> {
    const normalizedProvider = normalizeProvider(provider);
    assertInternalUserId(userId, 'Provider link user_id');
    const linkId = uuidv7();
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO provider_links (id, provider, provider_sub, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING provider, provider_sub, user_id, created_at`,
        [linkId, normalizedProvider, providerSub, userId, now]
      );
      return result.rows[0];
    });
  }

  /**
   * Get or create user via provider (OAuth flow)
   * Returns [user, isNewUser]
   */
  async getOrCreateUserByProvider(
    provider: string,
    providerSub: string,
    email: string
  ): Promise<[PGUser, boolean]> {
    const normalizedProvider = normalizeProvider(provider);
    const normalizedEmail = email.trim().normalize('NFKC').toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Provider email is required');
    }

    return withClient(async (client: PoolClient) => {
      await client.query('BEGIN');
      try {
        const linkResult = await client.query(
          `SELECT provider, provider_sub, user_id, created_at
           FROM provider_links
           WHERE provider = $1 AND provider_sub = $2
           FOR UPDATE`,
          [normalizedProvider, providerSub]
        );
        const existingLink = linkResult.rows[0] as ProviderLink | undefined;
        if (existingLink) {
          const userResult = await client.query(
            `SELECT id, primary_email, roles, tier, reputation_score, created_at, updated_at
             FROM users WHERE id = $1`,
            [existingLink.user_id]
          );
          const user = userResult.rows[0] as PGUser | undefined;
          if (!user) {
            throw new Error('Provider link points to a missing internal user');
          }
          assertInternalUserId(user.id, 'Linked user ID');
          await client.query('COMMIT');
          return [user, false];
        }

        // Email is mutable and cannot be used to silently merge identities. An
        // existing email account must be linked from an authenticated session.
        const emailResult = await client.query(
          `SELECT id, primary_email, roles, tier, reputation_score, created_at, updated_at
           FROM users WHERE primary_email = $1
           FOR UPDATE`,
          [normalizedEmail]
        );
        if (emailResult.rows[0]) {
          throw new ProviderAccountLinkRequiredError();
        }

        const userId = uuidv7();
        assertInternalUserId(userId, 'Generated user ID');
        const now = new Date().toISOString();
        const userResult = await client.query(
          `INSERT INTO users (id, primary_email, roles, tier, reputation_score, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, primary_email, roles, tier, reputation_score, created_at, updated_at`,
          [userId, normalizedEmail, ['user'], 'free', 0, now, now]
        );
        const user = userResult.rows[0] as PGUser;
        const linkId = uuidv7();

        await client.query(
          `INSERT INTO provider_links (id, provider, provider_sub, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [linkId, normalizedProvider, providerSub, user.id, now]
        );
        await client.query('COMMIT');
        return [user, true];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }
}

export const usersService = new UsersService();
