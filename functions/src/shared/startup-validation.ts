/**
 * Startup Environment Validation
 *
 * Fail-fast validation of required environment variables.
 * Called once during module load in index.ts.
 */

import { trackException } from './appInsights';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  { name: 'COSMOS_CONNECTION_STRING', required: true, description: 'Primary Cosmos DB connection' },
  { name: 'JWT_SECRET', required: true, description: 'JWT token signing key' },
  { name: 'JWT_ISSUER', required: true, description: 'JWT issuer value' },
  { name: 'HIVE_API_KEY', required: true, description: 'Hive moderation API key' },
  { name: 'KV_URL', required: true, description: 'Azure Key Vault URL' },
  { name: 'B2C_TENANT', required: true, description: 'B2C tenant domain' },
  { name: 'B2C_POLICY', required: true, description: 'B2C signin policy' },
  { name: 'B2C_EXPECTED_ISSUER', required: true, description: 'Expected B2C JWT issuer' },
  { name: 'B2C_EXPECTED_AUDIENCE', required: true, description: 'Expected B2C JWT audience/client' },
  { name: 'FCM_PROJECT_ID', required: true, description: 'Firebase project id' },
  { name: 'FCM_CLIENT_EMAIL', required: true, description: 'Firebase service account email' },
  { name: 'FCM_PRIVATE_KEY', required: true, description: 'Firebase service account private key' },
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', required: false, description: 'App Insights telemetry' },
  { name: 'COSMOS_DATABASE_NAME', required: false, description: 'Cosmos database name (default: asora)' },
  { name: 'CORS_ALLOWED_ORIGINS', required: false, description: 'Comma-separated allowed CORS origins' },
  { name: 'RATE_LIMITS_ENABLED', required: false, description: 'Enable/disable global rate limiting guard' },
  { name: 'RATE_LIMIT_CONTAINER', required: false, description: 'Cosmos container for rate limit state' },
  { name: 'AUDIT_HMAC_KEY', required: false, description: 'HMAC secret for audit PII pseudonymisation (Key Vault)' },
];

export function validateStartupEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of REQUIRED_ENV_VARS) {
    if (!process.env[v.name]) {
      if (v.required) {
        missing.push(`${v.name} — ${v.description}`);
      }
    }
  }

  for (const v of OPTIONAL_ENV_VARS) {
    if (!process.env[v.name]) {
      warnings.push(`${v.name} — ${v.description}`);
    }
  }

  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[STARTUP] Optional env vars not set:\n  - ${warnings.join('\n  - ')}`);
  }

  if (missing.length > 0) {
    const msg = `[STARTUP] CRITICAL — required env vars missing:\n  - ${missing.join('\n  - ')}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    trackException(new Error(msg), { severity: 'critical', component: 'startup' });
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
    const strictStartup =
      process.env.STRICT_STARTUP_VALIDATION === 'true' ||
      nodeEnv === 'production' ||
      appEnv === 'production' ||
      appEnv === 'prod';

    if (strictStartup) {
      throw new Error(msg);
    }
  }

  // ── EasyAuth configuration drift detection ────────────────────────
  // In production, assert that EasyAuth/B2C markers are present.
  // Azure injects WEBSITE_AUTH_ENABLED when Authentication is configured.
  // Its absence in production means auth delegation is misconfigured.
  validateEasyAuthPresence();

  // eslint-disable-next-line no-console
  console.log('[STARTUP] Environment validation complete');
}

/**
 * Detect EasyAuth misconfiguration in production.
 *
 * Azure injects WEBSITE_AUTH_ENABLED=True when Authentication is configured.
 * If that marker is missing in production/staging, upstream identity delegation
 * is broken — every request would have no principal headers and fail open
 * unless our guards catch it.
 *
 * We log a CRITICAL warning and surface it in App Insights.
 * We do NOT throw — the function app must still start so that the health
 * endpoint can report the problem to monitoring.
 */
export function validateEasyAuthPresence(): void {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
  const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
  const isProduction =
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    appEnv === 'production' ||
    appEnv === 'prod' ||
    appEnv === 'staging';

  if (!isProduction) return;

  const easyAuthEnabled = process.env.WEBSITE_AUTH_ENABLED;
  if (easyAuthEnabled?.toLowerCase() === 'true') return;

  const msg =
    '[STARTUP] WARNING — WEBSITE_AUTH_ENABLED is not set to "True". ' +
    'EasyAuth may be disabled or misconfigured. Auth header delegation will not work. ' +
    'All authenticated requests will be rejected by header validation guards.';

  // eslint-disable-next-line no-console
  console.error(msg);
  trackException(new Error(msg), {
    severity: 'critical',
    component: 'startup',
    check: 'easyauth_drift',
  });
}
