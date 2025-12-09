import { PoolClient } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { withClient } from '@shared/clients/postgres';

export interface PGUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  roles: string[];
  tier: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderLink {
  provider: string;
  provider_sub: string;
  user_id: string;
  created_at: string;
}

class UsersService {
  /**
   * Get user by ID from PostgreSQL
   */
  async getUserById(userId: string): Promise<PGUser | null> {
    return withClient(async (client) => {
      const result = await client.query(
        `SELECT id, email, display_name, avatar_url, roles, tier, created_at, updated_at
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
        `SELECT id, email, display_name, avatar_url, roles, tier, created_at, updated_at
         FROM users WHERE email = $1`,
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
    displayName: string,
    tier: string = 'free'
  ): Promise<PGUser> {
    const userId = uuidv7();
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO users (id, email, display_name, roles, tier, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, display_name, avatar_url, roles, tier, created_at, updated_at`,
        [userId, email, displayName, ['user'], tier, now, now]
      );
      return result.rows[0];
    });
  }

  /**
   * Update user display_name and/or avatar_url
   */
  async updateUser(
    userId: string,
    displayName?: string,
    avatarUrl?: string
  ): Promise<PGUser | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(displayName);
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(userId);

    if (updates.length === 1) {
      // Only updated_at is being set, which means nothing else changed
      return this.getUserById(userId);
    }

    return withClient(async (client) => {
      const result = await client.query(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, display_name, avatar_url, roles, tier, created_at, updated_at`,
        values
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
    return withClient(async (client) => {
      const result = await client.query(
        `SELECT provider, provider_sub, user_id, created_at
         FROM provider_links
         WHERE provider = $1 AND provider_sub = $2`,
        [provider, providerSub]
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
    const now = new Date().toISOString();

    return withClient(async (client) => {
      const result = await client.query(
        `INSERT INTO provider_links (provider, provider_sub, user_id, created_at)
         VALUES ($1, $2, $3, $4)
         RETURNING provider, provider_sub, user_id, created_at`,
        [provider, providerSub, userId, now]
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
    email: string,
    displayName: string
  ): Promise<[PGUser, boolean]> {
    // Check if provider link exists
    const existingLink = await this.getProviderLink(provider, providerSub);
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
      user = await this.createUser(email, displayName);
      isNewUser = true;
    }

    // Create provider link if it doesn't exist
    if (!existingLink) {
      await this.createProviderLink(provider, providerSub, user.id);
    }

    return [user, isNewUser];
  }
}

export const usersService = new UsersService();
