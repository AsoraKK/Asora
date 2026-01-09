import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';

interface ResolveBody {
  reasonCode?: string;
  note?: string;
}

export async function resolveFlag(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const flagId = req.params.flagId;
  if (!flagId) {
    return createErrorResponse(400, 'missing_flag_id', 'flagId is required');
  }

  const body = (await req.json().catch(() => null)) as ResolveBody | null;
  const reasonCode = body?.reasonCode?.trim();
  if (!reasonCode) {
    return createErrorResponse(400, 'missing_reason', 'reasonCode is required');
  }

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;
  const now = new Date().toISOString();

  try {
    const db = getTargetDatabase();
    const { resources } = await db.flags.items
      .query(
        {
          query: 'SELECT * FROM c WHERE c.id = @flagId',
          parameters: [{ name: '@flagId', value: flagId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();

    const flag = resources[0];
    if (!flag) {
      return createErrorResponse(404, 'not_found', 'Flag not found');
    }

    await db.flags.item(flag.id, flag.contentId).patch([
      { op: 'set', path: '/status', value: 'resolved' },
      { op: 'set', path: '/resolvedAt', value: now },
      { op: 'set', path: '/resolvedBy', value: actorId },
      { op: 'set', path: '/moderatorNotes', value: body?.note ?? null },
      { op: 'set', path: '/resolvedReasonCode', value: reasonCode },
    ]);

    await recordAdminAudit({
      actorId,
      action: 'FLAG_RESOLVE',
      subjectId: flag.contentId,
      targetType: 'flag',
      reasonCode,
      note: body?.note ?? null,
      before: { status: flag.status },
      after: { status: 'resolved' },
      correlationId: context.invocationId,
      metadata: { flagId },
    });

    return createSuccessResponse({ resolved: true });
  } catch (error) {
    context.error('admin.flags.resolve_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to resolve flag');
  }
}

app.http('admin_flags_resolve', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/flags/{flagId}/resolve',
  handler: requireActiveAdmin(resolveFlag),
});
