/**
 * Admin Configuration Service
 * 
 * Database operations for admin configuration and audit logging.
 * Implements transactional updates with version bumping and append-only audit.
 */

import { getPool, withClient } from '@shared/clients/postgres';
import type { PoolClient } from 'pg';
import type {
  AdminConfigRow,
  AdminConfigPayload,
  AdminConfigResponse,
  AdminAuditLogRow,
  AdminAuditLogEntry,
} from './types';

/**
 * Get current admin configuration
 */
export async function getAdminConfig(): Promise<AdminConfigResponse | null> {
  const pool = getPool();

  const result = await pool.query<AdminConfigRow>(
    'SELECT id, version, updated_at, updated_by, payload_json FROM admin_config WHERE id = 1'
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0]!;
  return {
    version: row.version,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
    payload: row.payload_json,
  };
}

/**
 * Update admin configuration with transactional guarantees
 * 
 * Implements:
 * 1. Row-level lock (SELECT FOR UPDATE) to prevent concurrent writes
 * 2. Optimistic locking via expectedVersion (returns 409 on mismatch)
 * 3. Version bump (monotonically increasing)
 * 4. Append-only audit log entry
 * 
 * @param actor - Email/identifier of the user making the change
 * @param newPayload - New configuration payload
 * @param expectedVersion - Optional: expected current version for optimistic locking
 * @returns Updated config or error
 */
export async function updateAdminConfig(
  actor: string,
  newPayload: AdminConfigPayload,
  expectedVersion?: number
): Promise<{ success: true; version: number; updatedAt: string } | { success: false; error: string; code?: string }> {
  return withClient(async (client: PoolClient) => {
    try {
      // Start transaction
      await client.query('BEGIN');

      // Lock the config row and get current state
      const lockResult = await client.query<AdminConfigRow>(
        'SELECT id, version, updated_at, updated_by, payload_json FROM admin_config WHERE id = 1 FOR UPDATE'
      );

      if (lockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Configuration not initialized' };
      }

      const currentRow = lockResult.rows[0]!;
      
      // Optimistic locking check
      if (expectedVersion !== undefined && currentRow.version !== expectedVersion) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          error: `Version conflict: expected ${expectedVersion}, server has ${currentRow.version}`,
          code: 'VERSION_CONFLICT'
        };
      }

      const beforePayload = currentRow.payload_json;
      const newVersion = currentRow.version + 1;
      const now = new Date();

      // Insert audit log entry (append-only)
      await client.query(
        `INSERT INTO admin_audit_log (ts, actor, action, resource, before_json, after_json)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [now, actor, 'update', 'admin_config', JSON.stringify(beforePayload), JSON.stringify(newPayload)]
      );

      // Update config row with new version
      await client.query(
        `UPDATE admin_config
         SET version = $1, updated_at = $2, updated_by = $3, payload_json = $4
         WHERE id = 1`,
        [newVersion, now, actor, JSON.stringify(newPayload)]
      );

      // Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        version: newVersion,
        updatedAt: now.toISOString(),
      };
    } catch (err) {
      // Rollback on any error
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

/**
 * Get audit log entries (newest first)
 * 
 * @param limit - Maximum number of entries to return
 * @returns Array of audit log entries
 */
export async function getAuditLog(limit: number): Promise<AdminAuditLogEntry[]> {
  const pool = getPool();

  const result = await pool.query<AdminAuditLogRow>(
    `SELECT id, ts, actor, action, resource, before_json, after_json
     FROM admin_audit_log
     ORDER BY ts DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id.toString(),
    timestamp: row.ts.toISOString(),
    actor: row.actor,
    action: row.action,
    resource: row.resource,
    before: row.before_json,
    after: row.after_json,
  }));
}

/**
 * Initialize admin config if not exists (idempotent)
 * Called at startup or first request
 */
export async function ensureAdminConfigExists(): Promise<void> {
  const pool = getPool();

  await pool.query(
    `INSERT INTO admin_config (id, version, updated_at, updated_by, payload_json)
     VALUES (1, 1, NOW(), 'system', '{"schemaVersion": 1}'::jsonb)
     ON CONFLICT (id) DO NOTHING`
  );
}
