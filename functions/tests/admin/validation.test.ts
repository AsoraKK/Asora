/**
 * Admin API Validation Tests
 */

import {
  validateAdminConfigRequest,
  validatePayloadSize,
  parseAuditLimit,
  MAX_PAYLOAD_SIZE_BYTES,
} from '../../src/admin/validation';

describe('validateAdminConfigRequest', () => {
  it('accepts valid envelope with schemaVersion and payload', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1,
      payload: { moderationThreshold: 0.8 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.payload).toEqual({ moderationThreshold: 0.8 });
    }
  });

  it('accepts empty payload object', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1,
      payload: {},
    });

    expect(result.success).toBe(true);
  });

  it('rejects null body', () => {
    const result = validateAdminConfigRequest(null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('required');
    }
  });

  it('rejects undefined body', () => {
    const result = validateAdminConfigRequest(undefined);

    expect(result.success).toBe(false);
  });

  it('rejects array body', () => {
    const result = validateAdminConfigRequest([1, 2, 3]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('object');
    }
  });

  it('rejects missing schemaVersion', () => {
    const result = validateAdminConfigRequest({
      payload: { foo: 'bar' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/schemaversion|required/);
    }
  });

  it('rejects non-integer schemaVersion', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1.5,
      payload: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative schemaVersion', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: -1,
      payload: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero schemaVersion', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 0,
      payload: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing payload', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/payload|required/);
    }
  });

  it('rejects null payload', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1,
      payload: null,
    });

    expect(result.success).toBe(false);
  });

  it('rejects array payload', () => {
    const result = validateAdminConfigRequest({
      schemaVersion: 1,
      payload: [1, 2, 3],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/object|record|array/);
    }
  });
});

describe('validatePayloadSize', () => {
  it('accepts small payloads', () => {
    const small = { foo: 'bar' };
    expect(validatePayloadSize(small)).toBe(true);
  });

  it('accepts payloads at limit', () => {
    // Create a payload just under the limit
    const str = 'a'.repeat(MAX_PAYLOAD_SIZE_BYTES - 100);
    const atLimit = { data: str };
    expect(validatePayloadSize(atLimit)).toBe(true);
  });

  it('rejects payloads over limit', () => {
    const str = 'a'.repeat(MAX_PAYLOAD_SIZE_BYTES + 1000);
    const overLimit = { data: str };
    expect(validatePayloadSize(overLimit)).toBe(false);
  });
});

describe('parseAuditLimit', () => {
  it('returns default for null', () => {
    expect(parseAuditLimit(null)).toBe(50);
  });

  it('returns default for undefined', () => {
    expect(parseAuditLimit(undefined)).toBe(50);
  });

  it('returns default for empty string', () => {
    expect(parseAuditLimit('')).toBe(50);
  });

  it('returns default for non-numeric string', () => {
    expect(parseAuditLimit('abc')).toBe(50);
  });

  it('returns default for zero', () => {
    expect(parseAuditLimit('0')).toBe(50);
  });

  it('returns default for negative number', () => {
    expect(parseAuditLimit('-5')).toBe(50);
  });

  it('parses valid number', () => {
    expect(parseAuditLimit('100')).toBe(100);
  });

  it('clamps to max limit', () => {
    expect(parseAuditLimit('500')).toBe(200);
  });

  it('accepts custom default and max', () => {
    expect(parseAuditLimit(null, 25, 100)).toBe(25);
    expect(parseAuditLimit('150', 25, 100)).toBe(100);
  });
});
