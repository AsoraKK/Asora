/**
 * ASORA NOTIFICATIONS - EVENTS REPOSITORY
 * 
 * Manages NotificationEvent documents in Cosmos DB.
 * Events are transient processing queue items.
 * Partition key: userId
 */

import { Container } from '@azure/cosmos';
import { getTargetDatabase } from '@shared/clients/cosmos';
import {
  NotificationEvent,
  NotificationEventInput,
  NotificationEventStatus,
  NotificationEventType,
  EVENT_TYPE_CATEGORY,
} from '../types';

export class NotificationEventsRepository {
  private container: Container;

  constructor() {
    const database = getTargetDatabase();
    // Use a dedicated container for events (processing queue)
    this.container = database.users.database.container('notification_events');
  }

  async create(input: NotificationEventInput): Promise<NotificationEvent> {
    const now = new Date().toISOString();
    const event: NotificationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: input.userId,
      eventType: input.eventType,
      category: EVENT_TYPE_CATEGORY[input.eventType],
      payload: input.payload,
      status: 'PENDING',
      attemptCount: 0,
      dedupeKey: input.dedupeKey,
      createdAt: now,
      scheduledAt: input.scheduledAt,
    };

    const { resource } = await this.container.items.create(event);
    return resource as NotificationEvent;
  }

  async getById(id: string, userId: string): Promise<NotificationEvent | null> {
    try {
      const { resource } = await this.container.item(id, userId).read<NotificationEvent>();
      return resource || null;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async queryByStatus(
    status: NotificationEventStatus,
    limit = 50
  ): Promise<NotificationEvent[]> {
    const query = {
      query: `
        SELECT * FROM c
        WHERE c.status = @status
        AND (NOT IS_DEFINED(c.scheduledAt) OR c.scheduledAt <= @now)
        ORDER BY c.createdAt ASC
      `,
      parameters: [
        { name: '@status', value: status },
        { name: '@now', value: new Date().toISOString() },
      ],
    };

    const { resources } = await this.container.items
      .query<NotificationEvent>(query, { maxItemCount: limit })
      .fetchAll();

    return resources;
  }

  async queryByStatusAndRetry(limit = 50): Promise<NotificationEvent[]> {
    const query = {
      query: `
        SELECT * FROM c
        WHERE (c.status = 'PENDING' OR (c.status = 'FAILED' AND c.attemptCount < 3))
        AND (NOT IS_DEFINED(c.scheduledAt) OR c.scheduledAt <= @now)
        ORDER BY c.createdAt ASC
      `,
      parameters: [{ name: '@now', value: new Date().toISOString() }],
    };

    const { resources } = await this.container.items
      .query<NotificationEvent>(query, { maxItemCount: limit })
      .fetchAll();

    return resources;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: NotificationEventStatus,
    lastError?: string
  ): Promise<NotificationEvent> {
    const existing = await this.getById(id, userId);
    if (!existing) {
      throw new Error(`NotificationEvent ${id} not found`);
    }

    const updated: NotificationEvent = {
      ...existing,
      status,
      attemptCount: status === 'FAILED' ? existing.attemptCount + 1 : existing.attemptCount,
      lastError: lastError || existing.lastError,
      processedAt: status === 'SENT' ? new Date().toISOString() : existing.processedAt,
    };

    const { resource } = await this.container.item(id, userId).replace(updated);
    return resource as NotificationEvent;
  }

  async queryRecentByDedupeKey(
    userId: string,
    dedupeKey: string,
    sinceMinutes = 60
  ): Promise<NotificationEvent[]> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
    const query = {
      query: `
        SELECT * FROM c
        WHERE c.userId = @userId
        AND c.dedupeKey = @dedupeKey
        AND c.createdAt >= @since
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@dedupeKey', value: dedupeKey },
        { name: '@since', value: since },
      ],
    };

    const { resources } = await this.container.items
      .query<NotificationEvent>(query, { partitionKey: userId })
      .fetchAll();

    return resources;
  }

  async deleteOldEvents(olderThanDays = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const query = {
      query: 'SELECT c.id, c.userId FROM c WHERE c.createdAt < @cutoff',
      parameters: [{ name: '@cutoff', value: cutoff }],
    };

    const { resources } = await this.container.items
      .query<{ id: string; userId: string }>(query)
      .fetchAll();

    let deleted = 0;
    for (const { id, userId } of resources) {
      await this.container.item(id, userId).delete();
      deleted++;
    }

    return deleted;
  }
}

export const notificationEventsRepo = new NotificationEventsRepository();
