/**
 * AI Moderation False-Positive Tracker
 *
 * Tracks overturned AI moderation decisions and emits metrics to App Insights.
 * Called when an appeal with type 'false_positive' is approved (overturned).
 */

import { trackAppMetric, trackAppEvent, trackException } from '../../shared/appInsights';

export interface FalsePositiveRecord {
  appealId: string;
  contentId: string;
  originalProvider: string;        // 'hive_v2' | 'azure_content_safety'
  originalScore: number;
  flaggedCategories: string[];
  overturnedBy: 'community_vote' | 'admin_override' | 'timer_expiry';
  timestamp: string;
}

/**
 * Record a false-positive outcome for monitoring and threshold tuning.
 */
export function recordFalsePositive(record: FalsePositiveRecord): void {
  try {
    // Emit as App Insights custom event
    trackAppEvent({
      name: 'moderation_false_positive',
      properties: {
        appealId: record.appealId,
        contentId: record.contentId,
        provider: record.originalProvider,
        originalScore: record.originalScore,
        categories: record.flaggedCategories.join(','),
        overturnedBy: record.overturnedBy,
      },
    });

    // Emit per-category metric for threshold tuning dashboards
    for (const category of record.flaggedCategories) {
      trackAppMetric({
        name: 'ai_false_positive_rate',
        value: 1,
        properties: {
          category,
          provider: record.originalProvider,
        },
      });
    }

    // eslint-disable-next-line no-console
    console.log(`[AI-FP] Recorded false positive: appeal=${record.appealId} provider=${record.originalProvider} score=${record.originalScore}`);
  } catch (err) {
    trackException(err instanceof Error ? err : new Error(String(err)), {
      component: 'falsePositiveTracker',
    });
  }
}
