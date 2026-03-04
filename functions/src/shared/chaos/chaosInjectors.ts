import { ChaosContext, ChaosScenario } from './chaosConfig';

type CosmosOperation = 'read' | 'write';

interface CosmosChaosOptions {
  operation: CosmosOperation;
}

const randomBetween = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class ChaosError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly kind: string, message: string) {
    super(message);
    Object.setPrototypeOf(this, ChaosError.prototype);
  }
}

export async function withHiveChaos<T>(
  ctx: ChaosContext | undefined,
  op: () => Promise<T>
): Promise<T> {
  if (!ctx?.enabled || !ctx.scenario) {
    return op();
  }

  switch (ctx.scenario) {
    case ChaosScenario.HiveTimeout: {
      const wait = randomBetween(2000, 5000);
      await delay(wait);
      throw new ChaosError(503, 'HIVE_TIMEOUT', 'hive', 'Simulated Hive timeout');
    }
    case ChaosScenario.Hive5xx: {
      throw new ChaosError(502, 'HIVE_INTERNAL', 'hive', 'Simulated Hive 5xx outage');
    }
    default:
      return op();
  }
}

export async function withCosmosChaos<T>(
  ctx: ChaosContext | undefined,
  op: () => Promise<T>,
  options: CosmosChaosOptions = { operation: 'read' }
): Promise<T> {
  if (!ctx?.enabled || !ctx.scenario) {
    return op();
  }

  if (ctx.scenario === ChaosScenario.CosmosReadErrors && options.operation === 'read') {
    throw new ChaosError(503, 'COSMOS_READ_FAIL', 'cosmos', 'Simulated Cosmos read failure');
  }

  if (ctx.scenario === ChaosScenario.CosmosWriteErrors && options.operation === 'write') {
    throw new ChaosError(503, 'COSMOS_WRITE_FAIL', 'cosmos', 'Simulated Cosmos write failure');
  }

  return op();
}

export async function withPgChaos<T>(
  ctx: ChaosContext | undefined,
  op: () => Promise<T>
): Promise<T> {
  if (!ctx?.enabled || ctx.scenario !== ChaosScenario.PgConnectionErrors) {
    return op();
  }

  throw new ChaosError(503, 'PG_CONNECTION', 'postgresql', 'Simulated PostgreSQL connection failure');
}
