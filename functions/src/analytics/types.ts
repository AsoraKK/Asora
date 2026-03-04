/**
 * ASORA ANALYTICS TYPES
 *
 * Purpose: Type definitions for analytics events and payloads
 * Privacy: All types enforce PII-free constraints
 */

/**
 * Analytics event from client
 */
export interface AnalyticsEvent {
	/** Event name (snake_case, alphanumeric + underscore) */
	name: string;
	/** ISO-8601 timestamp */
	ts: string;
	/** Event properties (scalar or small arrays, max 20 keys) */
	props?: Record<string, unknown>;
}

/**
 * Analytics payload from client
 */
export interface AnalyticsPayload {
	/** Pseudonymous user ID (internal UUID, null for guests) */
	userId?: string | null;
	/** Random session ID (per app launch) */
	sessionId: string;
	/** Batch of events (max 50 per request) */
	events: AnalyticsEvent[];
	/** App metadata */
	app: {
		/** App version (e.g., "1.0.0+42") */
		version: string;
		/** Platform (android, ios, web, desktop) */
		platform: 'android' | 'ios' | 'web' | 'desktop';
	};
}

/**
 * Validated and sanitized analytics event for storage
 */
export interface SanitizedAnalyticsEvent {
	/** Verified user ID (from JWT, not client-provided) */
	userId: string | null;
	/** Session ID (truncated if needed) */
	sessionId: string;
	/** Event name (validated snake_case) */
	eventName: string;
	/** Event timestamp (validated ISO-8601) */
	eventTimestamp: Date;
	/** Sanitized properties */
	properties: Record<string, unknown>;
	/** App version */
	appVersion: string;
	/** Platform */
	platform: string;
	/** Server-side metadata */
	metadata: {
		/** Environment (dev, staging, prod) */
		env: string;
		/** Region */
		region: string;
		/** User type (guest, registered) */
		userType: 'guest' | 'registered';
		/** Hashed IP prefix (/24) for abuse detection */
		ipHash?: string;
		/** Ingestion timestamp */
		ingestedAt: Date;
	};
}
