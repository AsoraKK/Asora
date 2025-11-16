/**
 * ASORA ANALYTICS VALIDATION
 *
 * Purpose: Strict validation and sanitization of analytics payloads
 * Privacy: Enforces PII-free constraints, rejects invalid data
 */

import { AnalyticsPayload, AnalyticsEvent, SanitizedAnalyticsEvent } from './types';

/**
 * Validation error for analytics payloads
 */
export class ValidationError extends Error {
	constructor(message: string, public readonly field?: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Validate event name format
 */
function validateEventName(name: string): void {
	if (typeof name !== 'string' || !name) {
		throw new ValidationError('Event name must be a non-empty string', 'name');
	}

	if (name.length > 64) {
		throw new ValidationError('Event name too long (max 64 chars)', 'name');
	}

	if (!/^[a-z0-9_]+$/.test(name)) {
		throw new ValidationError(
			'Event name must be snake_case (alphanumeric + underscore)',
			'name',
		);
	}
}

/**
 * Validate ISO-8601 timestamp
 */
function validateTimestamp(ts: string): Date {
	if (typeof ts !== 'string' || !ts) {
		throw new ValidationError('Timestamp must be a non-empty string', 'ts');
	}

	const date = new Date(ts);
	if (Number.isNaN(date.getTime())) {
		throw new ValidationError('Invalid ISO-8601 timestamp', 'ts');
	}

	// Reject timestamps too far in future or past (24 hours tolerance)
	const now = Date.now();
	const diff = Math.abs(date.getTime() - now);
	if (diff > 24 * 60 * 60 * 1000) {
		throw new ValidationError('Timestamp too far from current time', 'ts');
	}

	return date;
}

/**
 * Validate and sanitize event properties
 */
function validateProperties(props: unknown): Record<string, unknown> {
	if (props === null || props === undefined) {
		return {};
	}

	if (typeof props !== 'object' || Array.isArray(props)) {
		throw new ValidationError('Properties must be an object', 'props');
	}

	const sanitized: Record<string, unknown> = {};
	const entries = Object.entries(props as Record<string, unknown>);

	if (entries.length > 20) {
		throw new ValidationError('Too many properties (max 20)', 'props');
	}

	for (const [key, value] of entries) {
		// Validate key format
		if (!/^[a-z0-9_]+$/.test(key)) {
			throw new ValidationError(
				`Invalid property key: ${key} (must be snake_case)`,
				`props.${key}`,
			);
		}

		// Validate value type (scalar or small array)
		if (value === null || value === undefined) {
			sanitized[key] = value;
		} else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			// Truncate long strings
			if (typeof value === 'string' && value.length > 256) {
				sanitized[key] = value.substring(0, 256);
			} else {
				sanitized[key] = value;
			}
		} else if (Array.isArray(value)) {
			// Allow small arrays of scalars
			if (value.length > 10) {
				throw new ValidationError(
					`Array property too large (max 10 items): ${key}`,
					`props.${key}`,
				);
			}
			const arrayValues = value.every(
				(v) =>
					v === null ||
					v === undefined ||
					typeof v === 'string' ||
					typeof v === 'number' ||
					typeof v === 'boolean',
			);
			if (!arrayValues) {
				throw new ValidationError(
					`Array property must contain only scalars: ${key}`,
					`props.${key}`,
				);
			}
			sanitized[key] = value;
		} else {
			throw new ValidationError(
				`Invalid property type: ${key} (must be scalar or small array)`,
				`props.${key}`,
			);
		}
	}

	return sanitized;
}

/**
 * Validate single analytics event
 */
function validateEvent(event: AnalyticsEvent): void {
	if (!event || typeof event !== 'object') {
		throw new ValidationError('Event must be an object');
	}

	validateEventName(event.name);
	validateTimestamp(event.ts);
	if (event.props !== undefined) {
		validateProperties(event.props);
	}
}

/**
 * Validate analytics payload structure
 */
export function validatePayload(payload: unknown): AnalyticsPayload {
	if (!payload || typeof payload !== 'object') {
		throw new ValidationError('Payload must be an object');
	}

	const p = payload as Record<string, unknown>;

	// Validate sessionId
	if (typeof p.sessionId !== 'string' || !p.sessionId) {
		throw new ValidationError('sessionId must be a non-empty string', 'sessionId');
	}
	if (p.sessionId.length > 64) {
		throw new ValidationError('sessionId too long (max 64 chars)', 'sessionId');
	}

	// Validate userId (optional, but must be string if provided)
	if (p.userId !== null && p.userId !== undefined && typeof p.userId !== 'string') {
		throw new ValidationError('userId must be a string or null', 'userId');
	}
	if (typeof p.userId === 'string' && p.userId.length > 64) {
		throw new ValidationError('userId too long (max 64 chars)', 'userId');
	}

	// Validate events array
	if (!Array.isArray(p.events)) {
		throw new ValidationError('events must be an array', 'events');
	}
	if (p.events.length === 0) {
		throw new ValidationError('events array must not be empty', 'events');
	}
	if (p.events.length > 50) {
		throw new ValidationError('Too many events (max 50 per batch)', 'events');
	}

	// Validate each event
	for (let i = 0; i < p.events.length; i++) {
		try {
			validateEvent(p.events[i] as AnalyticsEvent);
		} catch (err) {
			if (err instanceof ValidationError) {
				throw new ValidationError(`events[${i}]: ${err.message}`, `events[${i}]`);
			}
			throw err;
		}
	}

	// Validate app metadata
	if (!p.app || typeof p.app !== 'object') {
		throw new ValidationError('app metadata must be an object', 'app');
	}
	const app = p.app as Record<string, unknown>;
	if (typeof app.version !== 'string' || !app.version) {
		throw new ValidationError('app.version must be a non-empty string', 'app.version');
	}
	if (typeof app.platform !== 'string' || !app.platform) {
		throw new ValidationError('app.platform must be a non-empty string', 'app.platform');
	}
	if (!['android', 'ios', 'web', 'desktop'].includes(app.platform)) {
		throw new ValidationError(
			'app.platform must be one of: android, ios, web, desktop',
			'app.platform',
		);
	}

	return payload as AnalyticsPayload;
}

/**
 * Sanitize analytics payload for storage
 *
 * @param payload Validated payload
 * @param verifiedUserId User ID from JWT (null for guests)
 * @param ipHash Hashed IP prefix for abuse detection
 * @param env Environment name
 * @param region Region name
 */
export function sanitizePayload(
	payload: AnalyticsPayload,
	verifiedUserId: string | null,
	ipHash: string | undefined,
	env: string,
	region: string,
): SanitizedAnalyticsEvent[] {
	const sanitized: SanitizedAnalyticsEvent[] = [];

	for (const event of payload.events) {
		const eventTimestamp = validateTimestamp(event.ts);
		const properties = validateProperties(event.props);

		sanitized.push({
			userId: verifiedUserId,
			sessionId: payload.sessionId,
			eventName: event.name,
			eventTimestamp,
			properties,
			appVersion: payload.app.version,
			platform: payload.app.platform,
			metadata: {
				env,
				region,
				userType: verifiedUserId ? 'registered' : 'guest',
				ipHash,
				ingestedAt: new Date(),
			},
		});
	}

	return sanitized;
}
