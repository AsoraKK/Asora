/**
 * ASORA NOTIFICATIONS - DEVICE TOKEN API
 * 
 * POST /api/notifications/devices - Register or update a push token (3-device cap)
 * GET /api/notifications/devices - List user devices
 * POST /api/notifications/devices/:id/revoke - Revoke a device token
 * 
 * Device registration stores tokens in Cosmos DB for FCM delivery.
 * No external installation management needed - FCM uses direct token addressing.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrincipalOrThrow } from '../../shared/middleware/auth';
import { userDeviceTokensRepo } from '../repositories/userDeviceTokensRepo';

export async function registerDevice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body?.deviceId !== 'string' ||
      typeof body?.pushToken !== 'string' ||
      typeof body?.platform !== 'string'
    ) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: deviceId, pushToken, platform' },
      };
    }

    const deviceId = body.deviceId;
    const pushToken = body.pushToken;
    const apiPlatform = body.platform;
    const label = typeof body.label === 'string' ? body.label : undefined;

    if (apiPlatform !== 'fcm' && apiPlatform !== 'apns') {
      return {
        status: 400,
        jsonBody: { error: 'Invalid platform. Must be "fcm" or "apns"' },
      };
    }

    // Map API platform (fcm/apns) to internal platform type (android/ios)
    const platform = apiPlatform === 'fcm' ? 'android' : 'ios';

    // Register in repository (enforces 3-device cap)
    const result = await userDeviceTokensRepo.register(principal.sub, {
      deviceId,
      pushToken,
      platform,
      label,
    });

    // No external installation registration needed - FCM uses direct token addressing
    // Tokens are stored in Cosmos DB and used directly when sending notifications

    return {
      status: 201,
      jsonBody: {
        device: result.token,
        evictedDevice: result.evicted,
      },
    };
  } catch (error) {
    context.error('Error registering device', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function listDevices(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    const devices = activeOnly
      ? await userDeviceTokensRepo.listActive(principal.sub)
      : await userDeviceTokensRepo.listAll(principal.sub);

    return {
      status: 200,
      jsonBody: { devices },
    };
  } catch (error) {
    context.error('Error listing devices', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

export async function revokeDevice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const deviceId = request.params.id;
    if (!deviceId) {
      return { status: 400, jsonBody: { error: 'Missing device ID' } };
    }

    await userDeviceTokensRepo.revoke(deviceId, principal.sub);

    // No external cleanup needed - FCM tokens are just strings stored in our DB
    // Revoked tokens simply won't be used for future sends

    return {
      status: 200,
      jsonBody: { success: true },
    };
  } catch (error) {
    context.error('Error revoking device', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

// Register routes
app.http('notifications-registerDevice', {
  methods: ['POST'],
  route: 'notifications/devices',
  authLevel: 'anonymous',
  handler: registerDevice,
});

app.http('notifications-listDevices', {
  methods: ['GET'],
  route: 'notifications/devices',
  authLevel: 'anonymous',
  handler: listDevices,
});

app.http('notifications-revokeDevice', {
  methods: ['POST'],
  route: 'notifications/devices/{id}/revoke',
  authLevel: 'anonymous',
  handler: revokeDevice,
});
