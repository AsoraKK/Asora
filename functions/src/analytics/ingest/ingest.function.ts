/**
 * ASORA ANALYTICS INGESTION ENDPOINT
 *
 * POST /api/analytics/events
 *
 * Purpose: Ingest privacy-safe analytics events from mobile/web clients
 * Auth: Required (JWT bearer token, signed-in or guest)
 * Rate limit: Applied per-principal
 * Privacy: Strips PII, hashes IP, enforces schema validation
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import crypto from 'crypto';

import { parseAuth } from '@shared/middleware/auth';
import { createSuccessResponse, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getTelemetryClient } from '@shared/appInsights';
import { createAnalyticsSink } from '../sink';
import { validatePayload, sanitizePayload, ValidationError } from '../validation';

/**
 * Hash IP address to /24 prefix for coarse geo/abuse detection
 */
function hashIpAddress(ip: string | undefined): string | undefined {
	if (!ip) return undefined;

	// Truncate to /24 (e.g., "192.168.1.0")
	const parts = ip.split('.');
	if (parts.length === 4) {
		const truncated = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
		return crypto.createHash('sha256').update(truncated).digest('hex').substring(0, 16);
	}

	// For IPv6 or invalid, hash full IP
	return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

/**
 * Get environment name from config
 */
function getEnvironment(): string {
	return process.env.NODE_ENV === 'production' ? 'prod' : process.env.NODE_ENV === 'staging' ? 'staging' : 'dev';
}

/**
 * Get region from config
 */
function getRegion(): string {
	return process.env.AZURE_REGION ?? 'north-europe';
}

export async function ingestAnalytics(
	req: HttpRequest,
	context: InvocationContext,
): Promise<HttpResponseInit> {
	try {
		// Require authentication (signed-in or guest with valid token)
		const principal = await parseAuth(req);
		if (!principal) {
			return {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					success: false,
					message: 'Authentication required',
					code: 'UNAUTHORIZED',
				}),
			};
		}

		// Parse and validate payload
		let payload;
		try {
			const body = await req.json();
			payload = validatePayload(body);
		} catch (error) {
			if (error instanceof ValidationError) {
				context.warn('analytics.validation_error', {
					error: error.message,
					field: error.field,
				});
				return {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						success: false,
						message: error.message,
						code: 'VALIDATION_ERROR',
						field: error.field,
					}),
				};
			}
			throw error;
		}

		// Get verified user ID from JWT (discard client-provided userId)
		const verifiedUserId = principal.sub ?? null;

		// Hash IP address for abuse detection (never store raw IP)
		const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? undefined;
		const ipHash = hashIpAddress(clientIp);

		// Sanitize events
		const env = getEnvironment();
		const region = getRegion();
		const sanitized = sanitizePayload(payload, verifiedUserId, ipHash, env, region);

		// Forward to analytics sink (App Insights)
		const telemetryClient = getTelemetryClient();
		if (telemetryClient) {
			const sink = createAnalyticsSink(telemetryClient);
			await sink.sendBatch(sanitized);
		} else {
			context.warn('analytics.no_telemetry_client');
		}

		context.log('analytics.ingested', {
			eventCount: sanitized.length,
			userId: verifiedUserId ?? 'guest',
			sessionId: payload.sessionId,
			platform: payload.app.platform,
		});

		return createSuccessResponse({
			success: true,
			received: sanitized.length,
		});
	} catch (error) {
		if (error instanceof HttpError) {
			return {
				status: error.status,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					success: false,
					message: error.message,
					code: 'HTTP_ERROR',
				}),
			};
		}

		context.error('analytics.ingest_error', {
			message: (error as Error).message,
			stack: (error as Error).stack,
		});
		return serverError();
	}
}

// Apply rate limiting: 60 requests per minute per user
const rateLimitedIngest = withRateLimit(ingestAnalytics, (req, context) =>
	getPolicyForFunction('analytics.ingest'),
);

app.http('ingestAnalytics', {
	methods: ['POST'],
	authLevel: 'anonymous',
	route: 'analytics/events',
	handler: rateLimitedIngest,
});
