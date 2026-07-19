const query = jest.fn();
const connect = jest.fn();
const release = jest.fn();
const cosmosUpsert = jest.fn();
const trackAppEvent = jest.fn();

jest.mock('@azure/functions', () => ({ app: { timer: jest.fn() } }));
jest.mock('@shared/clients/postgres', () => ({ getPool: () => ({ query, connect }) }));
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: () => ({
    database: () => ({ container: () => ({ items: { upsert: cosmosUpsert } }) }),
  }),
}));
jest.mock('@shared/appInsights', () => ({ trackAppEvent }));

import { processEmailProjectionOutbox } from '../../src/auth/worker/emailProjectionOutbox.function';

const USER_ID = '0190f4b8-5800-7000-8000-000000000001';
const context = { error: jest.fn() } as any;

describe('email projection outbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue({ query, release });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM auth_email_projection_outbox')) {
        return { rows: [{ id: 'event-1', aggregate_id: USER_ID, attempt_count: 0 }], rowCount: 1 };
      }
      if (sql.includes('FROM users u JOIN email_auth_credentials')) {
        return {
          rows: [{ id: USER_ID, primary_email: 'person@example.test', created_at: new Date('2026-07-19T12:00:00Z') }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });
    cosmosUpsert.mockResolvedValue({});
  });

  it('marks a successfully projected verification event processed without logging user data', async () => {
    await processEmailProjectionOutbox(context);

    expect(cosmosUpsert).toHaveBeenCalledWith(expect.objectContaining({ id: USER_ID }));
    expect(query.mock.calls.some(([sql]) => String(sql).includes('SET processed_at = NOW()'))).toBe(true);
    expect(trackAppEvent).toHaveBeenCalledWith({
      name: 'auth_email_projection_outbox',
      properties: { claimed: '1', processed: '1', failed: '0' },
    });
    expect(JSON.stringify(trackAppEvent.mock.calls)).not.toContain('person@example.test');
  });

  it('dead-letters a repeatedly failing projection without reverting verification', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM auth_email_projection_outbox')) {
        return { rows: [{ id: 'event-2', aggregate_id: USER_ID, attempt_count: 7 }], rowCount: 1 };
      }
      if (sql.includes('FROM users u JOIN email_auth_credentials')) {
        return {
          rows: [{ id: USER_ID, primary_email: 'person@example.test', created_at: new Date('2026-07-19T12:00:00Z') }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });
    cosmosUpsert.mockRejectedValueOnce(new Error('projection unavailable'));

    await processEmailProjectionOutbox(context);

    expect(query.mock.calls.some(([sql]) => String(sql).includes("last_error_class = 'projection_failure'"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('email_verified_at = NULL'))).toBe(false);
    expect(trackAppEvent).toHaveBeenCalledWith({
      name: 'auth_email_projection_outbox',
      properties: { claimed: '1', processed: '0', failed: '1' },
    });
  });
});
