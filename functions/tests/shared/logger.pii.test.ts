/**
 * W11 – Privacy-safe logging: expanded PII redaction tests.
 *
 * Covers gaps not addressed by logger.pii-redaction.extended.test.ts:
 *   - email field redaction
 *   - JWT value stripping from message strings
 *   - OAuth claim redaction (sub, oid, sid)
 *   - Provider-specific ID redaction
 *   - Hive AI key redaction
 *   - Azure account key / connection string redaction
 *   - Application Insights instrumentation key redaction
 *   - redactMessageString standalone function
 */

import {
  redactRecord,
  redactMessageString,
} from '@privacy/common/redaction';

// ─────────────────────────────────────────────────────────────────────────────
describe('redactRecord – email fields', () => {
  it('removes a top-level email field', () => {
    const result = redactRecord({ email: 'alice@example.com', name: 'Alice' });
    expect(result).not.toHaveProperty('email');
    expect(result).toHaveProperty('name', 'Alice');
  });

  it('removes userEmail field', () => {
    const result = redactRecord({ userEmail: 'bob@example.com', userId: 'u1' });
    expect(result).not.toHaveProperty('userEmail');
  });

  it('removes primaryEmail field', () => {
    const result = redactRecord({ primaryEmail: 'carol@example.com' });
    expect(result).not.toHaveProperty('primaryEmail');
  });

  it('removes nested email fields', () => {
    const result = redactRecord({ profile: { email: 'dave@example.com', bio: 'hello' } });
    expect((result.profile as Record<string, unknown>)).not.toHaveProperty('email');
    expect((result.profile as Record<string, unknown>)).toHaveProperty('bio', 'hello');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('redactRecord – OAuth / OIDC claims', () => {
  it('removes sub (OAuth subject) field', () => {
    const result = redactRecord({ sub: 'auth0|user123', userId: 'u1' });
    expect(result).not.toHaveProperty('sub');
    expect(result).toHaveProperty('userId', 'u1');
  });

  it('removes oid (Azure AD object ID) field', () => {
    const result = redactRecord({ oid: 'aaaa-bbbb-cccc', tenantId: 't1' });
    expect(result).not.toHaveProperty('oid');
    expect(result).toHaveProperty('tenantId', 't1');
  });

  it('removes sid (session ID) claim field', () => {
    const result = redactRecord({ sid: 'sess-xyz-123', status: 'active' });
    expect(result).not.toHaveProperty('sid');
  });

  it('removes providerId field', () => {
    const result = redactRecord({ providerId: 'google:1234567890', provider: 'google' });
    expect(result).not.toHaveProperty('providerId');
    expect(result).toHaveProperty('provider', 'google');
  });

  it('removes providerSub field', () => {
    const result = redactRecord({ providerSub: 'google-sub-value' });
    expect(result).not.toHaveProperty('providerSub');
  });

  it('removes oauthSub and oauthId fields', () => {
    const result = redactRecord({ oauthSub: 'oauth-sub', oauthId: 'oauth-id', action: 'login' });
    expect(result).not.toHaveProperty('oauthSub');
    expect(result).not.toHaveProperty('oauthId');
    expect(result).toHaveProperty('action', 'login');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('redactRecord – Hive AI keys', () => {
  it('removes hiveApiKey field', () => {
    const result = redactRecord({ hiveApiKey: 'hive-key-abc123', operation: 'moderate' });
    expect(result).not.toHaveProperty('hiveApiKey');
    expect(result).toHaveProperty('operation', 'moderate');
  });

  it('removes hiveKey field', () => {
    const result = redactRecord({ hiveKey: 'hk-secret-value' });
    expect(result).not.toHaveProperty('hiveKey');
  });

  it('removes hiveSecret field', () => {
    const result = redactRecord({ hiveSecret: 'hs-secret-value' });
    expect(result).not.toHaveProperty('hiveSecret');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('redactRecord – Azure infrastructure keys', () => {
  it('removes accountKey (Azure Storage) field', () => {
    const result = redactRecord({ accountKey: 'base64=key==', container: 'blobs' });
    expect(result).not.toHaveProperty('accountKey');
    expect(result).toHaveProperty('container', 'blobs');
  });

  it('removes connectionString field', () => {
    const result = redactRecord({
      connectionString: 'DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y;',
      databaseName: 'asora',
    });
    expect(result).not.toHaveProperty('connectionString');
    expect(result).toHaveProperty('databaseName', 'asora');
  });

  it('removes instrumentationKey field', () => {
    const result = redactRecord({ instrumentationKey: 'abc123-guid-value', service: 'functions' });
    expect(result).not.toHaveProperty('instrumentationKey');
    expect(result).toHaveProperty('service', 'functions');
  });

  it('removes apiKey field', () => {
    const result = redactRecord({ apiKey: 'sk-live-1234567890', endpoint: '/api/v1' });
    expect(result).not.toHaveProperty('apiKey');
    expect(result).toHaveProperty('endpoint', '/api/v1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('redactMessageString()', () => {
  const SAMPLE_JWT =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNjAwMDAwMDAwfQ' +
    '.AAABBBCCC';

  it('replaces a JWT compact serialisation with [jwt-redacted]', () => {
    const result = redactMessageString(`Received token: ${SAMPLE_JWT}`);
    expect(result).toBe('Received token: [jwt-redacted]');
    expect(result).not.toContain('eyJ');
  });

  it('replaces multiple JWTs in the same string', () => {
    const msg = `access=${SAMPLE_JWT} refresh=${SAMPLE_JWT}`;
    const result = redactMessageString(msg);
    expect(result).toBe('access=[jwt-redacted] refresh=[jwt-redacted]');
  });

  it('leaves strings without JWT unchanged', () => {
    const msg = 'user feed.get completed in 45ms';
    expect(redactMessageString(msg)).toBe(msg);
  });

  it('handles empty string without error', () => {
    expect(redactMessageString('')).toBe('');
  });

  it('does not redact regular base64 that lacks three dot-separated parts', () => {
    // Plain base64 without proper header.payload.sig structure should not be affected
    const msg = 'data:image/png;base64,iVBORw0KGgo=';
    const result = redactMessageString(msg);
    // Should be unchanged (no eyJ prefix)
    expect(result).toBe(msg);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('redactRecord – safe fields preserved', () => {
  it('preserves userId, displayName, createdAt', () => {
    const result = redactRecord({
      userId: 'u-abc-123',
      displayName: 'Alice B',
      createdAt: '2024-01-01T00:00:00Z',
    });
    expect(result).toHaveProperty('userId', 'u-abc-123');
    expect(result).toHaveProperty('displayName', 'Alice B');
    expect(result).toHaveProperty('createdAt', '2024-01-01T00:00:00Z');
  });

  it('preserves non-sensitive fields alongside removed ones', () => {
    const result = redactRecord({
      operation: 'feed.get',
      email: 'x@example.com',
      durationMs: 42,
    });
    expect(result).toHaveProperty('operation', 'feed.get');
    expect(result).toHaveProperty('durationMs', 42);
    expect(result).not.toHaveProperty('email');
  });
});
