/**
 * ASORA NOTIFICATIONS - DISPATCHER
 * 
 * Core notification processing engine:
 * - Event enqueueing
 * - User preference evaluation (categories, quiet hours, rate limits)
 * - Deduplication and aggregation
 * - Push delivery via Notification Hubs
 * - In-app notification persistence
 * - Retry with exponential backoff
 */

import { DateTime } from 'luxon';
import { notificationEventsRepo } from '../repositories/notificationEventsRepo';
import { notificationsRepo } from '../repositories/notificationsRepo';
import { userNotificationPreferencesRepo } from '../repositories/userNotificationPreferencesRepo';
import { userDeviceTokensRepo } from '../repositories/userDeviceTokensRepo';
import { getNotificationHubsClient } from '../clients/notificationHubClient';
import {
  NotificationEvent,
  NotificationEventInput,
  NotificationEventType,
  NotificationCategory,
  PushPayload,
  EVENT_TYPE_CATEGORY,
} from '../types';
import { trackAppEvent, trackAppMetric } from '../../shared/appInsights';

// ============================================================================
// RATE LIMITS (per user, per category)
// ============================================================================

const RATE_LIMITS: Record<NotificationCategory, { perHour: number; perDay: number }> = {
  SOCIAL: { perHour: 3, perDay: 20 },
  NEWS: { perHour: 1, perDay: 1 },
  MARKETING: { perHour: 1, perDay: 1 },
  SAFETY: { perHour: 10, perDay: 50 }, // Higher limits for safety
  SECURITY: { perHour: 10, perDay: 50 },
};

// ============================================================================
// DISPATCHER CLASS
// ============================================================================

export class NotificationDispatcher {
  /**
   * Enqueue a notification event for processing
   */
  async enqueueNotificationEvent(input: NotificationEventInput): Promise<NotificationEvent> {
    const event = await notificationEventsRepo.create(input);

    trackAppEvent({
      name: 'notification_event_enqueued',
      properties: {
        userId: input.userId,
        eventType: input.eventType,
        category: EVENT_TYPE_CATEGORY[input.eventType],
        hasDedupeKey: Boolean(input.dedupeKey),
      },
    });

    return event;
  }

  /**
   * Process a single notification event
   */
  async processNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      // 1. Fetch user preferences
      const prefs = await userNotificationPreferencesRepo.getOrCreate(event.userId);

      // 2. Check category preference
      if (!this.isCategoryEnabled(event.category, prefs.categories)) {
        console.log(`[Dispatcher] Category ${event.category} disabled for user ${event.userId}`);
        await notificationEventsRepo.updateStatus(event.id, event.userId, 'SENT'); // Mark as sent (skipped)
        return;
      }

      // 3. Check quiet hours (safety/security bypass)
      const now = DateTime.now().setZone(prefs.timezone);
      if (
        this.isQuietHour(now.hour, prefs.quietHours.hours) &&
        event.category !== 'SAFETY' &&
        event.category !== 'SECURITY'
      ) {
        console.log(`[Dispatcher] Quiet hours for user ${event.userId}, delaying notification`);
        // Reschedule for next allowed window (simplified: just skip for now)
        await notificationEventsRepo.updateStatus(event.id, event.userId, 'SENT');
        return;
      }

      // 4. Check rate limits
      const rateLimitOk = await this.checkRateLimit(event.userId, event.category);
      if (!rateLimitOk) {
        console.log(
          `[Dispatcher] Rate limit exceeded for user ${event.userId}, category ${event.category}`
        );
        // Still create in-app notification but skip push
        await this.createInAppNotification(event, prefs.timezone);
        await notificationEventsRepo.updateStatus(event.id, event.userId, 'SENT');
        return;
      }

      // 5. Check dedupe and aggregation
      const existingNotifId = await this.checkDedupe(event);

      // 6. Build notification content
      const { title, body, deeplink } = this.buildNotificationContent(event);

      // 7. Create/update in-app notification
      await notificationsRepo.updateOrCreate(existingNotifId, event.userId, {
        userId: event.userId,
        category: event.category,
        eventType: event.eventType,
        title,
        body,
        deeplink,
        targetId: event.payload.targetId,
        targetType: event.payload.targetType,
      });

      // 8. Send push notification
      const devices = await userDeviceTokensRepo.listActive(event.userId);
      if (devices.length > 0) {
        const payload: PushPayload = {
          title,
          body,
          deeplink,
          data: {
            eventType: event.eventType,
            targetId: event.payload.targetId || '',
          },
        };

        const hubClient = getNotificationHubsClient();
        const result = await hubClient.sendPushToDevices(devices, payload);

        trackAppMetric({
          name: 'notification_push_sent',
          value: result.success,
          properties: {
            userId: event.userId,
            category: event.category,
            eventType: event.eventType,
            deviceCount: devices.length,
            failed: result.failed,
          },
        });

        if (result.failed > 0) {
          console.warn(`[Dispatcher] Push send failed for ${result.failed} devices`, result.errors);
        }
      }

      // 9. Mark event as sent
      await notificationEventsRepo.updateStatus(event.id, event.userId, 'SENT');

      trackAppEvent({
        name: 'notification_event_processed',
        properties: {
          userId: event.userId,
          eventType: event.eventType,
          category: event.category,
          pushSent: devices.length > 0,
        },
      });
    } catch (error) {
      console.error(`[Dispatcher] Error processing event ${event.id}:`, error);

      const errorMessage = (error as Error).message;
      await notificationEventsRepo.updateStatus(
        event.id,
        event.userId,
        event.attemptCount >= 2 ? 'DEAD_LETTER' : 'FAILED',
        errorMessage
      );

      trackAppEvent({
        name: 'notification_event_failed',
        properties: {
          userId: event.userId,
          eventType: event.eventType,
          attemptCount: event.attemptCount + 1,
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Process pending events in batch (for timer trigger)
   */
  async processPendingEventsBatch(batchSize = 50): Promise<{ processed: number; failed: number }> {
    const events = await notificationEventsRepo.queryByStatusAndRetry(batchSize);
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.processNotificationEvent(event);
        processed++;
      } catch (error) {
        failed++;
        // Continue processing other events
      }

      // Add delay between processing to avoid overwhelming downstream services
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    trackAppMetric({
      name: 'notification_batch_processed',
      value: processed,
      properties: {
        batchSize: events.length,
        failed,
      },
    });

    return { processed, failed };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private isCategoryEnabled(
    category: NotificationCategory,
    prefs: { social: boolean; news: boolean; marketing: boolean }
  ): boolean {
    // Safety and security are always enabled
    if (category === 'SAFETY' || category === 'SECURITY') {
      return true;
    }

    switch (category) {
      case 'SOCIAL':
        return prefs.social;
      case 'NEWS':
        return prefs.news;
      case 'MARKETING':
        return prefs.marketing;
      default:
        return false;
    }
  }

  private isQuietHour(hour: number, quietHours: boolean[]): boolean {
    return quietHours[hour] === true;
  }

  private async checkRateLimit(
    userId: string,
    category: NotificationCategory
  ): Promise<boolean> {
    const limits = RATE_LIMITS[category];
    const now = Date.now();

    // Query recent events for this user/category
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // Simplified: query from events repo (in production, use Redis for performance)
    // For now, we'll rely on the honor system and just return true
    // TODO: Implement proper rate limit tracking with Redis or Cosmos queries

    return true; // Simplified for initial implementation
  }

  private async checkDedupe(event: NotificationEvent): Promise<string | undefined> {
    if (!event.dedupeKey) {
      return undefined;
    }

    // Check for recent notifications with same dedupe key
    const recent = await notificationEventsRepo.queryRecentByDedupeKey(
      event.userId,
      event.dedupeKey,
      60 // Last 60 minutes
    );

    if (recent.length > 0) {
      // Return the notification ID to update instead of creating new
      return recent[0].id;
    }

    return undefined;
  }

  private async createInAppNotification(
    event: NotificationEvent,
    timezone: string
  ): Promise<void> {
    const { title, body, deeplink } = this.buildNotificationContent(event);

    await notificationsRepo.create({
      userId: event.userId,
      category: event.category,
      eventType: event.eventType,
      title,
      body,
      deeplink,
      targetId: event.payload.targetId,
      targetType: event.payload.targetType,
    });
  }

  private buildNotificationContent(event: NotificationEvent): {
    title: string;
    body: string;
    deeplink?: string;
  } {
    const { actorName, targetType, snippet, count } = event.payload;

    switch (event.eventType) {
      case NotificationEventType.COMMENT_CREATED:
        return {
          title: `${actorName || 'Someone'} commented on your ${targetType || 'post'}`,
          body: snippet || 'Tap to view',
          deeplink: `asora://post/${event.payload.targetId}`,
        };

      case NotificationEventType.COMMENT_REPLY:
        return {
          title: `${actorName || 'Someone'} replied to your comment`,
          body: snippet || 'Tap to view',
          deeplink: `asora://post/${event.payload.targetId}`,
        };

      case NotificationEventType.POST_LIKED:
        if (count && count > 1) {
          return {
            title: `${actorName} and ${count - 1} others liked your post`,
            body: 'Tap to view',
            deeplink: `asora://post/${event.payload.targetId}`,
          };
        }
        return {
          title: `${actorName || 'Someone'} liked your post`,
          body: snippet || 'Tap to view',
          deeplink: `asora://post/${event.payload.targetId}`,
        };

      case NotificationEventType.POST_REACTED:
        return {
          title: `${actorName || 'Someone'} reacted to your post`,
          body: snippet || 'Tap to view',
          deeplink: `asora://post/${event.payload.targetId}`,
        };

      case NotificationEventType.USER_FOLLOWED:
        return {
          title: `${actorName || 'Someone'} started following you`,
          body: 'Tap to view profile',
          deeplink: `asora://user/${event.payload.actorId}`,
        };

      case NotificationEventType.FOLLOWER_POSTED:
        return {
          title: `${actorName} posted something new`,
          body: snippet || 'Tap to view',
          deeplink: `asora://post/${event.payload.targetId}`,
        };

      case NotificationEventType.MODERATION_CONTENT_BLOCKED:
        return {
          title: 'Content Moderation Update',
          body: 'One of your posts or comments was flagged and is under review',
          deeplink: `asora://moderation/${event.payload.targetId}`,
        };

      case NotificationEventType.MODERATION_APPEAL_DECIDED:
        return {
          title: 'Appeal Decision',
          body: 'A decision has been made on your appeal',
          deeplink: `asora://moderation/appeal/${event.payload.targetId}`,
        };

      case NotificationEventType.SECURITY_LOGIN_NEW_DEVICE:
        return {
          title: 'New Login Detected',
          body: 'Your account was accessed from a new device. Was this you?',
          deeplink: 'asora://settings/security',
        };

      case NotificationEventType.ACCOUNT_CHANGE:
        return {
          title: 'Account Security',
          body: event.payload.snippet || 'Important changes were made to your account',
          deeplink: 'asora://settings/account',
        };

      case NotificationEventType.NEWS_ALERT:
        return {
          title: 'Asora News',
          body: event.payload.snippet || "Check out what's new",
          deeplink: (event.payload.deeplink as string | undefined) || 'asora://news',
        };

      case NotificationEventType.MARKETING_CAMPAIGN:
        return {
          title: (event.payload.title as string | undefined) || 'Special Offer',
          body: event.payload.snippet || 'Tap to learn more',
          deeplink: (event.payload.deeplink as string | undefined) || 'asora://offers',
        };

      default:
        return {
          title: 'Asora Notification',
          body: 'You have a new notification',
        };
    }
  }
}

// Singleton instance
export const notificationDispatcher = new NotificationDispatcher();
