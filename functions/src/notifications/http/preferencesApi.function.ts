/**
 * ASORA NOTIFICATIONS - PREFERENCES API
 * 
 * GET /api/notifications/preferences - Get user preferences
 * PUT /api/notifications/preferences - Update user preferences
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrincipalOrThrow } from '../../shared/middleware/auth';
import { userNotificationPreferencesRepo } from '../repositories/userNotificationPreferencesRepo';

export async function getPreferences(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const prefs = await userNotificationPreferencesRepo.getOrCreate(principal.sub);

    return {
      status: 200,
      jsonBody: prefs,
    };
  } catch (error) {
    context.error('Error fetching preferences', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function updatePreferences(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return { status: 400, jsonBody: { error: 'Invalid request body' } };
    }

    const updated = await userNotificationPreferencesRepo.update(principal.sub, body);

    return {
      status: 200,
      jsonBody: updated,
    };
  } catch (error) {
    context.error('Error updating preferences', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
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
