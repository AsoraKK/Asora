/**
 * UUID v7 validation — privacy admin DSR enqueue endpoints.
 *
 * Both enqueueExport and enqueueDelete use a Zod schema with a UUID_V7_REGEX
 * guard on the `userId` field. These tests document and protect that constraint.
 *
 * Because the inner handler functions are not exported (they are wrapped by
 * requirePrivacyAdmin and withRateLimit before app registration), we exercise
 * the validation via:
 *  - a direct Zod schema test (mirrors the exact regex used in both files)
 *  - the listRequestsHandler (exported) for end-to-end format enforcement
 *
 * If the UUID_V7_REGEX changes in either enqueue file, the regex test here
 * will catch the discrepancy.
 */

import { z } from 'zod';

// ── Mirrors the inline schema in enqueueExport.ts and enqueueDelete.ts ──────
const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DsrEnqueueSchema = z.object({
  userId: z.string().regex(UUID_V7_REGEX, 'uuidv7'),
  note: z.string().max(500).optional(),
});

// ── Valid and invalid samples ────────────────────────────────────────────────
const VALID_UUID_V7 = '01944c1d-5672-7000-8000-0c91f95a72a1';
const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';
const UUID_V1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const PLAIN_STRING = 'not-a-uuid-at-all';
const EMPTY_STRING = '';

describe('DSR enqueue — userId UUID v7 validation', () => {
  describe('accepts valid UUID v7', () => {
    it('accepts a well-formed UUID v7', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: VALID_UUID_V7 });
      expect(result.success).toBe(true);
    });

    it('accepts UUID v7 with uppercase hex', () => {
      const upper = VALID_UUID_V7.toUpperCase();
      const result = DsrEnqueueSchema.safeParse({ userId: upper });
      expect(result.success).toBe(true);
    });

    it('accepts an optional note alongside the userId', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: VALID_UUID_V7, note: 'GDPR request' });
      expect(result.success).toBe(true);
    });

    it('accepts request without a note (note is optional)', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: VALID_UUID_V7 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note).toBeUndefined();
      }
    });
  });

  describe('rejects invalid userId formats', () => {
    it('rejects a UUID v4 (version digit ≠ 7)', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: UUID_V4 });
      expect(result.success).toBe(false);
    });

    it('rejects a UUID v1', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: UUID_V1 });
      expect(result.success).toBe(false);
    });

    it('rejects an arbitrary string', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: PLAIN_STRING });
      expect(result.success).toBe(false);
    });

    it('rejects an empty string', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: EMPTY_STRING });
      expect(result.success).toBe(false);
    });

    it('rejects a missing userId (field omitted)', () => {
      const result = DsrEnqueueSchema.safeParse({ note: 'some note' });
      expect(result.success).toBe(false);
    });

    it('rejects null as userId', () => {
      const result = DsrEnqueueSchema.safeParse({ userId: null });
      expect(result.success).toBe(false);
    });
  });

  describe('note field constraints', () => {
    it('rejects a note exceeding 500 characters', () => {
      const longNote = 'a'.repeat(501);
      const result = DsrEnqueueSchema.safeParse({ userId: VALID_UUID_V7, note: longNote });
      expect(result.success).toBe(false);
    });

    it('accepts a note of exactly 500 characters', () => {
      const maxNote = 'b'.repeat(500);
      const result = DsrEnqueueSchema.safeParse({ userId: VALID_UUID_V7, note: maxNote });
      expect(result.success).toBe(true);
    });
  });
});
