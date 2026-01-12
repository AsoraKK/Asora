import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { profileService } from '../../users/service/profileService';
import { requireActiveAdmin } from '../adminAuthUtils';
import { extractPreview, fetchContentById, getLatestDecisionSummary, mapContentState } from '../moderationAdminUtils';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type FlagStatusFilter = 'open' | 'resolved' | 'all';

interface FlagGroup {
  flagId: string;
  contentId: string;
  contentType: string;
  flagCount: number;
  reasonCategories: Set<string>;
  lastFlaggedAt: string;
  status: 'OPEN' | 'RESOLVED';
}

interface UserSummary {
  displayName: string | null;
  handle: string | null;
}

async function lookupUserSummary(
  authorId: string
): Promise<UserSummary | null> {
  const db = getTargetDatabase();
  const { resources } = await db.users.items
    .query(
      {
        query: 'SELECT TOP 1 c.displayName, c.username FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: authorId }],
      },
      { maxItemCount: 1 }
    )
    .fetchAll();

  const user = resources[0] as { displayName?: string; username?: string } | undefined;
  if (!user) {
    return null;
  }

  return {
    displayName: user.displayName ?? null,
    handle: user.username ?? null,
  };
}

function parseLimit(value?: string | null): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function resolveStatusFilter(value?: string | null): FlagStatusFilter {
  switch ((value || '').toLowerCase()) {
    case 'resolved':
      return 'resolved';
    case 'all':
      return 'all';
    default:
      return 'open';
  }
}

export async function listFlagQueue(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const statusFilter = resolveStatusFilter(req.query?.get?.('status'));
  const limit = parseLimit(req.query?.get?.('limit'));
  const cursor = req.query?.get?.('cursor') ?? undefined;

  try {
    const db = getTargetDatabase();
    const statusClause =
      statusFilter === 'all'
        ? ''
        : 'AND c.status = @status';
    const statusParam =
      statusFilter === 'resolved' ? 'resolved' : 'active';

    const query = {
      query: `
        SELECT c.id, c.contentId, c.contentType, c.reason, c.createdAt, c.status
        FROM c
        WHERE 1=1
        ${statusClause}
        ORDER BY c.createdAt DESC
      `,
      parameters: statusFilter === 'all' ? [] : [{ name: '@status', value: statusParam }],
    };

    const flagResponse = await db.flags.items
      .query(query, { maxItemCount: limit * 4, continuationToken: cursor })
      .fetchNext();

    const groups = new Map<string, FlagGroup>();
    for (const flag of flagResponse.resources) {
      const key = flag.contentId as string;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          flagId: flag.id as string,
          contentId: key,
          contentType: flag.contentType as string,
          flagCount: 1,
          reasonCategories: new Set([flag.reason as string]),
          lastFlaggedAt: flag.createdAt as string,
          status: flag.status === 'active' ? 'OPEN' : 'RESOLVED',
        });
      } else {
        existing.flagCount += 1;
        existing.reasonCategories.add(flag.reason as string);
        if (flag.createdAt > existing.lastFlaggedAt) {
          existing.lastFlaggedAt = flag.createdAt as string;
          existing.flagId = flag.id as string;
        }
        if (flag.status === 'active') {
          existing.status = 'OPEN';
        }
      }
    }

    const grouped = Array.from(groups.values())
      .sort((a, b) => b.lastFlaggedAt.localeCompare(a.lastFlaggedAt))
      .slice(0, limit);

    const items = await Promise.all(
      grouped.map(async (group) => {
        const content = await fetchContentById(group.contentType as 'post' | 'comment' | 'user', group.contentId);
        const doc = content?.document;
        const authorId =
          (doc?.authorId as string | undefined) ??
          (doc?.userId as string | undefined) ??
          group.contentId;
        const [authorProfile, authorSummary] = await Promise.all([
          authorId ? profileService.getProfile(authorId) : Promise.resolve(null),
          authorId ? lookupUserSummary(authorId) : Promise.resolve(null),
        ]);
        const decision = await getLatestDecisionSummary(group.contentId);
        const displayName = authorProfile?.displayName ?? authorSummary?.displayName ?? null;
        const handle = authorSummary?.handle ?? null;

        return {
          content: {
            contentId: group.contentId,
            type: group.contentType,
            createdAt: doc?.createdAt ?? null,
            preview: doc ? extractPreview(group.contentType as 'post' | 'comment' | 'user', doc) : null,
          },
          author: {
            authorId,
            displayName,
            handle,
          },
          flags: {
            flagId: group.flagId,
            flagCount: group.flagCount,
            reasonCategories: Array.from(group.reasonCategories),
            lastFlaggedAt: group.lastFlaggedAt,
          },
          state: doc ? mapContentState(doc.status as string | undefined) : 'PUBLISHED',
          moderation: {
            lastDecisionAt: decision?.decidedAt ?? null,
            configVersionUsed: decision?.configVersionUsed ?? null,
          },
          status: group.status,
        };
      })
    );

    return createSuccessResponse({
      items,
      nextCursor: flagResponse.continuationToken ?? null,
      count: items.length,
    });
  } catch (error) {
    context.error('admin.flags.list_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to list flags');
  }
}

app.http('admin_flags_list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/flags',
  handler: requireActiveAdmin(listFlagQueue),
});
