/**
 * ASORA NOTIFICATIONS - PREFERENCES API
 * 
 * GET /api/notifications/preferences - Get user preferences
 * PUT /api/notifications/preferences - Update user preferences
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseAuth } from '../../shared/middleware/auth';
import { userNotificationPreferencesRepo } from '../repositories/userNotificationPreferencesRepo';
import {
  handleNotificationError,
  unauthorizedResponse,
  badRequestResponse,
} from '../shared/errorHandler';

export async function getPreferences(
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

    const prefs = await userNotificationPreferencesRepo.getOrCreate(principal.sub);

    return {
      status: 200,
      jsonBody: prefs,
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/preferences', error, userId);
  }
}

export async function updatePreferences(
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

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return badRequestResponse('Invalid request body');
    }

    const updated = await userNotificationPreferencesRepo.update(principal.sub, body);

    return {
      status: 200,
      jsonBody: updated,
    };
  } catch (error) {
    return handleNotificationError(context, '/api/notifications/preferences', error, userId);
  }
}

// Register routes
app.http('notifications-getPreferences', {
  methods: ['GET'],
  route: 'notifications/preferences',
  authLevel: 'anonymous',
  handler: getPreferences,
});

app.http('notifications-updatePreferences', {
  methods: ['PUT'],
  route: 'notifications/preferences',
  authLevel: 'anonymous',
  handler: updatePreferences,
});
