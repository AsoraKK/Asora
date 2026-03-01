/**
 * Tests for Auth Audit Service
 *
 * Covers:
 *  - PII helpers (hashUserId, truncateIp)
 *  - recordAuthAudit: Cosmos write, TTL, fire-and-forget error handling
 *  - Convenience helpers: event types, categories, severities
 *  - Container caching + _resetAuditContainer
 */

// ── Cosmos mock ────────────────────────────────────────────────────────
const mockCreate = jest.fn().mockResolvedValue({ resource: {} });

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn(() => ({
      items: { create: mockCreate },
    })),
  })),
}));

// ── Logger mock ────────────────────────────────────────────────────────
const loggerWarnSpy = jest.fn();

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: (...args: any[]) => loggerWarnSpy(...args),
    error: jest.fn(),
  })),
}));

// ── UUID mock (deterministic) ──────────────────────────────────────────
jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-v7'),
}));

import {
  hashUserId,
  truncateIp,
  recordAuthAudit,
  auditTokenExchange,
  auditTokenExchangeFailure,
  auditTokenRefresh,
  auditTokenRefreshFailure,
  auditTokenReuse,
  auditForgedHeader,
  auditTestUserBlocked,
  auditSessionRevoke,
  _resetAuditContainer,
} from '../../src/auth/service/authAuditService';

beforeEach(() => {
  jest.clearAllMocks();
  _resetAuditContainer();
  delete process.env.AUTH_AUDIT_TTL_DAYS;
  delete process.env.AUDIT_HMAC_KEY;
});

// ═══════════════════════════════════════════════════════════════════════
// 1. PII Helpers
// ═══════════════════════════════════════════════════════════════════════
describe('hashUserId', () => {
  it('returns a 16-character hex string (no HMAC key)', () => {
    const result = hashUserId('user-123');
    expect(result).toMatch(/^[a-f0-9]{16}$/);
  });

  it('produces deterministic output (no HMAC key)', () => {
    expect(hashUserId('user-abc')).toBe(hashUserId('user-abc'));
  });

  it('produces different output for different inputs', () => {
    expect(hashUserId('user-a')).not.toBe(hashUserId('user-b'));
  });

  it('uses HMAC-SHA256 when AUDIT_HMAC_KEY is set', () => {
    process.env.AUDIT_HMAC_KEY = 'test-secret-key-from-keyvault';
    const withHmac = hashUserId('user-123');
    expect(withHmac).toMatch(/^[a-f0-9]{16}$/);

    // Compare against raw SHA-256 — must be different
    delete process.env.AUDIT_HMAC_KEY;
    const withoutHmac = hashUserId('user-123');
    expect(withHmac).not.toBe(withoutHmac);
  });

  it('HMAC output changes when key changes', () => {
    process.env.AUDIT_HMAC_KEY = 'key-one';
    const hash1 = hashUserId('user-123');

    process.env.AUDIT_HMAC_KEY = 'key-two';
    const hash2 = hashUserId('user-123');

    expect(hash1).not.toBe(hash2);
  });

  it('HMAC produces deterministic output for same key', () => {
    process.env.AUDIT_HMAC_KEY = 'stable-key';
    expect(hashUserId('user-x')).toBe(hashUserId('user-x'));
  });
});

describe('truncateIp', () => {
  it('zeros last octet of IPv4', () => {
    expect(truncateIp('192.168.1.42')).toBe('192.168.1.0');
  });

  it('zeros last octet for common local IPs', () => {
    expect(truncateIp('10.0.0.255')).toBe('10.0.0.0');
  });

  it('handles IPv6 by zeroing last 5 groups', () => {
    const result = truncateIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    const parts = result.split(':');
    // Last 5 groups should be zeroed
    expect(parts.slice(-5)).toEqual(['0', '0', '0', '0', '0']);
    // First 3 groups preserved
    expect(parts[0]).toBe('2001');
    expect(parts[1]).toBe('0db8');
    expect(parts[2]).toBe('85a3');
  });

  it('returns empty string for falsy input', () => {
    expect(truncateIp('')).toBe('');
  });

  it('returns original string for unrecognized format', () => {
    expect(truncateIp('localhost')).toBe('localhost');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. recordAuthAudit — Core write
// ═══════════════════════════════════════════════════════════════════════
describe('recordAuthAudit', () => {
  it('writes a record to Cosmos with expected structure', async () => {
    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      userId: 'user-xyz',
      requestId: 'req-1',
      success: true,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const record = mockCreate.mock.calls[0][0];

    expect(record.id).toBe('test-uuid-v7');
    expect(record.eventType).toBe('auth.token_exchange.success');
    expect(record.category).toBe('authentication');
    expect(record.severity).toBe('info');
    expect(record.userId).toBe('user-xyz');
    expect(record.requestId).toBe('req-1');
    expect(record.success).toBe(true);
    expect(record.timestamp).toBeDefined();
    expect(new Date(record.timestamp).getTime()).not.toBeNaN();
  });

  it('hashes userId automatically', async () => {
    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      userId: 'user-xyz',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.userIdHash).toBe(hashUserId('user-xyz'));
    expect(record.userIdHash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('truncates IP automatically', async () => {
    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      ipAddress: '192.168.1.42',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.ipAddress).toBe('192.168.1.0');
  });

  it('omits userIdHash when userId is absent', async () => {
    await recordAuthAudit({
      eventType: 'auth.security.forged_header',
      category: 'security',
      severity: 'critical',
      success: false,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.userIdHash).toBeUndefined();
  });

  it('omits ipAddress when not provided', async () => {
    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.ipAddress).toBeUndefined();
  });

  it('uses default TTL of 90 days', async () => {
    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.ttl).toBe(90 * 86400);
  });

  it('respects AUTH_AUDIT_TTL_DAYS env var', async () => {
    process.env.AUTH_AUDIT_TTL_DAYS = '30';
    _resetAuditContainer(); // force re-read

    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.ttl).toBe(30 * 86400);
  });

  it('falls back to default TTL for invalid value', async () => {
    process.env.AUTH_AUDIT_TTL_DAYS = 'not-a-number';

    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });

    const record = mockCreate.mock.calls[0][0];
    expect(record.ttl).toBe(90 * 86400);
  });

  it('fire-and-forget: does NOT throw on Cosmos error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Cosmos write failed'));

    // Should NOT throw
    await expect(
      recordAuthAudit({
        eventType: 'auth.token_exchange.success',
        category: 'authentication',
        severity: 'info',
        success: true,
      })
    ).resolves.toBeUndefined();

    // Should log a warning
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'auth.audit.write_failed',
      expect.objectContaining({
        eventType: 'auth.token_exchange.success',
        error: 'Cosmos write failed',
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Convenience helpers
// ═══════════════════════════════════════════════════════════════════════
describe('convenience audit helpers', () => {
  it('auditTokenExchange writes correct event', async () => {
    await auditTokenExchange('user-1', 'req-1', '10.0.0.1');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.token_exchange.success');
    expect(record.category).toBe('authentication');
    expect(record.severity).toBe('info');
    expect(record.userId).toBe('user-1');
    expect(record.success).toBe(true);
    expect(record.ipAddress).toBe('10.0.0.0'); // truncated
  });

  it('auditTokenExchangeFailure writes correct event', async () => {
    await auditTokenExchangeFailure('invalid_grant', 'req-2', '10.0.0.1', 'user-1');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.token_exchange.failure');
    expect(record.category).toBe('authentication');
    expect(record.severity).toBe('warning');
    expect(record.reason).toBe('invalid_grant');
    expect(record.success).toBe(false);
  });

  it('auditTokenRefresh writes correct event', async () => {
    await auditTokenRefresh('user-1', 'req-3');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.token_refresh.success');
    expect(record.category).toBe('token_lifecycle');
    expect(record.severity).toBe('info');
    expect(record.success).toBe(true);
  });

  it('auditTokenRefreshFailure writes correct event', async () => {
    await auditTokenRefreshFailure('Token expired', 'req-4');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.token_refresh.failure');
    expect(record.category).toBe('token_lifecycle');
    expect(record.severity).toBe('warning');
    expect(record.success).toBe(false);
    expect(record.reason).toBe('Token expired');
  });

  it('auditTokenReuse writes CRITICAL event with jti metadata', async () => {
    await auditTokenReuse('user-1', 'abc12345', 'req-5');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.security.token_reuse');
    expect(record.category).toBe('security');
    expect(record.severity).toBe('critical');
    expect(record.success).toBe(false);
    expect(record.metadata).toEqual({ jtiPrefix: 'abc12345' });
  });

  it('auditForgedHeader writes CRITICAL event with header metadata', async () => {
    await auditForgedHeader('x-ms-client-principal-id', 'req-6');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.security.forged_header');
    expect(record.category).toBe('security');
    expect(record.severity).toBe('critical');
    expect(record.success).toBe(false);
    expect(record.metadata).toEqual({ header: 'x-ms-client-principal-id' });
  });

  it('auditTestUserBlocked writes CRITICAL event', async () => {
    await auditTestUserBlocked('req-7');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.security.test_user_blocked');
    expect(record.category).toBe('security');
    expect(record.severity).toBe('critical');
    expect(record.success).toBe(false);
  });

  it('auditSessionRevoke writes event with revokedCount metadata', async () => {
    await auditSessionRevoke('user-1', 3, 'req-8');

    const record = mockCreate.mock.calls[0][0];
    expect(record.eventType).toBe('auth.session.revoked');
    expect(record.category).toBe('session');
    expect(record.severity).toBe('info');
    expect(record.success).toBe(true);
    expect(record.metadata).toEqual({ revokedCount: 3 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Container caching
// ═══════════════════════════════════════════════════════════════════════
describe('container caching', () => {
  it('reuses cached container across calls', async () => {
    const { getCosmosDatabase } = require('@shared/clients/cosmos');

    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });
    await recordAuthAudit({
      eventType: 'auth.token_refresh.success',
      category: 'token_lifecycle',
      severity: 'info',
      success: true,
    });

    // getCosmosDatabase should only be called once (container cached)
    expect(getCosmosDatabase).toHaveBeenCalledTimes(1);
  });

  it('_resetAuditContainer clears the cache', async () => {
    const { getCosmosDatabase } = require('@shared/clients/cosmos');

    await recordAuthAudit({
      eventType: 'auth.token_exchange.success',
      category: 'authentication',
      severity: 'info',
      success: true,
    });

    _resetAuditContainer();

    await recordAuthAudit({
      eventType: 'auth.token_refresh.success',
      category: 'token_lifecycle',
      severity: 'info',
      success: true,
    });

    // Called twice because cache was reset
    expect(getCosmosDatabase).toHaveBeenCalledTimes(2);
  });
});
