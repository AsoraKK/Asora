/**
 * ASORA NOTIFICATIONS - NOTIFICATION HUBS CLIENT
 * 
 * Wrapper for Azure Notification Hubs to send push notifications.
 * Handles platform-specific payload formatting (FCM V1/APNS).
 * 
 * Platform strings used:
 * - FCM: 'fcmv1' (FCM HTTP v1 API, required for SDK v2+)
 * - APNS: 'apns' (Apple Push Notification Service)
 * 
 * Installation platform normalization:
 * - Client sends 'fcm' → normalized to 'fcmv1' for installations
 * - Client sends 'apns' → remains 'apns'
 */

import * as NotificationHubsSDK from '@azure/notification-hubs';
import { configService } from '../../../shared/configService';
import { PushPayload, UserDeviceToken } from '../types';

interface NotificationHubsConfig {
  connectionString: string;
  hubName: string;
}

export class NotificationHubsClient {
  private client: NotificationHubsSDK.NotificationHubsClient | null = null;
  private config: NotificationHubsConfig;
  private enabled: boolean;

  constructor(config?: NotificationHubsConfig) {
    const notifConfig = configService.getNotificationConfig();
    
    this.config = config || {
      connectionString: notifConfig.hubConnectionString,
      hubName: notifConfig.hubName,
    };
    
    this.enabled = notifConfig.enabled;

    if (!this.enabled) {
      console.warn('[NotificationHubs] Client disabled - no configuration provided');
      return;
    }

    if (!this.config.connectionString || !this.config.hubName) {
      throw new Error(
        '[NotificationHubs] FATAL: Missing required configuration. ' +
        'Set NOTIFICATION_HUB_CONNECTION_STRING and NOTIFICATION_HUB_NAME.'
      );
    }

    try {
      this.client = new NotificationHubsSDK.NotificationHubsClient(
        this.config.connectionString,
        this.config.hubName
      );
      console.log(`[NotificationHubs] Client initialized for hub: ${this.config.hubName}`);
    } catch (error) {
      console.error('[NotificationHubs] Failed to initialize client:', error);
      throw error;
    }
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.client) {
      throw new Error('[NotificationHubs] Client not configured. Check environment variables.');
    }
  }

  /**
   * Send push notification to specific devices
   */
  async sendPushToDevices(
    devices: UserDeviceToken[],
    payload: PushPayload
  ): Promise<{ success: number; failed: number; errors: Array<{ deviceId: string; error: string }> }> {
    this.assertEnabled();
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ deviceId: string; error: string }>,
    };

    // Group devices by platform
    const androidDevices = devices.filter((d) => d.platform === 'android');
    const iosDevices = devices.filter((d) => d.platform === 'ios');

    // Send to Android devices (FCM)
    if (androidDevices.length > 0) {
      for (const device of androidDevices) {
        try {
          await this.sendFcmNotification(device.pushToken, payload);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            deviceId: device.deviceId,
            error: (error as Error).message,
          });
        }
      }
    }

    // Send to iOS devices (APNS)
    if (iosDevices.length > 0) {
      for (const device of iosDevices) {
        try {
          await this.sendApnsNotification(device.pushToken, payload);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            deviceId: device.deviceId,
            error: (error as Error).message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Send FCM V1 (Android) notification
   */
  private async sendFcmNotification(
    token: string,
    payload: PushPayload
  ): Promise<NotificationHubsSDK.NotificationHubsResponse> {
    const fcmPayload: NotificationHubsSDK.FcmV1Notification = {
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            deeplink: payload.deeplink || '',
            ...payload.data,
          },
          android: {
            priority: 'high',
          },
        },
      }),
      contentType: 'application/json;charset=utf-8',
      platform: 'fcmv1',
    };

    this.assertEnabled();
    return this.client!.sendNotification(fcmPayload, { deviceHandle: token });
  }

  /**
   * Send APNS (iOS) notification
   */
  private async sendApnsNotification(
    token: string,
    payload: PushPayload
  ): Promise<NotificationHubsSDK.NotificationHubsResponse> {
    const apnsPayload: NotificationHubsSDK.AppleNotification = {
      body: JSON.stringify({
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: payload.sound || 'default',
          badge: payload.badge,
          'content-available': 1,
        },
        deeplink: payload.deeplink || '',
        ...payload.data,
      }),
      contentType: 'application/json;charset=utf-8',
      platform: 'apple',
    };

    this.assertEnabled();
    return this.client!.sendNotification(apnsPayload, { deviceHandle: token });
  }

  /**
   * Send template notification (if using template-based approach)
   */
  async sendTemplateNotification(
    tags: string[],
    payload: Record<string, string>
  ): Promise<NotificationHubsSDK.NotificationHubsResponse> {
    const notification: NotificationHubsSDK.TemplateNotification = {
      body: JSON.stringify(payload),
      contentType: 'application/json;charset=utf-8',
      platform: 'template',
    };

    this.assertEnabled();
    return this.client!.sendNotification(notification, { tagExpression: tags.join(' || ') });
  }

  /**
   * Register a device installation (alternative to direct send)
   */
  async registerInstallation(
    installationId: string,
    deviceToken: string,
    platform: 'fcm' | 'apns',
    userId: string,
    tags: string[] = []
  ): Promise<void> {
    const normalizedPlatform = platform === 'fcm' ? 'fcmv1' : 'apns';
    
    const installation: NotificationHubsSDK.Installation = {
      installationId,
      platform: normalizedPlatform,
      pushChannel: deviceToken,
      tags: [`userId:${userId}`, ...tags],
    };

    this.assertEnabled();
    await this.client!.createOrUpdateInstallation(installation);
  }

  /**
   * Delete installation
   */
  async deleteInstallation(installationId: string): Promise<void> {
    this.assertEnabled();
    await this.client!.deleteInstallation(installationId);
  }
}

// Singleton instance
let hubClientInstance: NotificationHubsClient | null = null;

export function getNotificationHubsClient(): NotificationHubsClient {
  if (!hubClientInstance) {
    hubClientInstance = new NotificationHubsClient();
  }
  return hubClientInstance;
}

export function setNotificationHubsClient(client: NotificationHubsClient): void {
  hubClientInstance = client;
}
