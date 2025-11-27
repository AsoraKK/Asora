/**
 * ASORA NOTIFICATIONS - DEVICE TOKEN API
 * 
 * POST /api/devices/register - Register push token (enforces 3-device cap)
 * GET /api/devices - List user devices
 * POST /api/devices/:id/revoke - Revoke a device token
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrincipalOrThrow } from '../../shared/middleware/auth';
import { userDeviceTokensRepo } from '../repositories/userDeviceTokensRepo';
import { getNotificationHubsClient } from '../clients/notificationHubClient';

export async function registerDevice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const principal = await getPrincipalOrThrow(request);

    const body = (await request.json()) as any;
    if (!body?.deviceId || !body?.pushToken || !body?.platform) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: deviceId, pushToken, platform' },
      };
    }

    const { deviceId, pushToken, platform, label } = body;

    if (platform !== 'fcm' && platform !== 'apns') {
      return {
        status: 400,
        jsonBody: { error: 'Invalid platform. Must be "fcm" or "apns"' },
      };
    }

    // Register in repository (enforces 3-device cap)
    const result = await userDeviceTokensRepo.register(principal.sub, {
      deviceId,
      pushToken,
      platform,
      label,
    });

    // Register with Notification Hubs
    try {
      const hubClient = getNotificationHubsClient();
      await hubClient.registerInstallation(deviceId, pushToken, platform, principal.sub);
    } catch (hubError) {
      context.warn('Failed to register with Notification Hubs', hubError);
      // Continue - device is still registered in DB
    }

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

    // Remove from Notification Hubs
    try {
      const hubClient = getNotificationHubsClient();
      await hubClient.deleteInstallation(deviceId);
    } catch (hubError) {
      context.warn('Failed to delete from Notification Hubs', hubError);
      // Continue - device is revoked in DB
    }

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
app.http('registerDevice', {
  methods: ['POST'],
  route: 'devices/register',
  authLevel: 'anonymous',
  handler: registerDevice,
});

app.http('listDevices', {
  methods: ['GET'],
  route: 'devices',
  authLevel: 'anonymous',
  handler: listDevices,
});

app.http('revokeDevice', {
  methods: ['POST'],
  route: 'devices/{id}/revoke',
  authLevel: 'anonymous',
  handler: revokeDevice,
});
