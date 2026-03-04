/**
 * ASORA ANALYTICS SINK
 *
 * Purpose: Forward analytics events to Application Insights
 * Architecture: Provider-agnostic abstraction for future flexibility
 */

import { TelemetryClient } from 'applicationinsights';
import { SanitizedAnalyticsEvent } from './types';

/**
 * Analytics sink interface (for future abstraction)
 */
export interface AnalyticsSink {
	/**
	 * Send analytics event to storage/monitoring
	 */
	sendEvent(event: SanitizedAnalyticsEvent): Promise<void>;

	/**
	 * Send batch of analytics events
	 */
	sendBatch(events: SanitizedAnalyticsEvent[]): Promise<void>;
}

/**
 * Application Insights analytics sink
 */
export class AppInsightsSink implements AnalyticsSink {
	constructor(private readonly client: TelemetryClient) {}

	async sendEvent(event: SanitizedAnalyticsEvent): Promise<void> {
		this.client.trackEvent({
			name: event.eventName,
			properties: {
				// Event properties
				...event.properties,
				// Metadata
				userId: event.userId ?? 'guest',
				sessionId: event.sessionId,
				appVersion: event.appVersion,
				platform: event.platform,
				env: event.metadata.env,
				region: event.metadata.region,
				userType: event.metadata.userType,
				ipHash: event.metadata.ipHash,
				ingestedAt: event.metadata.ingestedAt.toISOString(),
			},
			measurements: {
				// Include timestamp as measurement for time-series analysis
				timestamp: event.eventTimestamp.getTime(),
			},
		});

		// Flush to ensure event is sent
		this.client.flush();
	}

	async sendBatch(events: SanitizedAnalyticsEvent[]): Promise<void> {
		for (const event of events) {
			await this.sendEvent(event);
		}
	}
}

/**
 * Create analytics sink from App Insights client
 */
export function createAnalyticsSink(client: TelemetryClient): AnalyticsSink {
	return new AppInsightsSink(client);
}
