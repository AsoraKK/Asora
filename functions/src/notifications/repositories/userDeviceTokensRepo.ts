/**
 * ASORA NOTIFICATIONS - USER DEVICE TOKENS REPOSITORY
 * 
 * Manages push notification device tokens.
 * Enforces 3-device cap per user.
 * Partition key: userId
 */

import { Container } from '@azure/cosmos';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { UserDeviceToken, UserDeviceTokenInput } from '../types';

const MAX_DEVICES_PER_USER = 3;

export class UserDeviceTokensRepository {
  private container: Container;

  constructor() {
    const database = getTargetDatabase();
    this.container = database.users.database.container('device_tokens');
  }

  async register(
    userId: string,
    input: UserDeviceTokenInput
  ): Promise<{ token: UserDeviceToken; evicted?: UserDeviceToken }> {
    // Check if device already exists (update lastSeenAt)
    const existing = await this.getByDeviceId(userId, input.deviceId);
    if (existing && !existing.revokedAt) {
      const updated: UserDeviceToken = {
        ...existing,
        pushToken: input.pushToken, // Update token if changed
        platform: input.platform,
        label: input.label || existing.label,
        lastSeenAt: new Date().toISOString(),
      };
      const { resource } = await this.container.item(existing.id, userId).replace(updated);
      return { token: resource as UserDeviceToken };
    }

    // Check device count
    const activeDevices = await this.listActive(userId);
    let evicted: UserDeviceToken | undefined;

    if (activeDevices.length >= MAX_DEVICES_PER_USER) {
      // Evict oldest device (by lastSeenAt)
      const sorted = activeDevices.sort(
        (a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime()
      );
      const oldest = sorted[0];
      if (oldest) {
        evicted = await this.revoke(userId, oldest.deviceId);
      }
    }

    // Create new token
    const now = new Date().toISOString();
    const token: UserDeviceToken = {
      id: input.deviceId,
      userId,
      deviceId: input.deviceId,
      pushToken: input.pushToken,
      platform: input.platform,
      label: input.label,
      createdAt: now,
      lastSeenAt: now,
    };

    const { resource } = await this.container.items.create(token);
    return { token: resource as UserDeviceToken, evicted };
  }

  async getByDeviceId(userId: string, deviceId: string): Promise<UserDeviceToken | null> {
    try {
      const { resource } = await this.container
        .item(deviceId, userId)
        .read<UserDeviceToken>();
      return resource || null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async listActive(userId: string): Promise<UserDeviceToken[]> {
    const query = {
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
        AND NOT IS_DEFINED(c.revokedAt)
        ORDER BY c.lastSeenAt DESC
      `,
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources } = await this.container.items
      .query<UserDeviceToken>(query, { partitionKey: userId })
      .fetchAll();

    return resources;
  }

  async listAll(userId: string): Promise<UserDeviceToken[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources } = await this.container.items
      .query<UserDeviceToken>(query, { partitionKey: userId })
      .fetchAll();

    return resources;
  }

  async revoke(userId: string, deviceId: string): Promise<UserDeviceToken> {
    const existing = await this.getByDeviceId(userId, deviceId);
    if (!existing) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const updated: UserDeviceToken = {
      ...existing,
      revokedAt: new Date().toISOString(),
    };

    const { resource } = await this.container.item(deviceId, userId).replace(updated);
    return resource as UserDeviceToken;
  }

  async updateLastSeen(userId: string, deviceId: string): Promise<void> {
    const existing = await this.getByDeviceId(userId, deviceId);
    if (!existing || existing.revokedAt) {
      return;
    }

    const updated: UserDeviceToken = {
      ...existing,
      lastSeenAt: new Date().toISOString(),
    };

    await this.container.item(deviceId, userId).replace(updated);
  }
}

export const userDeviceTokensRepo = new UserDeviceTokensRepository();
