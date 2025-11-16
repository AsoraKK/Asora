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
}

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

export function getChaosContext(req: HttpRequest): ChaosContext {
  const headerEnabled = truthy(req.headers.get('x-asora-chaos-enabled'));
  const headerScenario = normalizeScenario(req.headers.get('x-asora-chaos-scenario'));
  const scenario = headerScenario ?? getDefaultScenarioFromEnv();
  const envEnabled = getEnvChaosEnabled();

  const enabled = envEnabled && headerEnabled && !!scenario;
  return { enabled, scenario: enabled ? scenario : undefined };
}

export function isChaosScenario(value?: string | null): value is ChaosScenario {
  return normalizeScenario(value) !== undefined;
}
