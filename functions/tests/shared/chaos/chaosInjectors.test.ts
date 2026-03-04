import { ChaosScenario } from '@shared/chaos/chaosConfig';
import { ChaosError, withCosmosChaos, withHiveChaos, withPgChaos } from '@shared/chaos/chaosInjectors';

const noop = async () => 'ok';

describe('chaosInjectors', () => {
  it('returns the original result when chaos is disabled', async () => {
    await expect(withHiveChaos(undefined, noop)).resolves.toBe('ok');
    await expect(withCosmosChaos(undefined, noop, { operation: 'read' })).resolves.toBe('ok');
    await expect(withPgChaos(undefined, noop)).resolves.toBe('ok');
  });

  it('throws a ChaosError for hive timeout', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.HiveTimeout };
    await expect(withHiveChaos(ctx, noop)).rejects.toEqual(
      expect.objectContaining({ code: 'HIVE_TIMEOUT', kind: 'hive', status: 503 })
    );
  });

  it('throws a ChaosError for hive 5xx', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.Hive5xx };
    await expect(withHiveChaos(ctx, noop)).rejects.toEqual(
      expect.objectContaining({ code: 'HIVE_INTERNAL', kind: 'hive', status: 502 })
    );
  });

  it('throws on cosmos read scenario', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.CosmosReadErrors };
    await expect(withCosmosChaos(ctx, noop, { operation: 'read' })).rejects.toEqual(
      expect.objectContaining({ code: 'COSMOS_READ_FAIL', status: 503 })
    );
  });

  it('throws on cosmos write scenario', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.CosmosWriteErrors };
    await expect(withCosmosChaos(ctx, noop, { operation: 'write' })).rejects.toEqual(
      expect.objectContaining({ code: 'COSMOS_WRITE_FAIL', status: 503 })
    );
  });

  it('does not throw on cosmos scenario if operation mismatch', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.CosmosWriteErrors };
    await expect(withCosmosChaos(ctx, noop, { operation: 'read' })).resolves.toBe('ok');
  });

  it('throws for PG connection chaos', async () => {
    const ctx = { enabled: true, scenario: ChaosScenario.PgConnectionErrors };
    await expect(withPgChaos(ctx, noop)).rejects.toEqual(
      expect.objectContaining({ code: 'PG_CONNECTION', kind: 'postgresql', status: 503 })
    );
  });
});
