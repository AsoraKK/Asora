import type { HttpRequest } from '@azure/functions';

export enum ChaosScenario {
  HiveTimeout = 'hive_timeout',
  Hive5xx = 'hive_5xx',
  CosmosReadErrors = 'cosmos_read_errors',
  CosmosWriteErrors = 'cosmos_write_errors',
  PgConnectionErrors = 'pg_connection_errors',
}

const truthy = (value?: string | null): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const scenarioValues = new Set(Object.values(ChaosScenario));

export interface ChaosContext {
  readonly enabled: boolean;
  readonly scenario?: ChaosScenario;
  readonly blockedReason?: string;
}

/**
 * Check if the current environment is production.
 * Chaos injection is NEVER allowed in production environments.
 */
function isProductionEnvironment(): boolean {
  const env = (process.env.NODE_ENV ?? '').toLowerCase();
  const environment = (process.env.ENVIRONMENT ?? '').toLowerCase();
  const azureEnv = (process.env.AZURE_FUNCTIONS_ENVIRONMENT ?? '').toLowerCase();

  // Block if any environment indicator suggests production
  const prodIndicators = ['production', 'prod'];
  return (
    prodIndicators.includes(env) ||
    prodIndicators.includes(environment) ||
    prodIndicators.includes(azureEnv)
  );
}

/**
 * Get the CHAOS_ENABLED environment variable.
 * This is the feature flag that must be explicitly enabled.
 */
const getEnvChaosEnabled = () => truthy(process.env.CHAOS_ENABLED);

const getDefaultScenarioFromEnv = (): ChaosScenario | undefined =>
  normalizeScenario(process.env.CHAOS_DEFAULT_SCENARIO);

function normalizeScenario(value?: string | null): ChaosScenario | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (scenarioValues.has(normalized as ChaosScenario)) {
    return normalized as ChaosScenario;
  }
  return undefined;
}

/**
 * Get the chaos context for a request.
 *
 * Chaos injection requires ALL of:
 * 1. Non-production environment (NODE_ENV, ENVIRONMENT, or AZURE_FUNCTIONS_ENVIRONMENT)
 * 2. CHAOS_ENABLED=true environment variable (feature flag)
 * 3. x-asora-chaos-enabled header set to true
 * 4. Valid chaos scenario (from header or CHAOS_DEFAULT_SCENARIO env var)
 *
 * This multi-layer protection ensures chaos can never be accidentally enabled in production.
 */
export function getChaosContext(req: HttpRequest): ChaosContext {
  // SAFETY: Never allow chaos in production - this is the ultimate guard
  if (isProductionEnvironment()) {
    return { enabled: false, blockedReason: 'production_environment' };
  }

  // Check feature flag
  const envEnabled = getEnvChaosEnabled();
  if (!envEnabled) {
    return { enabled: false, blockedReason: 'feature_flag_disabled' };
  }

  // Check request header
  const headerEnabled = truthy(req.headers.get('x-asora-chaos-enabled'));
  if (!headerEnabled) {
    return { enabled: false, blockedReason: 'header_not_set' };
  }

  // Resolve scenario
  const headerScenario = normalizeScenario(req.headers.get('x-asora-chaos-scenario'));
  const scenario = headerScenario ?? getDefaultScenarioFromEnv();
  if (!scenario) {
    return { enabled: false, blockedReason: 'no_valid_scenario' };
  }

  return { enabled: true, scenario };
}

export function isChaosScenario(value?: string | null): value is ChaosScenario {
  return normalizeScenario(value) !== undefined;
}

/**
 * Check if chaos injection is available in the current environment.
 * Useful for conditional logging or diagnostics.
 */
export function isChaosAvailable(): { available: boolean; reason?: string } {
  if (isProductionEnvironment()) {
    return { available: false, reason: 'production_environment' };
  }

  if (!getEnvChaosEnabled()) {
    return { available: false, reason: 'feature_flag_disabled' };
  }

  return { available: true };
}

/**
 * Get chaos configuration summary for diagnostics.
 */
export function getChaosConfigSummary(): {
  featureEnabled: boolean;
  isProduction: boolean;
  defaultScenario?: ChaosScenario;
  availableScenarios: ChaosScenario[];
} {
  return {
    featureEnabled: getEnvChaosEnabled(),
    isProduction: isProductionEnvironment(),
    defaultScenario: getDefaultScenarioFromEnv(),
    availableScenarios: Object.values(ChaosScenario),
  };
}
