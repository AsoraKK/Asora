/**
 * Admin Service Tests
 * 
 * Tests for database operations (mocked postgres)
 */

import { getAdminConfig, updateAdminConfig, getAuditLog } from '../../src/admin/adminService';

// Mock postgres client
jest.mock('@shared/clients/postgres', () => {
  const mockClient = {
    query: jest.fn(),
  };
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: mockClient.query,
      release: jest.fn(),
    }),
  };
  return {
    getPool: jest.fn().mockReturnValue(mockPool),
    withClient: jest.fn(async (fn: any) => {
      const client = await mockPool.connect();
      try {
        return await fn(client);
      } finally {
        client.release();
      }
    }),
  };
});

import { getPool, withClient } from '@shared/clients/postgres';

const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;
const mockWithClient = withClient as jest.MockedFunction<typeof withClient>;

describe('getAdminConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns config when row exists', async () => {
    const mockRow = {
      id: 1,
      version: 5,
      updated_at: new Date('2024-01-01T12:00:00Z'),
      updated_by: 'kyle@asora.co.za',
      payload_json: { schemaVersion: 1, moderationThreshold: 0.8 },
    };

    mockGetPool().query = jest.fn().mockResolvedValueOnce({ rows: [mockRow] });

    const result = await getAdminConfig();

    expect(result).toEqual({
      version: 5,
      updatedAt: '2024-01-01T12:00:00.000Z',
      updatedBy: 'kyle@asora.co.za',
      payload: { schemaVersion: 1, moderationThreshold: 0.8 },
    });
  });

  it('returns null when no row exists', async () => {
    mockGetPool().query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const result = await getAdminConfig();

    expect(result).toBeNull();
  });
});

describe('updateAdminConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs transactional update with audit log', async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    
    const mockClient = {
      query: jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
        queries.push({ sql, params: params || [] });
        
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return {};
        }
        
        if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
          return {
            rows: [{
              id: 1,
              version: 3,
              updated_at: new Date('2024-01-01'),
              updated_by: 'previous@user.com',
              payload_json: { schemaVersion: 1, old: 'value' },
            }],
          };
        }
        
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    (mockWithClient as jest.Mock).mockImplementation(async (fn: any) => {
      return fn(mockClient);
    });

    const result = await updateAdminConfig('new@user.com', { schemaVersion: 1, new: 'value' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version).toBe(4); // version bumped from 3 to 4
    }

    // Verify transaction flow
    const sqlStatements = queries.map(q => q.sql);
    expect(sqlStatements[0]).toBe('BEGIN');
    expect(sqlStatements).toContainEqual(expect.stringContaining('FOR UPDATE'));
    expect(sqlStatements).toContainEqual(expect.stringContaining('INSERT INTO admin_audit_log'));
    expect(sqlStatements).toContainEqual(expect.stringContaining('UPDATE admin_config'));
    expect(sqlStatements[sqlStatements.length - 1]).toBe('COMMIT');
  });

  it('rolls back on error', async () => {
    const queries: string[] = [];
    
    const mockClient = {
      query: jest.fn().mockImplementation((sql: string) => {
        queries.push(sql);
        
        if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
          throw new Error('Database error');
        }
        
        return {};
      }),
      release: jest.fn(),
    };

    (mockWithClient as jest.Mock).mockImplementation(async (fn: any) => {
      return fn(mockClient);
    });

    await expect(
      updateAdminConfig('user@test.com', { schemaVersion: 1 })
    ).rejects.toThrow('Database error');

    expect(queries).toContain('ROLLBACK');
  });
});

describe('getAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns formatted audit entries', async () => {
    const mockRows = [
      {
        id: '100',
        ts: new Date('2024-01-02T10:00:00Z'),
        actor: 'kyle@asora.co.za',
        action: 'update',
        resource: 'admin_config',
        before_json: { schemaVersion: 1, old: true },
        after_json: { schemaVersion: 1, old: false },
      },
      {
        id: '99',
        ts: new Date('2024-01-01T10:00:00Z'),
        actor: 'system',
        action: 'create',
        resource: 'admin_config',
        before_json: null,
        after_json: { schemaVersion: 1 },
      },
    ];

    mockGetPool().query = jest.fn().mockResolvedValueOnce({ rows: mockRows });

    const result = await getAuditLog(50);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: '100',
      timestamp: '2024-01-02T10:00:00.000Z',
      actor: 'kyle@asora.co.za',
      action: 'update',
      resource: 'admin_config',
      before: { schemaVersion: 1, old: true },
      after: { schemaVersion: 1, old: false },
    });
    expect(result[1]!.before).toBeNull();
  });

  it('passes limit to query', async () => {
    mockGetPool().query = jest.fn().mockResolvedValueOnce({ rows: [] });

    await getAuditLog(25);

    expect(mockGetPool().query).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      [25]
    );
  });
});
