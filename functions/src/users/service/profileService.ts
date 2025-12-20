import { getTargetDatabase } from '@shared/clients/cosmos';

export interface CosmosUserProfile {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

class ProfileService {
  /**
   * Get user profile from Cosmos
   */
  async getProfile(userId: string): Promise<CosmosUserProfile | null> {
    try {
        const container = getTargetDatabase().profiles;
      const { resource } = await container.item(userId, userId).read();
      return resource || null;
    } catch (error) {
      // Handle 404 gracefully
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new user profile in Cosmos
   */
  async createProfile(
    userId: string,
    displayName: string,
    avatarUrl?: string
  ): Promise<CosmosUserProfile> {
    const now = new Date().toISOString();
    const profile: CosmosUserProfile = {
      id: userId,
      displayName,
      avatarUrl,
      bio: '',
      location: '',
      settings: {},
      createdAt: now,
      updatedAt: now,
    };

    const container = getTargetDatabase().users;
    await container.items.create(profile);
    return profile;
  }

  /**
   * Update user profile in Cosmos (partial update)
   */
  async updateProfile(
    userId: string,
    updates: Partial<CosmosUserProfile>
  ): Promise<CosmosUserProfile> {
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    const updated: CosmosUserProfile = {
      ...existing,
      ...updates,
      id: userId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    const container = getTargetDatabase().users;
    await container.item(userId, userId).replace(updated);
    return updated;
  }

  /**
   * Ensure profile exists (create if missing)
   */
  async ensureProfile(
    userId: string,
    displayName: string,
    avatarUrl?: string
  ): Promise<CosmosUserProfile> {
    const existing = await this.getProfile(userId);
    if (existing) {
      return existing;
    }

    return this.createProfile(userId, displayName, avatarUrl);
  }

  /**
   * Delete user profile from Cosmos
   */
  async deleteProfile(userId: string): Promise<void> {
    const container = getTargetDatabase().users;
    try {
      await container.item(userId, userId).delete();
    } catch (error) {
      // Ignore 404 errors on delete
      if (error instanceof Error && !error.message.includes('404')) {
        throw error;
      }
    }
  }
}

export const profileService = new ProfileService();
