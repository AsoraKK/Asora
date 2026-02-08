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
  { name: 'JWT_SIGNING_KEY', required: false, description: 'JWT token signing key' },
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', required: false, description: 'App Insights telemetry' },
  { name: 'FCM_PROJECT_ID', required: false, description: 'Firebase Cloud Messaging project' },
  { name: 'FCM_CLIENT_EMAIL', required: false, description: 'FCM service account email' },
  { name: 'FCM_PRIVATE_KEY', required: false, description: 'FCM service account key' },
  { name: 'COSMOS_DATABASE_NAME', required: false, description: 'Cosmos database name (default: asora)' },
  { name: 'CORS_ALLOWED_ORIGINS', required: false, description: 'Comma-separated allowed CORS origins' },
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
