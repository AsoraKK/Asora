/**
 * ASORA NOTIFICATIONS - HTTP API
 * 
 * GET /api/notifications - List user notifications (paginated)
 * POST /api/notifications/:id/read - Mark notification as read
 * POST /api/notifications/:id/dismiss - Dismiss notification
 * GET /api/notifications/unread-count - Get unread badge count
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrincipalOrThrow } from '../../shared/middleware/auth';
import { notificationsRepo } from '../repositories/notificationsRepo';

export async function getNotifications(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const url = new URL(request.url);
    const continuationToken = url.searchParams.get('continuationToken') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const result = await notificationsRepo.queryForUser(principal.sub, {
      limit,
      continuationToken,
    });

    return {
      status: 200,
      jsonBody: {
        notifications: result.items,
        continuationToken: result.continuationToken,
      },
    };
  } catch (error) {
    context.error('Error fetching notifications', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function getUnreadCount(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const count = await notificationsRepo.getUnreadCount(principal.sub);

    return {
      status: 200,
      jsonBody: { unreadCount: count },
    };
  } catch (error) {
    context.error('Error fetching unread count', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function markNotificationAsRead(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const notificationId = request.params.id;
    if (!notificationId) {
      return { status: 400, jsonBody: { error: 'Missing notification ID' } };
    }

    await notificationsRepo.markAsRead(notificationId, principal.sub);

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error marking notification as read', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function dismissNotification(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const notificationId = request.params.id;
    if (!notificationId) {
      return { status: 400, jsonBody: { error: 'Missing notification ID' } };
    }

    await notificationsRepo.markAsDismissed(notificationId, principal.sub);

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error dismissing notification', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

// Register routes
app.http('getNotifications', {
  methods: ['GET'],
  route: 'notifications',
  authLevel: 'anonymous',
  handler: getNotifications,
});

app.http('getUnreadCount', {
  methods: ['GET'],
  route: 'notifications/unread-count',
  authLevel: 'anonymous',
  handler: getUnreadCount,
});

app.http('markNotificationAsRead', {
  methods: ['POST'],
  route: 'notifications/{id}/read',
  authLevel: 'anonymous',
  handler: markNotificationAsRead,
});

app.http('dismissNotification', {
  methods: ['POST'],
  route: 'notifications/{id}/dismiss',
  authLevel: 'anonymous',
  handler: dismissNotification,
});
