import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

export async function adminAuditGetHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const limit = parseLimit(req.query?.get?.('limit'));

  try {
    const database = getCosmosDatabase();
    const auditLogs = database.container('audit_logs');

    const response = await auditLogs.items
      .query(
        {
          query: 'SELECT * FROM c ORDER BY c.timestamp DESC',
        },
        { maxItemCount: limit }
      )
      .fetchNext();

    const items = response.resources.map((entry) => ({
      id: entry.id ?? null,
      timestamp: entry.timestamp ?? null,
      actorId: entry.actorId ?? null,
      action: entry.action ?? entry.eventType ?? null,
      targetType: entry.targetType ?? null,
      subjectId: entry.subjectId ?? null,
      reasonCode: entry.reasonCode ?? null,
      note: entry.note ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      correlationId: entry.correlationId ?? null,
      metadata: entry.metadata ?? null,
    }));

    return createSuccessResponse({
      items,
      count: items.length,
      nextCursor: response.continuationToken ?? null,
    });
  } catch (error) {
    context.error('admin.audit.list_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to list audit entries');
  }
}

app.http('admin_audit_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/audit',
  handler: requireActiveAdmin(adminAuditGetHandler),
});
