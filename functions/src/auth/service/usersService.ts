import { PoolClient } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { withClient } from '@shared/clients/postgres';

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
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO provider_links (provider, provider_sub, user_id, created_at)
         VALUES ($1, $2, $3, $4)
         RETURNING provider, provider_sub, user_id, created_at`,
        [normalizedProvider, providerSub, userId, now]
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

    // Check if provider link exists
    const existingLink = await this.getProviderLink(normalizedProvider, providerSub);
    if (existingLink) {
      const user = await this.getUserById(existingLink.user_id);
      if (user) {
        return [user, false];
      }
    }

    // Check if user exists by email
    let user = await this.getUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await this.createUser(email);
      isNewUser = true;
    }

    // Create provider link if it doesn't exist
    if (!existingLink) {
      await this.createProviderLink(normalizedProvider, providerSub, user.id);
    }

    return [user, isNewUser];
  }
}

export const usersService = new UsersService();
