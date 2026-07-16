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
  { name: 'APP_ORIGIN', required: false, description: 'Canonical Lythaus application origin' },
  { name: 'ACS_EMAIL_ENDPOINT', required: false, description: 'Azure Communication Services endpoint' },
  { name: 'AUTH_EMAIL_FROM_ADDRESS', required: false, description: 'Verified Lythaus email sender' },
  { name: 'AUTH_EMAIL_FROM_NAME', required: false, description: 'Email sender display name' },
  { name: 'EMAIL_TOKEN_HMAC_SECRET', required: false, description: 'Email verification/reset token HMAC key' },
  { name: 'AUTH_EMAIL_CLIENT_ID', required: false, description: 'Email authentication OAuth client audience' },
];

function isMvpEnvironment(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
  return nodeEnv === 'production' || appEnv === 'production' || appEnv === 'prod' || appEnv === 'mvp';
}

export function emailAuthConfigurationErrors(): string[] {
  if (!isMvpEnvironment()) return [];

  const errors: string[] = [];
  const appOrigin = process.env.APP_ORIGIN?.trim();
  if (appOrigin !== 'https://app.lythaus.co') {
    errors.push('APP_ORIGIN must be https://app.lythaus.co in the MVP environment');
  }

  const endpoint = process.env.ACS_EMAIL_ENDPOINT?.trim();
  try {
    const parsed = new URL(endpoint ?? '');
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      !parsed.hostname.endsWith('.communication.azure.com')
    ) {
      throw new Error('invalid endpoint');
    }
  } catch {
    errors.push('ACS_EMAIL_ENDPOINT must be an Azure Communication Services HTTPS endpoint');
  }

  if (process.env.AUTH_EMAIL_FROM_ADDRESS?.trim().toLowerCase() !== 'no-reply@mail.lythaus.co') {
    errors.push('AUTH_EMAIL_FROM_ADDRESS must be no-reply@mail.lythaus.co');
  }
  if ((process.env.AUTH_EMAIL_FROM_NAME?.trim() || 'Lythaus') !== 'Lythaus') {
    errors.push('AUTH_EMAIL_FROM_NAME must be Lythaus');
  }
  if ((process.env.EMAIL_TOKEN_HMAC_SECRET?.trim().length ?? 0) < 32) {
    errors.push('EMAIL_TOKEN_HMAC_SECRET must contain at least 32 characters');
  }
  if (!(process.env.AUTH_EMAIL_CLIENT_ID?.trim() || process.env.JWT_AUDIENCE?.trim())) {
    errors.push('AUTH_EMAIL_CLIENT_ID or JWT_AUDIENCE is required for email token issuance');
  }
  return errors;
}

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
  missing.push(...emailAuthConfigurationErrors());

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
