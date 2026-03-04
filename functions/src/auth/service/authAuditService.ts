/**
 * Auth Audit Service
 *
 * Persists security-relevant authentication events to Cosmos DB.
 * Designed for:
 *  - Compliance audit trails (login, token exchange, session revocation)
 *  - Security incident investigation (failed auth, token reuse, header spoofing)
 *  - PII minimization (userId hashed for non-admin queries, IP truncated)
 *
 * Container: auth_audit (partition key: /category)
 * TTL: 90 days default (configurable via AUTH_AUDIT_TTL_DAYS)
 * Cost control: fire-and-forget writes, no reads on hot path
 */

import { v7 as uuidv7 } from 'uuid';
import { getAzureLogger } from '@shared/utils/logger';
import * as crypto from 'crypto';

const logger = getAzureLogger('auth/audit');

// ── Types ──────────────────────────────────────────────────────────────

export type AuthAuditCategory =
  | 'authentication'  // login, token exchange
  | 'token_lifecycle' // refresh, rotation, revocation
  | 'security'        // spoofing, reuse detection, blocked attempts
  | 'session';        // session create, revoke

export type AuthAuditEventType =
  // Authentication events
  | 'auth.token_exchange.success'
  | 'auth.token_exchange.failure'
  | 'auth.login.success'
  | 'auth.login.failure'
  // Token lifecycle
  | 'auth.token_refresh.success'
  | 'auth.token_refresh.failure'
  | 'auth.token_revoke.all'
  // Security events
  | 'auth.security.forged_header'
  | 'auth.security.token_reuse'
  | 'auth.security.test_user_blocked'
  | 'auth.security.invalid_provider_claim'
  // Session events
  | 'auth.session.created'
  | 'auth.session.revoked';

export type AuthAuditSeverity = 'info' | 'warning' | 'critical';

export interface AuthAuditEvent {
  /** Event type identifier */
  eventType: AuthAuditEventType;
  /** Broad category for partitioning */
  category: AuthAuditCategory;
  /** Severity level */
  severity: AuthAuditSeverity;
  /** User ID (will be stored as-is for admin lookups) */
  userId?: string;
  /** Hashed user ID for non-privileged queries (SHA-256, hex, first 16 chars) */
  userIdHash?: string;
  /** Truncated IP address (last octet zeroed for IPv4, last 80 bits for IPv6) */
  ipAddress?: string;
  /** Request/correlation ID */
  requestId?: string;
  /** Human-readable reason */
  reason?: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Additional non-PII metadata */
  metadata?: Record<string, unknown>;
}

export interface AuthAuditRecord extends AuthAuditEvent {
  id: string;
  timestamp: string;
  /** Cosmos TTL in seconds */
  ttl: number;
}

// ── PII Helpers ────────────────────────────────────────────────────────

/**
 * Get the HMAC secret key for audit pseudonymisation.
 *
 * Sources the key from AUDIT_HMAC_KEY env var (should be a Key Vault reference).
 * Returns undefined if not configured — callers fall back to raw SHA-256.
 */
function getHmacKey(): string | undefined {
  return process.env.AUDIT_HMAC_KEY?.trim() || undefined;
}

/**
 * Hash a user ID to a truncated hex string for audit pseudonymisation.
 *
 * When AUDIT_HMAC_KEY is configured (recommended for production):
 *   Uses HMAC-SHA256 with the secret key. This prevents offline enumeration
 *   even if the audit store is exfiltrated — the attacker cannot reverse
 *   the hash without the key.
 *
 * When AUDIT_HMAC_KEY is NOT configured (dev/test):
 *   Falls back to plain SHA-256. Still linkable within the dataset but
 *   vulnerable to enumeration if user IDs are low-entropy.
 *
 * Output: first 16 hex characters (64 bits of entropy).
 */
export function hashUserId(userId: string): string {
  const hmacKey = getHmacKey();
  if (hmacKey) {
    return crypto.createHmac('sha256', hmacKey).update(userId).digest('hex').slice(0, 16);
  }
  // Fallback: raw SHA-256 (dev/test environments without Key Vault)
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/**
 * Truncate an IP address for PII minimization.
 * IPv4: zero the last octet (192.168.1.42 → 192.168.1.0)
 * IPv6: zero the last 5 groups
 */
export function truncateIp(ip: string): string {
  if (!ip) return '';

  // IPv4
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  // IPv6 (including mapped IPv4)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    // Zero the last 5 groups for privacy
    for (let i = Math.max(3, parts.length - 5); i < parts.length; i++) {
      parts[i] = '0';
    }
    return parts.join(':');
  }

  return ip;
}

// ── Configuration ──────────────────────────────────────────────────────

const DEFAULT_TTL_DAYS = 90;

function getAuditTtlSeconds(): number {
  const envDays = process.env.AUTH_AUDIT_TTL_DAYS;
  const days = envDays ? parseInt(envDays, 10) : DEFAULT_TTL_DAYS;
  if (isNaN(days) || days < 1) return DEFAULT_TTL_DAYS * 86400;
  return days * 86400;
}

// ── Container accessor ─────────────────────────────────────────────────

let containerRef: any = null;

function getAuditContainer() {
  if (containerRef) return containerRef;

  // Lazy import to avoid circular dependencies and allow mocking
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getCosmosDatabase } = require('@shared/clients/cosmos');
  const db = getCosmosDatabase();
  containerRef = db.container('auth_audit');
  return containerRef;
}

/**
 * Reset cached container reference (for testing).
 */
export function _resetAuditContainer(): void {
  containerRef = null;
}

// ── Core write ─────────────────────────────────────────────────────────

/**
 * Record an auth audit event to Cosmos DB.
 *
 * Fire-and-forget: errors are logged but never thrown.
 * This ensures audit failures never break auth flows.
 */
export async function recordAuthAudit(event: AuthAuditEvent): Promise<void> {
  try {
    const container = getAuditContainer();

    const record: AuthAuditRecord = {
      id: uuidv7(),
      timestamp: new Date().toISOString(),
      ttl: getAuditTtlSeconds(),
      ...event,
      // Always compute hash if userId is present
      userIdHash: event.userId ? hashUserId(event.userId) : undefined,
      // Always truncate IP
      ipAddress: event.ipAddress ? truncateIp(event.ipAddress) : undefined,
    };

    await container.items.create(record);
  } catch (error) {
    // Fire-and-forget — never let audit failures break auth
    logger.warn('auth.audit.write_failed', {
      eventType: event.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Convenience helpers ────────────────────────────────────────────────

/** Record a successful token exchange (login) */
export function auditTokenExchange(
  userId: string,
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.token_exchange.success',
    category: 'authentication',
    severity: 'info',
    userId,
    requestId,
    ipAddress: ip,
    success: true,
  });
}

/** Record a failed token exchange */
export function auditTokenExchangeFailure(
  reason: string,
  requestId?: string,
  ip?: string,
  userId?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.token_exchange.failure',
    category: 'authentication',
    severity: 'warning',
    userId,
    requestId,
    ipAddress: ip,
    reason,
    success: false,
  });
}

/** Record a successful token refresh */
export function auditTokenRefresh(
  userId: string,
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.token_refresh.success',
    category: 'token_lifecycle',
    severity: 'info',
    userId,
    requestId,
    ipAddress: ip,
    success: true,
  });
}

/** Record a failed token refresh */
export function auditTokenRefreshFailure(
  reason: string,
  requestId?: string,
  ip?: string,
  userId?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.token_refresh.failure',
    category: 'token_lifecycle',
    severity: 'warning',
    userId,
    requestId,
    ipAddress: ip,
    reason,
    success: false,
  });
}

/** Record a token reuse detection (CRITICAL — possible credential theft) */
export function auditTokenReuse(
  userId: string,
  jtiPrefix: string,
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.security.token_reuse',
    category: 'security',
    severity: 'critical',
    userId,
    requestId,
    ipAddress: ip,
    reason: 'Refresh token reuse detected — possible credential theft',
    success: false,
    metadata: { jtiPrefix },
  });
}

/** Record a forged header detection */
export function auditForgedHeader(
  headerName: string,
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.security.forged_header',
    category: 'security',
    severity: 'critical',
    requestId,
    ipAddress: ip,
    reason: `Forged ${headerName} detected — companion header missing`,
    success: false,
    metadata: { header: headerName },
  });
}

/** Record a blocked test user ID attempt in production */
export function auditTestUserBlocked(
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.security.test_user_blocked',
    category: 'security',
    severity: 'critical',
    requestId,
    ipAddress: ip,
    reason: 'AUTH_ALLOW_TEST_USER_ID attempt blocked in production',
    success: false,
  });
}

/** Record session revocation (all tokens for a user) */
export function auditSessionRevoke(
  userId: string,
  revokedCount: number,
  requestId?: string,
  ip?: string
): Promise<void> {
  return recordAuthAudit({
    eventType: 'auth.session.revoked',
    category: 'session',
    severity: 'info',
    userId,
    requestId,
    ipAddress: ip,
    success: true,
    metadata: { revokedCount },
  });
}
