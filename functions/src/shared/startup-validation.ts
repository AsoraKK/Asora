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
    // Don't throw in Flex Consumption — the host must start so health probes can respond.
    // The /ready endpoint will report 503 for missing dependencies.
  }

  // eslint-disable-next-line no-console
  console.log('[STARTUP] Environment validation complete');
}
