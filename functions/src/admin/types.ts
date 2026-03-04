/**
 * Admin API Types
 * 
 * Type definitions for admin configuration and audit endpoints.
 */

/**
 * Stored admin configuration row from database
 */
export interface AdminConfigRow {
  id: number;
  version: number;
  updated_at: Date;
  updated_by: string;
  payload_json: AdminConfigPayload;
}

/**
 * Admin configuration payload (stored in payload_json)
 * The schemaVersion field allows for future migrations
 */
export interface AdminConfigPayload {
  schemaVersion: number;
  [key: string]: unknown;
}

/**
 * API response for GET /admin/config
 */
export interface AdminConfigResponse {
  version: number;
  updatedAt: string;
  updatedBy: string;
  payload: AdminConfigPayload;
}

/**
 * Request body for PUT /admin/config
 */
export interface UpdateAdminConfigRequest {
  schemaVersion: number;
  payload: Record<string, unknown>;
}

/**
 * API response for PUT /admin/config
 */
export interface UpdateAdminConfigResponse {
  ok: true;
  version: number;
  updatedAt: string;
}

/**
 * Audit log row from database
 */
export interface AdminAuditLogRow {
  id: string;
  ts: Date;
  actor: string;
  action: string;
  resource: string;
  before_json: unknown | null;
  after_json: unknown | null;
}

/**
 * API response for audit log entry
 */
export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  before: unknown | null;
  after: unknown | null;
}

/**
 * API response for GET /admin/audit
 */
export interface AdminAuditResponse {
  entries: AdminAuditLogEntry[];
  limit: number;
}

/**
 * Cloudflare Access JWT claims
 */
export interface CloudflareAccessClaims {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  type: string;
  identity_nonce?: string;
  custom?: Record<string, unknown>;
}
