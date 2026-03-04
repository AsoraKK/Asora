/**
 * Admin API Validation Tests
 * 
 * Tests for schema validation of admin configuration payloads.
 */

import {
  validateAdminConfigRequest,
  validatePayloadSize,
  MAX_PAYLOAD_SIZE_BYTES,
  AdminConfigEnvelopeSchema,
} from '../validation';

describe('validateAdminConfigRequest', () => {
  describe('valid inputs', () => {
    it('accepts valid envelope with minimal payload', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 1,
        payload: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schemaVersion).toBe(1);
        expect(result.data.payload).toEqual({});
      }
    });

    it('accepts valid envelope with nested payload', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 2,
        payload: {
          moderationThresholds: {
            flagThreshold: 0.8,
            autoRemoveThreshold: 0.95,
          },
          features: {
            enableAutoModeration: true,
          },
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schemaVersion).toBe(2);
        expect(result.data.payload).toHaveProperty('moderationThresholds');
      }
    });

    it('accepts payload with various value types', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 1,
        payload: {
          stringValue: 'test',
          numberValue: 42,
          boolValue: true,
          nullValue: null,
          arrayValue: [1, 2, 3],
          nestedObject: { key: 'value' },
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects null body', () => {
      const result = validateAdminConfigRequest(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Request body is required');
      }
    });

    it('rejects undefined body', () => {
      const result = validateAdminConfigRequest(undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Request body is required');
      }
    });

    it('rejects array body', () => {
      const result = validateAdminConfigRequest([1, 2, 3]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Request body must be a JSON object');
      }
    });

    it('rejects primitive string body', () => {
      const result = validateAdminConfigRequest('not an object');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Request body must be a JSON object');
      }
    });

    it('rejects missing schemaVersion', () => {
      const result = validateAdminConfigRequest({
        payload: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('schemaVersion');
      }
    });

    it('rejects non-integer schemaVersion', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 1.5,
        payload: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('schemaVersion');
      }
    });

    it('rejects negative schemaVersion', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: -1,
        payload: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('schemaVersion');
      }
    });

    it('rejects zero schemaVersion', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 0,
        payload: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('schemaVersion');
      }
    });

    it('rejects string schemaVersion', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: '1',
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
        expect(result.error).toContain('payload');
      }
    });

    it('rejects array payload', () => {
      const result = validateAdminConfigRequest({
        schemaVersion: 1,
        payload: [1, 2, 3],
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('validatePayloadSize', () => {
  it('accepts payload within size limit', () => {
    const smallPayload = { key: 'value' };
    expect(validatePayloadSize(smallPayload)).toBe(true);
  });

  it('accepts payload at size limit', () => {
    // Create a payload just under the limit
    const largeString = 'x'.repeat(MAX_PAYLOAD_SIZE_BYTES - 100);
    const payload = { data: largeString };
    expect(validatePayloadSize(payload)).toBe(true);
  });

  it('rejects payload exceeding size limit', () => {
    // Create a payload over the limit
    const hugeString = 'x'.repeat(MAX_PAYLOAD_SIZE_BYTES + 1000);
    const payload = { data: hugeString };
    expect(validatePayloadSize(payload)).toBe(false);
  });
});

describe('AdminConfigEnvelopeSchema', () => {
  it('exports a valid Zod schema', () => {
    expect(AdminConfigEnvelopeSchema).toBeDefined();
    expect(typeof AdminConfigEnvelopeSchema.safeParse).toBe('function');
  });

  it('schema parse returns detailed errors', () => {
    const result = AdminConfigEnvelopeSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
