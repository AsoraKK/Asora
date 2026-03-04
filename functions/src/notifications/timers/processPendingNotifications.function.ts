/**
 * ASORA NOTIFICATIONS - BATCH PROCESSOR
 * 
 * Timer-triggered function that processes pending notification events
 * Runs every minute to process events in the queue
 */

import { app, InvocationContext, Timer } from '@azure/functions';
import { notificationDispatcher } from '../services/notificationDispatcher';

export async function processPendingNotifications(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('[NotificationProcessor] Starting batch processing');

  try {
    const result = await notificationDispatcher.processPendingEventsBatch(100);

    context.log(
      `[NotificationProcessor] Batch complete - Processed: ${result.processed}, Failed: ${result.failed}`
    );
  } catch (error) {
    context.error('[NotificationProcessor] Batch processing error', error);
    throw error;
  }
}

app.timer('processPendingNotifications', {
  schedule: '0 */1 * * * *', // Every minute
  handler: processPendingNotifications,
});
