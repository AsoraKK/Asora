/**
 * ASORA NOTIFICATIONS - FCM HTTP V1 CLIENT
 *
 * Direct Firebase Cloud Messaging integration using FCM HTTP v1 API.
 * Replaces Azure Notification Hubs for push notification delivery.
 *
 * Features:
 * - OAuth2 authentication using Google service account
 * - Token caching with automatic renewal
 * - Platform-specific payload formatting (Android/iOS)
 * - Comprehensive error classification for retry handling
 * - Token invalidation detection
 *
 * Environment Variables:
 * - FCM_PROJECT_ID: Firebase project ID (e.g., 'asora-dev')
 * - FCM_CLIENT_EMAIL: Service account email
 * - FCM_PRIVATE_KEY: Service account private key (PEM format)
 *
 * @see https://firebase.google.com/docs/cloud-messaging/send-message
 * @see https://firebase.google.com/docs/cloud-messaging/http-server-ref
 */

import * as crypto from 'crypto';
import { NotificationCategory, PushPayload, UserDeviceToken } from '../types';
import { trackAppEvent, trackAppMetric } from '../../shared/appInsights';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// Token cache - reuse token until near expiry
let cachedToken: CachedToken | null = null;

// Renew token when less than 5 minutes remain
const TOKEN_RENEWAL_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// TYPES
// ============================================================================

export interface FcmSendRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  androidConfig?: {
    ttl?: string; // e.g., "3600s"
    priority?: 'HIGH' | 'NORMAL';
    channelId?: string;
    icon?: string;
    color?: string;
    clickAction?: string;
  };
  apnsConfig?: {
    // Placeholder for future iOS direct APNS support
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
  };
  category: NotificationCategory;
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  isTokenInvalid?: boolean;
  isRetryable?: boolean;
}

// FCM API error codes that indicate invalid tokens
const INVALID_TOKEN_ERRORS = [
  'UNREGISTERED',
  'NOT_FOUND',
  'INVALID_ARGUMENT', // Token format invalid
];

// FCM API error codes that are retryable
const RETRYABLE_ERRORS = [
  'UNAVAILABLE',
  'INTERNAL',
  'QUOTA_EXCEEDED',
];

// ============================================================================
// CONFIGURATION LOADING
// ============================================================================

let fcmConfig: FcmConfig | null = null;
let configError: string | null = null;

function loadFcmConfig(): FcmConfig {
  if (fcmConfig) {
    return fcmConfig;
  }

  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  let privateKey = process.env.FCM_PRIVATE_KEY;

  // Validate required fields
  const missing: string[] = [];
  if (!projectId) missing.push('FCM_PROJECT_ID');
  if (!clientEmail) missing.push('FCM_CLIENT_EMAIL');
  if (!privateKey) missing.push('FCM_PRIVATE_KEY');

  if (missing.length > 0) {
    const errorMessage = `FCM configuration missing: ${missing.join(', ')}. Push notifications will fail.`;
    if (configError !== errorMessage) {
      console.error(`[FCM] FATAL: ${errorMessage}`);
    }
    configError = errorMessage;
    throw new Error(errorMessage);
  }

  // Handle escaped newlines in private key (common in env vars)
  // Support both literal \n (escaped) and actual newlines
  if (privateKey!.includes('\\n')) {
    privateKey = privateKey!.replace(/\\n/g, '\n');
  }

  // Validate private key format
  if (!privateKey!.includes('-----BEGIN') || !privateKey!.includes('PRIVATE KEY-----')) {
    const errorMessage = 'FCM_PRIVATE_KEY appears invalid. Ensure it is a PEM-formatted private key.';
    if (configError !== errorMessage) {
      console.error(`[FCM] FATAL: ${errorMessage}`);
    }
    configError = errorMessage;
    throw new Error(errorMessage);
  }

  fcmConfig = {
    projectId: projectId!,
    clientEmail: clientEmail!,
    privateKey: privateKey!,
  };
  configError = null;

  console.log(`[FCM] Configuration loaded for project: ${fcmConfig.projectId}`);
  return fcmConfig;
}

/**
 * Check if FCM is configured (without throwing)
 */
export function isFcmConfigured(): boolean {
  try {
    loadFcmConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get configuration status for health checks
 */
export function getFcmConfigStatus(): { configured: boolean; projectId?: string; error?: string } {
  if (configError) {
    return { configured: false, error: configError };
  }
  try {
    const config = loadFcmConfig();
    return { configured: true, projectId: config.projectId };
  } catch (e) {
    return { configured: false, error: (e as Error).message };
  }
}

// ============================================================================
// JWT / OAUTH2 TOKEN GENERATION
// ============================================================================

/**
 * Generate a JWT for Google OAuth2 authentication
 * This JWT is exchanged for an access token at Google's OAuth2 endpoint
 */
function generateJwt(config: FcmConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour validity

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: config.clientEmail,
    sub: config.clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(config.privateKey, 'base64url');

  return `${unsignedToken}.${signature}`;
}

/**
 * Exchange JWT for OAuth2 access token
 */
async function getAccessToken(config: FcmConfig): Promise<string> {
  // Check cache first
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_RENEWAL_BUFFER_MS) {
    return cachedToken.accessToken;
  }

  const jwt = generateJwt(config);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FCM] OAuth2 token exchange failed:', response.status, errorText);
    throw new Error(`FCM OAuth2 token exchange failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;

  // Cache the token
  cachedToken = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  console.log(`[FCM] OAuth2 token obtained, expires in ${expiresIn}s`);
  return accessToken;
}

// ============================================================================
// SEND API
// ============================================================================

/**
 * Send a push notification to a single device via FCM HTTP v1 API
 */
export async function sendToDevice(req: FcmSendRequest): Promise<FcmSendResult> {
  const startTime = Date.now();

  try {
    const config = loadFcmConfig();
    const accessToken = await getAccessToken(config);

    // Build FCM v1 message payload
    const message: Record<string, unknown> = {
      token: req.token,
      notification: {
        title: req.title,
        body: req.body,
      },
    };

    // Add data payload if provided
    if (req.data && Object.keys(req.data).length > 0) {
      message.data = req.data;
    }

    // Add Android-specific config
    if (req.androidConfig) {
      const android: Record<string, unknown> = {
        priority: req.androidConfig.priority || 'HIGH',
      };

      if (req.androidConfig.ttl) {
        android.ttl = req.androidConfig.ttl;
      }

      // Android notification specifics
      const notification: Record<string, string> = {};
      if (req.androidConfig.channelId) {
        notification.channel_id = req.androidConfig.channelId;
      }
      if (req.androidConfig.icon) {
        notification.icon = req.androidConfig.icon;
      }
      if (req.androidConfig.color) {
        notification.color = req.androidConfig.color;
      }
      if (req.androidConfig.clickAction) {
        notification.click_action = req.androidConfig.clickAction;
      }

      if (Object.keys(notification).length > 0) {
        android.notification = notification;
      }

      message.android = android;
    }

    // Add APNS config placeholder (for future iOS support)
    if (req.apnsConfig) {
      message.apns = {
        headers: req.apnsConfig.headers,
        payload: req.apnsConfig.payload,
      };
    }

    // Send to FCM
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`;

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = (await response.json()) as { name: string };
      // FCM returns message ID as "projects/{project_id}/messages/{message_id}"
      const messageId = data.name?.split('/').pop() || data.name;

      console.log(`[FCM] Push sent successfully: ${messageId} (${latency}ms)`);

      trackAppMetric({
        name: 'fcm_push_sent',
        value: 1,
        properties: {
          category: req.category,
          latencyMs: latency,
        },
      });

      return {
        success: true,
        messageId,
        isTokenInvalid: false,
        isRetryable: false,
      };
    }

    // Handle error response
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: Array<{ errorCode?: string; '@type'?: string }>;
      };
    };

    const errorCode = errorData.error?.status ||
      errorData.error?.details?.[0]?.errorCode ||
      `HTTP_${response.status}`;
    const errorMessage = errorData.error?.message || 'Unknown FCM error';

    const isTokenInvalid = INVALID_TOKEN_ERRORS.includes(errorCode);
    const isRetryable = RETRYABLE_ERRORS.includes(errorCode) || response.status >= 500;

    console.warn(`[FCM] Push failed: ${errorCode} - ${errorMessage} (${latency}ms)`, {
      statusCode: response.status,
      errorCode,
      isTokenInvalid,
      isRetryable,
    });

    trackAppEvent({
      name: 'fcm_push_failed',
      properties: {
        category: req.category,
        errorCode,
        statusCode: response.status,
        isTokenInvalid,
        isRetryable,
        latencyMs: latency,
      },
    });

    return {
      success: false,
      errorCode,
      errorMessage,
      isTokenInvalid,
      isRetryable,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = (error as Error).message;
    const configIssue = Boolean(configError);

    const eventName = configIssue ? 'fcm_push_config_error' : 'fcm_push_exception';
    const logPayload = {
      category: req.category,
      error: configIssue ? configError || errorMessage : errorMessage,
      latencyMs: latency,
    };

    if (configIssue) {
      console.warn(`[FCM] Push skipped: ${logPayload.error} (${latency}ms)`);
    } else {
      console.error(`[FCM] Push exception: ${errorMessage} (${latency}ms)`, error);
    }

    trackAppEvent({
      name: eventName,
      properties: logPayload,
    });

    const isRetryable = !configIssue && (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT')
    );

    return {
      success: false,
      errorCode: configIssue ? 'CONFIG_ERROR' : 'EXCEPTION',
      errorMessage: logPayload.error,
      isTokenInvalid: false,
      isRetryable,
    };
  }
}

// ============================================================================
// BATCH SEND (for multiple devices)
// ============================================================================

export interface FcmBatchResult {
  success: number;
  failed: number;
  invalidTokens: string[];
  errors: Array<{ deviceId: string; error: string; isRetryable: boolean }>;
}

/**
 * Send push notification to multiple devices
 * Returns aggregated results with invalid token tracking
 */
export async function sendToDevices(
  devices: UserDeviceToken[],
  payload: PushPayload,
  category: NotificationCategory = 'SOCIAL'
): Promise<FcmBatchResult> {
  const result: FcmBatchResult = {
    success: 0,
    failed: 0,
    invalidTokens: [],
    errors: [],
  };

  // Filter to Android devices only for FCM
  // iOS devices will be handled separately when APNS is implemented
  const fcmDevices = devices.filter((d) => d.platform === 'android');
  const iosDevices = devices.filter((d) => d.platform === 'ios');

  if (iosDevices.length > 0) {
    console.log(`[FCM] Skipping ${iosDevices.length} iOS devices (APNS not yet implemented)`);
    // Mark iOS as failed with retryable=false (not a transient error)
    for (const device of iosDevices) {
      result.failed++;
      result.errors.push({
        deviceId: device.deviceId,
        error: 'APNS_NOT_IMPLEMENTED',
        isRetryable: false,
      });
    }
  }

  // Send to each FCM device
  for (const device of fcmDevices) {
    const sendRequest: FcmSendRequest = {
      token: device.pushToken,
      title: payload.title,
      body: payload.body,
      data: {
        ...payload.data,
        deeplink: payload.deeplink || '',
      },
      androidConfig: {
        priority: 'HIGH',
        // Use category-specific notification channels
        channelId: getCategoryChannelId(category),
      },
      category,
    };

    const sendResult = await sendToDevice(sendRequest);

    if (sendResult.success) {
      result.success++;
    } else {
      result.failed++;

      if (sendResult.isTokenInvalid) {
        result.invalidTokens.push(device.deviceId);
      }

      result.errors.push({
        deviceId: device.deviceId,
        error: sendResult.errorCode || 'UNKNOWN',
        isRetryable: sendResult.isRetryable || false,
      });
    }
  }

  return result;
}

/**
 * Map notification category to Android notification channel ID
 * These channels must be created in the Android app
 */
function getCategoryChannelId(category: NotificationCategory): string {
  switch (category) {
    case 'SOCIAL':
      return 'asora_social';
    case 'NEWS':
      return 'asora_news';
    case 'MARKETING':
      return 'asora_marketing';
    case 'SAFETY':
      return 'asora_safety';
    case 'SECURITY':
      return 'asora_security';
    default:
      return 'asora_default';
  }
}

// ============================================================================
// SINGLETON CLIENT INTERFACE (for compatibility with existing code)
// ============================================================================

export class FcmClient {
  private config: FcmConfig | null = null;

  constructor() {
    // Lazy initialization - config loaded on first use
  }

  /**
   * Initialize and validate FCM configuration
   * Called once at startup
   */
  initialize(): void {
    this.config = loadFcmConfig();
    console.log(`[FCM] Client initialized for project: ${this.config.projectId}`);
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return isFcmConfigured();
  }

  /**
   * Send push notification to multiple devices
   * Main entry point for dispatcher
   */
  async sendPushToDevices(
    devices: UserDeviceToken[],
    payload: PushPayload,
    category: NotificationCategory = 'SOCIAL'
  ): Promise<FcmBatchResult> {
    const status = getFcmConfigStatus();
    if (!status.configured) {
      console.warn('[FCM] sendPushToDevices skipped - configuration not ready');
      throw new Error(status.error || 'FCM_NOT_CONFIGURED');
    }

    return sendToDevices(devices, payload, category);
  }
}

// Singleton instance
let fcmClientInstance: FcmClient | null = null;

export function getFcmClient(): FcmClient {
  if (!fcmClientInstance) {
    fcmClientInstance = new FcmClient();
  }
  return fcmClientInstance;
}

export function setFcmClient(client: FcmClient): void {
  fcmClientInstance = client;
}

// For testing - reset cached token
export function _resetTokenCache(): void {
  cachedToken = null;
}

// For testing - reset config
export function _resetConfig(): void {
  fcmConfig = null;
  configError = null;
}
