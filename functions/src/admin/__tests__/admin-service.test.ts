/**
 * Admin Service Tests
 * 
 * Database integration tests for admin configuration CRUD operations.
 * Tests transactional behavior, version bumping, and audit logging.
 */

import { getAdminConfig, updateAdminConfig, getAuditLog } from '../adminService';

// Mock the postgres client
jest.mock('@shared/clients/postgres', () => {
  const mockQuery = jest.fn();
  const mockClient = {
    query: jest.fn(),
  };
  const mockPool = {
    query: mockQuery,
  };

  return {
    getPool: jest.fn(() => mockPool),
    withClient: jest.fn(async (callback: (client: typeof mockClient) => Promise<any>) => {
      return callback(mockClient);
    }),
    __mockQuery: mockQuery,
    __mockClient: mockClient,
  };
});

import { getPool, withClient } from '@shared/clients/postgres';

const mockPool = getPool() as jest.Mocked<ReturnType<typeof getPool>>;
const mockWithClient = withClient as jest.MockedFunction<typeof withClient>;

// Access the mock client via the module
const getMockClient = () => {
  const mod = jest.requireMock('@shared/clients/postgres');
  return mod.__mockClient as { query: jest.Mock };
};

describe('getAdminConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no config exists', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await getAdminConfig();

    expect(result).toBeNull();
  });

  it('returns config when row exists', async () => {
    const mockRow = {
      id: 1,
      version: 5,
      updated_at: new Date('2025-12-26T12:00:00Z'),
      updated_by: 'admin@asora.co.za',
      payload_json: { schemaVersion: 1, setting: 'value' },
    };

    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockRow] });

    const result = await getAdminConfig();

    expect(result).toEqual({
      version: 5,
      updatedAt: '2025-12-26T12:00:00.000Z',
      updatedBy: 'admin@asora.co.za',
      payload: { schemaVersion: 1, setting: 'value' },
    });
  });
});

describe('updateAdminConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs transactional update with version bump', async () => {
    const mockClient = getMockClient();
    
    // Setup mock responses for the transaction
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ // SELECT FOR UPDATE
        rows: [{
          id: 1,
          version: 3,
          updated_at: new Date(),
          updated_by: 'previous@asora.co.za',
          payload_json: { old: 'config' },
        }],
      })
      .mockResolvedValueOnce(undefined) // INSERT audit
      .mockResolvedValueOnce(undefined) // UPDATE config
      .mockResolvedValueOnce(undefined); // COMMIT

    const result = await updateAdminConfig('admin@asora.co.za', {
      schemaVersion: 1,
      newSetting: 'newValue',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version).toBe(4); // version bumped from 3 to 4
      expect(result.updatedAt).toBeDefined();
    }

    // Verify transaction started
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    
    // Verify SELECT FOR UPDATE was called
    const selectCall = mockClient.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('SELECT') && call[0].includes('FOR UPDATE')
    );
    expect(selectCall).toBeDefined();
    
    // Verify COMMIT was called
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back on error', async () => {
    const mockClient = getMockClient();
    
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('DB connection lost')); // SELECT fails

    await expect(
      updateAdminConfig('admin@asora.co.za', { schemaVersion: 1 })
    ).rejects.toThrow('DB connection lost');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('returns error when config not initialized', async () => {
    const mockClient = getMockClient();
    
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // No config row
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const result = await updateAdminConfig('admin@asora.co.za', {
      schemaVersion: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not initialized');
    }
  });

  it('inserts audit log entry with before/after state', async () => {
    const mockClient = getMockClient();
    const beforePayload = { old: 'config' };
    const afterPayload = { schemaVersion: 1, new: 'config' };
    
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          version: 1,
          updated_at: new Date(),
          updated_by: 'system',
          payload_json: beforePayload,
        }],
      })
      .mockResolvedValueOnce(undefined) // INSERT audit
      .mockResolvedValueOnce(undefined) // UPDATE config
      .mockResolvedValueOnce(undefined); // COMMIT

    await updateAdminConfig('admin@asora.co.za', afterPayload);

    // Find the INSERT audit call
    const auditInsertCall = mockClient.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO admin_audit_log')
    );

    expect(auditInsertCall).toBeDefined();
    if (auditInsertCall) {
      const params = auditInsertCall[1];
      expect(params).toContain('admin@asora.co.za'); // actor
      expect(params).toContain('update'); // action
      expect(params).toContain('admin_config'); // resource
    }
  });
});

describe('getAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when no entries exist', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await getAuditLog(10);

    expect(result).toEqual([]);
  });

  it('returns formatted audit entries', async () => {
    const mockRows = [
      {
        id: BigInt(2),
        ts: new Date('2025-12-26T14:00:00Z'),
        actor: 'admin@asora.co.za',
        action: 'update',
        resource: 'admin_config',
        before_json: { old: 'state' },
        after_json: { new: 'state' },
      },
      {
        id: BigInt(1),
        ts: new Date('2025-12-26T12:00:00Z'),
        actor: 'system',
        action: 'create',
        resource: 'admin_config',
        before_json: null,
        after_json: { initial: 'config' },
      },
    ];

    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

    const result = await getAuditLog(10);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: '2',
      timestamp: '2025-12-26T14:00:00.000Z',
      actor: 'admin@asora.co.za',
      action: 'update',
      resource: 'admin_config',
      before: { old: 'state' },
      after: { new: 'state' },
    });
  });

  it('respects limit parameter', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await getAuditLog(5);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $1'),
      [5]
    );
  });

  it('orders by timestamp descending (newest first)', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await getAuditLog(10);

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY ts DESC'),
      expect.anything()
    );
  });
});
