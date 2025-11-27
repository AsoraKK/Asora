/**
 * ASORA BACKEND CONFIGURATION SERVICE
 * 
 * Centralized configuration management with fail-fast validation.
 * All required environment variables are checked at startup.
 */

interface NotificationConfig {
  hubConnectionString: string;
  hubName: string;
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

    // Notification Hubs configuration
    const hubConnectionString = process.env.NOTIFICATION_HUB_CONNECTION_STRING;
    const hubName = process.env.NOTIFICATION_HUB_NAME;
    const notificationsEnabled = !!(hubConnectionString && hubName);

    if (!notificationsEnabled && env !== 'local') {
      console.warn(
        '[CONFIG] Notification Hubs not configured. Push notifications will be disabled. ' +
        'Set NOTIFICATION_HUB_CONNECTION_STRING and NOTIFICATION_HUB_NAME to enable.'
      );
    }

    // Cosmos DB configuration
    const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
    const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
    const cosmosKey = process.env.COSMOS_KEY;
    const cosmosDatabaseName = process.env.COSMOS_DATABASE_NAME || 'asora';

    if (!cosmosConnectionString && !(cosmosEndpoint && cosmosKey)) {
      throw new Error(
        '[CONFIG] FATAL: Cosmos DB not configured. ' +
        'Provide either COSMOS_CONNECTION_STRING or both COSMOS_ENDPOINT and COSMOS_KEY.'
      );
    }

    return {
      environment: env,
      notifications: {
        hubConnectionString: hubConnectionString || '',
        hubName: hubName || 'asora-notifications',
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

    console.log('[CONFIG] Initializing application configuration...');
    console.log(`[CONFIG] Environment: ${this.config.environment}`);
    console.log(`[CONFIG] Cosmos Database: ${this.config.cosmos.databaseName}`);
    console.log(`[CONFIG] Notifications Enabled: ${this.config.notifications.enabled}`);
    
    if (this.config.notifications.enabled) {
      console.log(`[CONFIG] Notification Hub: ${this.config.notifications.hubName}`);
    }

    this.initialized = true;
  }

  getNotificationConfig(): NotificationConfig {
    return this.config.notifications;
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
        hubName: this.config.notifications.hubName,
        hubConfigured: !!this.config.notifications.hubConnectionString,
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
