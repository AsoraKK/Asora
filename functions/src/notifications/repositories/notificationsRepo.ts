/**
 * ASORA NOTIFICATIONS - NOTIFICATIONS REPOSITORY
 * 
 * Manages Notification documents (in-app notification centre).
 * Partition key: userId
 * Auto-expires after 30 days
 */

import { Container } from '@azure/cosmos';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { Notification, NotificationInput } from '../types';

export class NotificationsRepository {
  private container: Container;

  constructor() {
    // Use existing 'notifications' container
    this.container = getTargetDatabase().notifications;
  }

  async create(input: NotificationInput): Promise<Notification> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: input.userId,
      category: input.category,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      deeplink: input.deeplink,
      targetId: input.targetId,
      targetType: input.targetType,
      iconUrl: input.iconUrl,
      imageUrl: input.imageUrl,
      read: false,
      dismissed: false,
      createdAt: now,
      expiresAt,
    };

    const { resource } = await this.container.items.create(notification);
    return resource as Notification;
  }

  async getById(id: string, userId: string): Promise<Notification | null> {
    try {
      const { resource } = await this.container.item(id, userId).read<Notification>();
      return resource || null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async queryForUser(
    userId: string,
    options: { limit?: number; continuationToken?: string } = {}
  ): Promise<{ items: Notification[]; continuationToken?: string }> {
    const { limit = 50, continuationToken } = options;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

    const query = {
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
        AND c.createdAt >= @since
        AND c.dismissed = false
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@since', value: since },
      ],
    };

    const iterator = this.container.items.query<Notification>(query, {
      partitionKey: userId,
      maxItemCount: limit,
      continuationToken,
    });

    const { resources, continuationToken: nextToken } = await iterator.fetchNext();

    return {
      items: resources,
      continuationToken: nextToken,
    };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const existing = await this.getById(id, userId);
    if (!existing) {
      throw new Error(`Notification ${id} not found`);
    }

    const updated: Notification = {
      ...existing,
      read: true,
      readAt: new Date().toISOString(),
    };

    const { resource } = await this.container.item(id, userId).replace(updated);
    return resource as Notification;
  }

  async markAsDismissed(id: string, userId: string): Promise<Notification> {
    const existing = await this.getById(id, userId);
    if (!existing) {
      throw new Error(`Notification ${id} not found`);
    }

    const updated: Notification = {
      ...existing,
      dismissed: true,
      dismissedAt: new Date().toISOString(),
    };

    const { resource } = await this.container.item(id, userId).replace(updated);
    return resource as Notification;
  }

  async updateOrCreate(
    existingId: string | undefined,
    userId: string,
    input: NotificationInput
  ): Promise<Notification> {
    if (existingId) {
      const existing = await this.getById(existingId, userId);
      if (existing) {
        // Update existing notification (for aggregation)
        const updated: Notification = {
          ...existing,
          title: input.title,
          body: input.body,
          deeplink: input.deeplink,
          targetId: input.targetId,
          // Don't reset read status
        };
        const { resource } = await this.container.item(existingId, userId).replace(updated);
        return resource as Notification;
      }
    }

    return this.create(input);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const query = {
      query: `
        SELECT VALUE COUNT(1) FROM c
        WHERE c.userId = @userId
        AND c.createdAt >= @since
        AND c.read = false
        AND c.dismissed = false
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@since', value: since },
      ],
    };

    const { resources } = await this.container.items
      .query<number>(query, { partitionKey: userId })
      .fetchAll();

    return resources[0] || 0;
  }
}

export const notificationsRepo = new NotificationsRepository();
