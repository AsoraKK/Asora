/**
 * Admin API Validation
 * 
 * Schema validation for admin configuration payloads.
 * Uses Zod for type-safe validation matching existing codebase patterns.
 */

import { z } from 'zod';

/**
 * Maximum payload size in bytes (prevents abuse)
 * 64KB should be more than enough for configuration data
 */
export const MAX_PAYLOAD_SIZE_BYTES = 64 * 1024;

/**
 * Schema for the configuration envelope
 * 
 * Rules:
 * - schemaVersion is required integer >= 1
 * - payload is a JSON object (not array/null)
 * - expectedVersion is optional for optimistic locking (if provided, must match server version)
 * - Flexible enough to evolve without defining all fields upfront
 */
export const AdminConfigEnvelopeSchema = z.object({
  schemaVersion: z
    .number()
    .int()
    .min(1, 'schemaVersion must be a positive integer'),
  payload: z
    .record(z.string(), z.unknown())
    .refine((obj) => obj !== null && typeof obj === 'object' && !Array.isArray(obj), {
      message: 'payload must be a JSON object',
    }),
  expectedVersion: z
    .number()
    .int()
    .min(1)
    .optional(),
});

export type AdminConfigEnvelope = z.infer<typeof AdminConfigEnvelopeSchema>;

/**
 * Validate request body for PUT /admin/config
 * 
 * @param body - Raw request body
 * @returns Validated envelope or error details
 */
export function validateAdminConfigRequest(
  body: unknown
): { success: true; data: AdminConfigEnvelope } | { success: false; error: string; details?: z.ZodIssue[] } {
  // Check for null/undefined
  if (body === null || body === undefined) {
    return { success: false, error: 'Request body is required' };
  }

  // Check if it's an object
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, error: 'Request body must be a JSON object' };
  }

  // Validate against schema
  const result = AdminConfigEnvelopeSchema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const errorMessage = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Invalid request body';

    return {
      success: false,
      error: errorMessage,
      details: result.error.issues,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate payload size to prevent abuse
 * 
 * @param payload - JSON payload object
 * @returns true if within size limits
 */
export function validatePayloadSize(payload: unknown): boolean {
  const serialized = JSON.stringify(payload);
  return Buffer.byteLength(serialized, 'utf8') <= MAX_PAYLOAD_SIZE_BYTES;
}

/**
 * Validate and parse limit query parameter for audit endpoint
 * 
 * @param limitStr - Raw limit string from query
 * @param defaultLimit - Default limit if not provided
 * @param maxLimit - Maximum allowed limit
 * @returns Clamped limit value
 */
export function parseAuditLimit(
  limitStr: string | null | undefined,
  defaultLimit = 50,
  maxLimit = 200
): number {
  if (!limitStr) {
    return defaultLimit;
  }

  const parsed = parseInt(limitStr, 10);

  if (isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}
