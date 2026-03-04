import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosDatabase, getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { extractPreview, fetchContentById, getLatestDecisionSummary, mapContentState } from '../moderationAdminUtils';

export async function getFlagDetail(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const flagId = req.params.flagId;
  if (!flagId) {
    return createErrorResponse(400, 'missing_flag_id', 'flagId is required');
  }

  try {
    const db = getTargetDatabase();
    const { resources: flags } = await db.flags.items
      .query(
        {
          query: 'SELECT * FROM c WHERE c.id = @flagId',
          parameters: [{ name: '@flagId', value: flagId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();

    const flag = flags[0];
    if (!flag) {
      return createErrorResponse(404, 'not_found', 'Flag not found');
    }

    const contentId = flag.contentId as string;
    const contentType = flag.contentType as 'post' | 'comment' | 'user';

    const content = await fetchContentById(contentType, contentId);
    const doc = content?.document ?? null;

    const { resources: relatedFlags } = await db.flags.items
      .query(
        {
          query: `
            SELECT c.id, c.reason, c.createdAt, c.status, c.flaggedBy
            FROM c
            WHERE c.contentId = @contentId
            ORDER BY c.createdAt DESC
          `,
          parameters: [{ name: '@contentId', value: contentId }],
        },
        { partitionKey: contentId, maxItemCount: 200 }
      )
      .fetchAll();

    const reporterIds = new Set(
      relatedFlags.map((entry) => entry.flaggedBy).filter(Boolean)
    );

    const decision = await getLatestDecisionSummary(contentId);

    const auditDb = getCosmosDatabase();
    const { resources: auditEntries } = await auditDb.container('audit_logs').items
      .query(
        {
          query: `
            SELECT c.timestamp, c.action, c.reasonCode, c.note
            FROM c
            WHERE c.subjectId = @subjectId
            ORDER BY c.timestamp DESC
          `,
          parameters: [{ name: '@subjectId', value: contentId }],
        },
        { partitionKey: contentId, maxItemCount: 50 }
      )
      .fetchAll();

    const { resources: appeals } = await db.appeals.items
      .query(
        {
          query: `
            SELECT TOP 1 c.id, c.status, c.submittedAt, c.updatedAt
            FROM c
            WHERE c.contentId = @contentId
            ORDER BY c.updatedAt DESC
          `,
          parameters: [{ name: '@contentId', value: contentId }],
        },
        { partitionKey: contentId, maxItemCount: 1 }
      )
      .fetchAll();

    const appeal = appeals[0] ?? null;

    return createSuccessResponse({
      content: {
        contentId,
        type: contentType,
        createdAt: doc?.createdAt ?? null,
        state: doc ? mapContentState(doc.status as string | undefined) : 'PUBLISHED',
        preview: doc ? extractPreview(contentType, doc) : null,
      },
      flags: {
        flagId: flag.id,
        status: flag.status,
        flagCount: relatedFlags.length,
        reporterCount: reporterIds.size,
        reasons: relatedFlags.map((entry) => ({
          reason: entry.reason,
          createdAt: entry.createdAt,
          status: entry.status,
        })),
      },
      moderation: {
        lastDecisionAt: decision?.decidedAt ?? null,
        configVersionUsed: decision?.configVersionUsed ?? null,
        reasonCodes: decision?.reasonCodes ?? [],
      },
      appeal: appeal
        ? {
            appealId: appeal.id,
            status: String(appeal.status).toUpperCase(),
            submittedAt: appeal.submittedAt ?? null,
            updatedAt: appeal.updatedAt ?? null,
          }
        : null,
      history: {
        flags: relatedFlags.map((entry) => ({
          type: 'flag',
          at: entry.createdAt,
          reason: entry.reason,
        })),
        adminActions: auditEntries.map((entry) => ({
          type: 'admin_action',
          at: entry.timestamp,
          action: entry.action,
          reasonCode: entry.reasonCode ?? null,
          note: entry.note ?? null,
        })),
        appeal: appeal
          ? {
              type: 'appeal',
              at: appeal.submittedAt,
              status: String(appeal.status).toUpperCase(),
            }
          : null,
      },
    });
  } catch (error) {
    context.error('admin.flags.get_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to fetch flag');
  }
}

app.http('admin_flags_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/flags/{flagId}',
  handler: requireActiveAdmin(getFlagDetail),
});
