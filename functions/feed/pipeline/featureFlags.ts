import { AppConfigurationClient } from "@azure/app-configuration";

export class FeatureFlags {
  private client?: AppConfigurationClient;

  constructor() {
    const conn = process.env.AZURE_APP_CONFIG_CONNECTION_STRING;
    if (conn) {
      this.client = new AppConfigurationClient(conn);
    }
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    try {
      if (this.client) {
        const setting = await this.client.getConfigurationSetting({ key });
        if (setting?.value != null) return Number(setting.value);
      }
      const envVal = process.env[key];
      if (envVal != null) return Number(envVal);
    } catch {
      // swallow and use fallback
    }
    return fallback;
  }

  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      if (this.client) {
        const setting = await this.client.getConfigurationSetting({ key });
        if (setting?.value) return JSON.parse(setting.value) as T;
      }
      const envVal = process.env[key];
      if (envVal) return JSON.parse(envVal) as T;
    } catch {
      // swallow and use fallback
    }
    return fallback;
  }
}
