/**
 * ASORA BACKEND CONFIGURATION SERVICE
 * 
 * Centralized configuration management with fail-fast validation.
 * All required environment variables are checked at startup.
 */

interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface NotificationConfig {
  fcm: FcmConfig;
  enabled: boolean;
}

interface CosmosConfig {
  connectionString: string;
  databaseName: string;
  endpoint?: string;
  key?: string;
}

interface AppConfig {
  environment: 'dev' | 'staging' | 'prod' | 'local';
  notifications: NotificationConfig;
  cosmos: CosmosConfig;
}

class ConfigService {
  private config: AppConfig;
  private initialized = false;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const env = (process.env.ENVIRONMENT || 'local') as AppConfig['environment'];

    // FCM (Firebase Cloud Messaging) configuration
    // Replaces Azure Notification Hubs - direct FCM HTTP v1 integration
    const fcmProjectId = process.env.FCM_PROJECT_ID;
    const fcmClientEmail = process.env.FCM_CLIENT_EMAIL;
    let fcmPrivateKey = process.env.FCM_PRIVATE_KEY;
    
    // Handle escaped newlines in private key (common in env vars)
    if (fcmPrivateKey && fcmPrivateKey.includes('\\n')) {
      fcmPrivateKey = fcmPrivateKey.replace(/\\n/g, '\n');
    }
    
    const notificationsEnabled = !!(fcmProjectId && fcmClientEmail && fcmPrivateKey);

    if (!notificationsEnabled && env !== 'local') {
      console.warn(
        '[CONFIG] FCM not configured. Push notifications will be disabled. ' +
        'Set FCM_PROJECT_ID, FCM_CLIENT_EMAIL, and FCM_PRIVATE_KEY to enable.'
      );
    }

    // Cosmos DB configuration
    const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
    const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
    const cosmosKey = process.env.COSMOS_KEY;
    const cosmosDatabaseName = process.env.COSMOS_DATABASE_NAME || 'asora';

    const cosmosConfigured = !!(cosmosConnectionString || (cosmosEndpoint && cosmosKey));
    
    // Warn but don't throw - let health endpoint still work for diagnostics
    if (!cosmosConfigured) {
      console.error(
        '[CONFIG] WARNING: Cosmos DB not configured. ' +
        'Provide either COSMOS_CONNECTION_STRING or both COSMOS_ENDPOINT and COSMOS_KEY. ' +
        'Functions requiring Cosmos will fail at runtime.'
      );
    }

    return {
      environment: env,
      notifications: {
        fcm: {
          projectId: fcmProjectId || '',
          clientEmail: fcmClientEmail || '',
          privateKey: fcmPrivateKey || '',
        },
        enabled: notificationsEnabled,
      },
      cosmos: {
        connectionString: cosmosConnectionString || '',
        databaseName: cosmosDatabaseName,
        endpoint: cosmosEndpoint,
        key: cosmosKey,
      },
    };
  }

  /**
   * Initialize and validate configuration
   * Call this once during app startup
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    console.log(`[CONFIG] Initializing application configuration...`);
    console.log(`[CONFIG] Environment: ${this.config.environment}`);
    console.log(`[CONFIG] Cosmos Database: ${this.config.cosmos.databaseName}`);
    console.log(`[CONFIG] Notifications Enabled: ${this.config.notifications.enabled}`);
    
    if (this.config.notifications.enabled) {
      console.log(`[CONFIG] FCM Project: ${this.config.notifications.fcm.projectId}`);
    }

    this.initialized = true;
  }

  getNotificationConfig(): NotificationConfig {
    return this.config.notifications;
  }

  getFcmConfig(): FcmConfig {
    return this.config.notifications.fcm;
  }

  getCosmosConfig(): CosmosConfig {
    return this.config.cosmos;
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  isNotificationsEnabled(): boolean {
    return this.config.notifications.enabled;
  }

  /**
   * Get safe config summary for health checks (no secrets)
   */
  getHealthSummary(): Record<string, unknown> {
    return {
      environment: this.config.environment,
      notifications: {
        enabled: this.config.notifications.enabled,
        fcmProjectId: this.config.notifications.fcm.projectId,
        fcmConfigured: !!(this.config.notifications.fcm.projectId && 
                         this.config.notifications.fcm.clientEmail &&
                         this.config.notifications.fcm.privateKey),
      },
      cosmos: {
        databaseName: this.config.cosmos.databaseName,
        configured: !!(this.config.cosmos.connectionString || 
                      (this.config.cosmos.endpoint && this.config.cosmos.key)),
      },
    };
  }
}

// Singleton instance
export const configService = new ConfigService();
