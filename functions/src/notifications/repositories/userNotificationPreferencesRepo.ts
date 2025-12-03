/**
 * ASORA NOTIFICATIONS - USER PREFERENCES REPOSITORY
 * 
 * Manages per-user notification preferences.
 * Partition key: userId
 */

import { Container } from '@azure/cosmos';
import { getTargetDatabase } from '@shared/clients/cosmos';
import {
  UserNotificationPreferences,
  UserNotificationPreferencesInput,
  DEFAULT_QUIET_HOURS,
  DEFAULT_CATEGORY_PREFERENCES,
} from '../types';

export class UserNotificationPreferencesRepository {
  private _container: Container | null = null;

  /**
   * Lazy container initialization to avoid synchronous throws at module load
   */
  private get container(): Container {
    if (!this._container) {
      const database = getTargetDatabase();
      this._container = database.users.database.container('notification_preferences');
    }
    return this._container;
  }

  async getOrCreate(userId: string, timezone = 'UTC'): Promise<UserNotificationPreferences> {
    const existing = await this.get(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const prefs: UserNotificationPreferences = {
      id: userId,
      userId,
      timezone,
      quietHours: DEFAULT_QUIET_HOURS,
      categories: DEFAULT_CATEGORY_PREFERENCES,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(prefs);
    return resource as UserNotificationPreferences;
  }

  async get(userId: string): Promise<UserNotificationPreferences | null> {
    try {
      const { resource } = await this.container
        .item(userId, userId)
        .read<UserNotificationPreferences>();
      return resource || null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(
    userId: string,
    input: UserNotificationPreferencesInput
  ): Promise<UserNotificationPreferences> {
    const existing = await this.getOrCreate(userId);

    const updated: UserNotificationPreferences = {
      ...existing,
      timezone: input.timezone ?? existing.timezone,
      quietHours: input.quietHours ?? existing.quietHours,
      categories: {
        ...existing.categories,
        ...input.categories,
      },
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await this.container.item(userId, userId).replace(updated);
    return resource as UserNotificationPreferences;
  }
}

export const userNotificationPreferencesRepo = new UserNotificationPreferencesRepository();
