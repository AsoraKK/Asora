import type { InvocationContext } from '@azure/functions';
import { notificationDispatcher } from '../../notifications/services/notificationDispatcher';
import type { NotificationEventType } from '../../notifications/types';
import { EVENT_TYPE_CATEGORY } from '../../notifications/types';
import { getAlphaConfig } from '@alpha/alphaConfig';

interface EnqueueUserNotificationParams {
  context: InvocationContext;
  userId: string | undefined | null;
  eventType: NotificationEventType;
  payload: Record<string, unknown>;
  dedupeKey?: string;
}

export async function enqueueUserNotification({
  context,
  userId,
  eventType,
  payload,
  dedupeKey,
}: EnqueueUserNotificationParams): Promise<void> {
  if (!userId || userId.trim().length === 0) {
    return;
  }

  try {
    const category = EVENT_TYPE_CATEGORY[eventType];
    if (category === 'SOCIAL' || category === 'NEWS' || category === 'MARKETING') {
      const alpha = await getAlphaConfig();
      if (alpha.features.readOnlyMode || !alpha.features.nonEssentialNotifications) {
        context.log('notifications.enqueue.skipped', { eventType, reason: 'alpha_feature_disabled' });
        return;
      }
    }
    await notificationDispatcher.enqueueNotificationEvent({
      userId,
      eventType,
      payload,
      dedupeKey,
    });
  } catch (error) {
    context.log('notifications.enqueue.failed', {
      userId: userId.slice(0, 8),
      eventType,
      message: (error as Error).message,
    });
  }
}
