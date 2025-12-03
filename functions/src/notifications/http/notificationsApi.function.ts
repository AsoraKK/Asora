/**
 * ASORA NOTIFICATIONS - HTTP API
 * 
 * GET /api/notifications - List user notifications (paginated)
 * POST /api/notifications/:id/read - Mark notification as read
 * POST /api/notifications/:id/dismiss - Dismiss notification
 * GET /api/notifications/unread-count - Get unread badge count
 * POST /api/notifications/send - Admin/internal endpoint to queue notifications
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseAuth, requireAdmin } from '../../shared/middleware/auth';
import { notificationsRepo } from '../repositories/notificationsRepo';
import { notificationDispatcher } from '../services/notificationDispatcher';
import { NotificationEventType } from '../types';
import {
  handleNotificationError,
  unauthorizedResponse,
  badRequestResponse,
} from '../shared/errorHandler';

const VALID_EVENT_TYPES = new Set<string>(Object.values(NotificationEventType));

export async function getNotifications(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let userId: string | undefined;
  try {
    // Auth check first - return 401 before any external calls
    const principal = await parseAuth(request);
    if (!principal) {
      return unauthorizedResponse();
    }
    userId = principal.sub;

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
    return handleNotificationError(context, '/api/notifications', error, userId);
  }
}

export async function getUnreadCount(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let userId: string | undefined;
  try {
    // Auth check first - return 401 before any external calls
    const principal = await parseAuth(request);
    if (!principal) {
      return unauthorizedResponse();
    }
    userId = principal.sub;

    const count = await notificationsRepo.getUnreadCount(principal.sub);

    return {
      status: 200,
      jsonBody: { unreadCount: count },
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/unread-count', error, userId);
  }
}

export async function markNotificationAsRead(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let userId: string | undefined;
  try {
    // Auth check first - return 401 before any external calls
    const principal = await parseAuth(request);
    if (!principal) {
      return unauthorizedResponse();
    }
    userId = principal.sub;

    const notificationId = request.params.id;
    if (!notificationId) {
      return badRequestResponse('Missing notification ID');
    }

    await notificationsRepo.markAsRead(notificationId, principal.sub);

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/{id}/read', error, userId);
  }
}

export async function dismissNotification(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let userId: string | undefined;
  try {
    // Auth check first - return 401 before any external calls
    const principal = await parseAuth(request);
    if (!principal) {
      return unauthorizedResponse();
    }
    userId = principal.sub;

    const notificationId = request.params.id;
    if (!notificationId) {
      return badRequestResponse('Missing notification ID');
    }

    await notificationsRepo.markAsDismissed(notificationId, principal.sub);

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/{id}/dismiss', error, userId);
  }
}

interface SendNotificationRequestBody {
  userId?: string;
  userIds?: string[];
  eventType?: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
  scheduledAt?: string;
}

const MAX_RECIPIENTS = 50;

function normalizeRecipients(body: SendNotificationRequestBody): string[] {
  if (body.userId && typeof body.userId === 'string') {
    const trimmed = body.userId.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(body.userIds)) {
    const unique = Array.from(
      new Set(
        body.userIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );
    return unique.slice(0, MAX_RECIPIENTS);
  }

  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function queueNotificationSend(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await req.json().catch(() => null)) as SendNotificationRequestBody | null;
    if (!body || !isPlainObject(body)) {
      return badRequestResponse('Invalid JSON body');
    }

    const recipients = normalizeRecipients(body);
    if (recipients.length === 0) {
      return badRequestResponse('Provide userId or non-empty userIds[]');
    }

    const eventTypeValue = body.eventType;
    if (typeof eventTypeValue !== 'string' || !VALID_EVENT_TYPES.has(eventTypeValue)) {
      return badRequestResponse('eventType is required and must be a supported value');
    }

    if (!isPlainObject(body.payload)) {
      return badRequestResponse('payload must be an object');
    }
    const payload = body.payload as Record<string, unknown>;

    let scheduledAt: string | undefined;
    if (typeof body.scheduledAt === 'string') {
      if (Number.isNaN(Date.parse(body.scheduledAt))) {
        return badRequestResponse('scheduledAt must be ISO 8601');
      }
      scheduledAt = body.scheduledAt;
    }

    const dedupeKey = typeof body.dedupeKey === 'string' && body.dedupeKey.trim().length > 0
      ? body.dedupeKey.trim()
      : undefined;

    const eventType = eventTypeValue as NotificationEventType;
    const enqueueResults = [] as Array<{ id: string; userId: string; status: string }>;

    for (const userId of recipients) {
      const event = await notificationDispatcher.enqueueNotificationEvent({
        userId,
        eventType,
        payload,
        dedupeKey,
        scheduledAt,
      });
      enqueueResults.push({ id: event.id, userId: event.userId, status: event.status });
    }

    context.log('notifications.send.queued', {
      eventType,
      recipients: recipients.length,
      queuedIds: enqueueResults.map((r) => r.id),
    });

    return {
      status: 202,
      jsonBody: {
        queued: enqueueResults.length,
        maxRecipients: MAX_RECIPIENTS,
        events: enqueueResults,
      },
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/send', error);
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

app.http('notifications-send', {
  methods: ['POST'],
  route: 'notifications/send',
  authLevel: 'anonymous',
  handler: requireAdmin(queueNotificationSend),
});
