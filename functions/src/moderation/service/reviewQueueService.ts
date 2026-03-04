/**
 * ASORA MODERATION REVIEW QUEUE SERVICE
 *
 * 🎯 Purpose: Provide paginated list of content needing moderator review
 * 🔐 Security: Restricted to moderator/admin roles
 * 📊 Data: Merges active flags and pending appeals, sorted by creation date
 */

import type { HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ReviewQueueItem {
  id: string;
  contentId: string;
  contentType: string;
  type: 'flag' | 'appeal';
  flagCount: number;
  latestReasons: string[];
  appealStatus: string | null;
  urgencyScore: number;
  createdAt: string;
  preview?: string;
}

export interface ReviewQueueParams {
  context: InvocationContext;
  limit?: number;
  continuationToken?: string;
  filterType?: 'flag' | 'appeal' | 'all';
}

export interface ReviewQueueResult {
  items: ReviewQueueItem[];
  continuationToken: string | null;
  totalCount: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Decode continuation token into separate flag/appeal tokens
 */
function decodeContinuationToken(token: string | undefined): {
  flagToken: string | undefined;
  appealToken: string | undefined;
} {
  if (!token) {
    return { flagToken: undefined, appealToken: undefined };
  }
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return {
      flagToken: decoded.f,
      appealToken: decoded.a,
    };
  } catch {
    return { flagToken: undefined, appealToken: undefined };
  }
}

/**
 * Encode flag/appeal tokens into a single continuation token
 */
function encodeContinuationToken(flagToken: string | undefined, appealToken: string | undefined): string | null {
  if (!flagToken && !appealToken) {
    return null;
  }
  const payload = { f: flagToken, a: appealToken };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

export async function getReviewQueueHandler({
  context,
  limit = DEFAULT_PAGE_SIZE,
  continuationToken,
  filterType = 'all',
}: ReviewQueueParams): Promise<HttpResponseInit> {
  const start = performance.now();
  context.log('moderation.reviewQueue.start', { limit, filterType, hasContinuation: !!continuationToken });

  try {
    const database = getCosmosDatabase();
    const flagsContainerName = process.env.COSMOS_FLAGS_CONTAINER || 'content_flags';
    const flagsContainer = database.container(flagsContainerName);
    const appealsContainer = database.container('appeals');

    // Clamp limit
    const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    
    // Decode continuation token
    const { flagToken, appealToken } = decodeContinuationToken(continuationToken);

    const items: ReviewQueueItem[] = [];
    let nextFlagToken: string | undefined;
    let nextAppealToken: string | undefined;

    // Query active flags (grouped by contentId to get flag count and reasons)
    if (filterType === 'all' || filterType === 'flag') {
      const flagQuery = {
        query: `
          SELECT 
            c.contentId,
            c.contentType,
            COUNT(1) as flagCount,
            ARRAY(SELECT VALUE f.reason FROM f IN c GROUP BY f.reason) as reasons,
            MAX(c.createdAt) as latestCreatedAt,
            MAX(c.priorityScore) as maxPriority
          FROM c
          WHERE c.status = "active"
          GROUP BY c.contentId, c.contentType
          ORDER BY MAX(c.createdAt) DESC
        `,
        parameters: [],
      };

      // For grouped queries, we need a different approach - query individual flags
      const individualFlagQuery = {
        query: `
          SELECT c.id, c.contentId, c.contentType, c.reason, c.createdAt, c.priorityScore, c.additionalDetails
          FROM c
          WHERE c.status = "active"
          ORDER BY c.createdAt DESC
        `,
        parameters: [],
      };

      const flagIterator = flagsContainer.items.query(individualFlagQuery, {
        maxItemCount: pageSize * 3, // Fetch more to allow grouping
        continuationToken: flagToken,
      });

      const flagResponse = await flagIterator.fetchNext();
      nextFlagToken = flagResponse.continuationToken;

      // Group flags by contentId
      const flagsByContent = new Map<string, {
        contentId: string;
        contentType: string;
        reasons: Set<string>;
        latestCreatedAt: string;
        maxPriority: number;
        count: number;
      }>();

      for (const flag of flagResponse.resources) {
        const existing = flagsByContent.get(flag.contentId);
        if (existing) {
          existing.reasons.add(flag.reason);
          existing.count++;
          if (flag.createdAt > existing.latestCreatedAt) {
            existing.latestCreatedAt = flag.createdAt;
          }
          if (flag.priorityScore > existing.maxPriority) {
            existing.maxPriority = flag.priorityScore;
          }
        } else {
          flagsByContent.set(flag.contentId, {
            contentId: flag.contentId,
            contentType: flag.contentType,
            reasons: new Set([flag.reason]),
            latestCreatedAt: flag.createdAt,
            maxPriority: flag.priorityScore,
            count: 1,
          });
        }
      }

      // Convert to queue items
      for (const [contentId, data] of flagsByContent) {
        items.push({
          id: `flag-${contentId}`,
          contentId: data.contentId,
          contentType: data.contentType,
          type: 'flag',
          flagCount: data.count,
          latestReasons: Array.from(data.reasons),
          appealStatus: null,
          urgencyScore: data.maxPriority,
          createdAt: data.latestCreatedAt,
        });
      }
    }

    // Query pending appeals
    if (filterType === 'all' || filterType === 'appeal') {
      const appealQuery = {
        query: `
          SELECT c.id, c.contentId, c.contentType, c.status, c.appealType, 
                 c.urgencyScore, c.createdAt, c.flagCount, c.contentPreview
          FROM c
      WHERE c.status = "pending"
          ORDER BY c.createdAt DESC
        `,
        parameters: [],
      };

      const appealIterator = appealsContainer.items.query(appealQuery, {
        maxItemCount: pageSize,
        continuationToken: appealToken,
      });

      const appealResponse = await appealIterator.fetchNext();
      nextAppealToken = appealResponse.continuationToken;

      for (const appeal of appealResponse.resources) {
        items.push({
          id: appeal.id,
          contentId: appeal.contentId,
          contentType: appeal.contentType,
          type: 'appeal',
          flagCount: appeal.flagCount || 0,
          latestReasons: [appeal.appealType],
          appealStatus: appeal.status,
          urgencyScore: appeal.urgencyScore || 0,
          createdAt: appeal.createdAt,
          preview: appeal.contentPreview,
        });
      }
    }

    // Sort merged items by createdAt (most recent first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Trim to page size
    const paginatedItems = items.slice(0, pageSize);
    const hasMore = items.length > pageSize || !!nextFlagToken || !!nextAppealToken;

    const result: ReviewQueueResult = {
      items: paginatedItems,
      continuationToken: encodeContinuationToken(nextFlagToken, nextAppealToken),
      totalCount: paginatedItems.length,
      hasMore,
    };

    const duration = performance.now() - start;
    context.log('moderation.reviewQueue.success', {
      itemCount: paginatedItems.length,
      hasMore,
      durationMs: duration.toFixed(2),
    });

    return {
      status: 200,
      jsonBody: result,
    };
  } catch (error) {
    context.log('moderation.reviewQueue.error', { message: (error as Error).message });
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
