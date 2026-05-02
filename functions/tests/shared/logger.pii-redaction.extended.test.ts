/**
 * Extended PII redaction tests.
 *
 * The existing redaction.test.ts covers IP hashing and vendorToken removal.
 * These tests extend coverage to:
 *  - Bearer/auth/refresh/access token field removal
 *  - Password and credential field removal
 *  - Third-party field removal
 *  - Safe (non-sensitive) field preservation
 *  - Null / undefined value passthrough
 *  - Non-string IP passthrough (hashIpValue type guard)
 *  - Deep nesting and arrays
 */

import { createHash } from 'node:crypto';

// Re-use the same env as the existing test
const HASH_ALG = 'sha256';
const HASH_SALT = 'test-pii-salt';

function expectedHash(value: string): string {
  return createHash(HASH_ALG).update(`${value}:${HASH_SALT}`).digest('hex');
}

describe('redactRecord — extended PII coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DSR_IP_HASH_ALG = HASH_ALG;
    process.env.DSR_IP_HASH_SALT = HASH_SALT;
  });

  // ── Token fields ───────────────────────────────────────────────────────────
  describe('token fields are removed', () => {
    it('removes authToken', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ authToken: 'Bearer eyJhbG...' });
      expect(result.authToken).toBeUndefined();
    });

    it('removes bearerToken', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ bearerToken: 'eyJhbGciOiJSUzI1NiJ9' });
      expect(result.bearerToken).toBeUndefined();
    });

    it('removes accessToken', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ accessToken: 'tok_live_abc123' });
      expect(result.accessToken).toBeUndefined();
    });

    it('removes refreshToken', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' });
      expect(result.refreshToken).toBeUndefined();
    });
  });

  // ── Password fields ────────────────────────────────────────────────────────
  describe('password fields are removed', () => {
    it('removes password', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ username: 'alice', password: 's3cr3t!' });
      expect(result.password).toBeUndefined();
      // Unrelated field preserved
      expect(result.username).toBe('alice');
    });

    it('removes hashedPassword', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ hashedPassword: '$2b$10$...' });
      expect(result.hashedPassword).toBeUndefined();
    });

    it('removes passwordHash', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ passwordHash: '$argon2id$v=19...' });
      expect(result.passwordHash).toBeUndefined();
    });
  });

  // ── Credential fields ──────────────────────────────────────────────────────
  describe('credential fields are removed', () => {
    it('removes credential', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ credential: { key: 'secret-key-xyz' } });
      expect(result.credential).toBeUndefined();
    });

    it('removes awsCredential', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ awsCredential: 'AKIA...' });
      expect(result.awsCredential).toBeUndefined();
    });
  });

  // ── Third-party fields ─────────────────────────────────────────────────────
  describe('third-party / vendor fields are removed', () => {
    it('removes thirdParty', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ thirdParty: 'some-api-key' });
      expect(result.thirdParty).toBeUndefined();
    });

    it('removes third_party (underscore variant)', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ third_party: 'some-api-key' });
      expect(result.third_party).toBeUndefined();
    });
  });

  // ── IP fields are hashed, not removed ─────────────────────────────────────
  describe('IP fields are hashed (not dropped)', () => {
    it('hashes remoteIp', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ remoteIp: '203.0.113.5' });
      expect(result.remoteIp).toBe(expectedHash('203.0.113.5'));
    });

    it('passes through non-string IP values unchanged', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      // Numbers stored in IP fields are unusual but the type guard protects them
      const result = redactRecord({ remoteIp: 3232235777 } as any);
      expect(result.remoteIp).toBe(3232235777);
    });
  });

  // ── Safe (non-sensitive) fields are preserved ──────────────────────────────
  describe('safe fields are preserved intact', () => {
    it('preserves userId, displayName, createdAt unchanged; redacts email (PII)', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const record = {
        userId: 'usr-123',
        email: 'alice@example.com',
        displayName: 'Alice',
        createdAt: '2024-01-01T00:00:00Z',
      };
      const result = redactRecord(record);
      // email IS now in the sensitive patterns — it is redacted
      expect(result.userId).toBe('usr-123');
      expect(result.email).toBeUndefined();
      expect(result.displayName).toBe('Alice');
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  // ── Null / undefined passthrough ───────────────────────────────────────────
  describe('null and undefined values pass through', () => {
    it('keeps null values as null', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ someField: null });
      expect(result.someField).toBeNull();
    });

    it('keeps undefined values as undefined', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({ someField: undefined });
      expect(result.someField).toBeUndefined();
    });
  });

  // ── Deep nesting ───────────────────────────────────────────────────────────
  describe('redaction recurses through nested objects and arrays', () => {
    it('redacts tokens nested inside a context object', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({
        request: {
          headers: {
            authToken: 'Bearer secret',
            userAgent: 'Mozilla/5.0',
          },
          clientIp: '10.0.0.1',
        },
      });
      expect(result.request.headers.authToken).toBeUndefined();
      expect(result.request.headers.userAgent).toBe('Mozilla/5.0');
      expect(result.request.clientIp).toBe(expectedHash('10.0.0.1'));
    });

    it('redacts tokens inside array items', () => {
      const { redactRecord } = require('../../src/privacy/common/redaction');
      const result = redactRecord({
        sessions: [
          { sessionId: 's1', refreshToken: 'tok-a', ipAddress: '1.1.1.1' },
          { sessionId: 's2', refreshToken: 'tok-b', ipAddress: '2.2.2.2' },
        ],
      });
      expect(result.sessions[0].sessionId).toBe('s1');
      expect(result.sessions[0].refreshToken).toBeUndefined();
      expect(result.sessions[0].ipAddress).toBe(expectedHash('1.1.1.1'));
      expect(result.sessions[1].refreshToken).toBeUndefined();
    });
  });
});
