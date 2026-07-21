/**
 * Startup Environment Validation
 *
 * Fail-fast validation of required environment variables.
 * Called once during module load in index.ts.
 */

import { trackException } from './appInsights';
import { originGatewayConfigurationErrors } from './security/originGatewayAuth';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  { name: 'COSMOS_CONNECTION_STRING', required: true, description: 'Primary Cosmos DB connection' },
  { name: 'JWT_SECRET', required: true, description: 'JWT token signing key' },
  { name: 'INVITE_CODE_PEPPER', required: true, description: 'Pepper for hashing Alpha invite codes' },
  { name: 'JWT_ISSUER', required: true, description: 'JWT issuer value' },
  { name: 'HIVE_API_KEY', required: true, description: 'Hive moderation API key' },
  { name: 'KV_URL', required: true, description: 'Azure Key Vault URL' },
  { name: 'FCM_PROJECT_ID', required: true, description: 'Firebase project id' },
  { name: 'FCM_CLIENT_EMAIL', required: true, description: 'Firebase service account email' },
  { name: 'FCM_PRIVATE_KEY', required: true, description: 'Firebase service account private key' },
  { name: 'GOOGLE_IDENTITY_PLATFORM_API_KEY', required: true, description: 'Identity Platform password sign-in API key' },
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', required: false, description: 'App Insights telemetry' },
  { name: 'COSMOS_DATABASE_NAME', required: false, description: 'Cosmos database name (default: asora)' },
  { name: 'CORS_ALLOWED_ORIGINS', required: false, description: 'Comma-separated or JSON-array allowed CORS origins' },
  { name: 'RATE_LIMITS_ENABLED', required: false, description: 'Enable/disable global rate limiting guard' },
  { name: 'RATE_LIMIT_CONTAINER', required: false, description: 'Cosmos container for rate limit state' },
  { name: 'AUDIT_HMAC_KEY', required: false, description: 'HMAC secret for audit PII pseudonymisation (Key Vault)' },
  { name: 'ORIGIN_GATEWAY_AUTH_MODE', required: false, description: 'Origin access mode: off, observe, dual, or enforce' },
  { name: 'ORIGIN_GATEWAY_TOKEN', required: false, description: 'Current Cloudflare-to-Azure origin token' },
  { name: 'ORIGIN_GATEWAY_TOKEN_NEXT', required: false, description: 'Next Cloudflare-to-Azure origin token' },
  { name: 'ORIGIN_OPERATIONAL_TOKEN', required: false, description: 'Health-only direct operational token' },
  { name: 'ORIGIN_GATEWAY_DUAL_UNTIL', required: false, description: 'UTC dual-mode expiry' },
  { name: 'ORIGIN_GATEWAY_LEGACY_ALLOWLIST', required: false, description: 'Strict JSON temporary legacy route allowlist' },
];

export function validateStartupEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const variable of REQUIRED_ENV_VARS) {
    if (!process.env[variable.name] && variable.required) {
      missing.push(`${variable.name} - ${variable.description}`);
    }
  }

  for (const variable of OPTIONAL_ENV_VARS) {
    if (!process.env[variable.name]) {
      warnings.push(`${variable.name} - ${variable.description}`);
    }
  }

  missing.push(...originGatewayConfigurationErrors());

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[STARTUP] Optional env vars not set:\n  - ${warnings.join('\n  - ')}`);
  }

  if (missing.length > 0) {
    const message = `[STARTUP] CRITICAL - required env vars missing:\n  - ${missing.join('\n  - ')}`;
    // eslint-disable-next-line no-console
    console.error(message);
    trackException(new Error(message), { severity: 'critical', component: 'startup' });
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
    const strictStartup =
      process.env.STRICT_STARTUP_VALIDATION === 'true' ||
      nodeEnv === 'production' ||
      appEnv === 'production' ||
      appEnv === 'prod' ||
      appEnv === 'mvp';

    if (strictStartup) {
      throw new Error(message);
    }
  }

  validateEasyAuthPresence();

  // eslint-disable-next-line no-console
  console.log('[STARTUP] Environment validation complete');
}

/**
 * Detect EasyAuth misconfiguration in production.
 *
 * Azure injects WEBSITE_AUTH_ENABLED=True when Authentication is configured.
 * Its absence in production means auth delegation is misconfigured.
 */
export function validateEasyAuthPresence(): void {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
  const isProduction =
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    appEnv === 'production' ||
    appEnv === 'prod' ||
    appEnv === 'staging' ||
    appEnv === 'mvp';

  if (!isProduction) return;

  const easyAuthEnabled = process.env.WEBSITE_AUTH_ENABLED;
  if (easyAuthEnabled?.toLowerCase() === 'true') return;

  const message =
    '[STARTUP] WARNING - WEBSITE_AUTH_ENABLED is not set to "True". ' +
    'EasyAuth may be disabled or misconfigured. Auth header delegation will not work. ' +
    'All authenticated requests will be rejected by header validation guards.';

  // eslint-disable-next-line no-console
  console.error(message);
  trackException(new Error(message), {
    severity: 'critical',
    component: 'startup',
    check: 'easyauth_drift',
  });
}
