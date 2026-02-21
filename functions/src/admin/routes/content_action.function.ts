import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';
import { fetchContentById, mapContentState, resolveFlagsForContent } from '../moderationAdminUtils';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';

type ContentAction = 'block' | 'publish';

interface ContentActionBody {
  contentType?: 'post' | 'comment' | 'user';
  reasonCode?: string;
  note?: string;
}

const ACTION_TO_STATUS: Record<ContentAction, 'blocked' | 'published'> = {
  block: 'blocked',
  publish: 'published',
};

const ACTION_TO_AUDIT: Record<ContentAction, 'CONTENT_BLOCK' | 'CONTENT_PUBLISH'> = {
  block: 'CONTENT_BLOCK',
  publish: 'CONTENT_PUBLISH',
};

async function handleContentAction(
  action: ContentAction,
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const contentId = req.params.contentId;
  if (!contentId) {
    return createErrorResponse(400, 'missing_content_id', 'contentId is required');
  }

  const body = (await req.json().catch(() => null)) as ContentActionBody | null;
  const contentType = body?.contentType;
  if (!contentType) {
    return createErrorResponse(400, 'missing_content_type', 'contentType is required');
  }

  const reasonCode = body?.reasonCode?.trim();
  if (!reasonCode) {
    return createErrorResponse(400, 'missing_reason', 'reasonCode is required');
  }

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;
  const now = Date.now();
  const nowIso = new Date().toISOString();

  try {
    const content = await fetchContentById(contentType, contentId);
    if (!content) {
      return createErrorResponse(404, 'not_found', 'Content not found');
    }

    const { container, document, partitionKey } = content;
    const beforeState = mapContentState(document.status as string | undefined);
    const updatedAtValue = typeof document.updatedAt === 'number' ? now : nowIso;

    const patchOps: import('@azure/cosmos').PatchOperation[] = [
      { op: 'set' as const, path: '/status', value: ACTION_TO_STATUS[action] },
      { op: 'set' as const, path: '/updatedAt', value: updatedAtValue },
    ];

    if (document.moderation) {
      patchOps.push({
        op: 'set' as const,
        path: '/moderation/status',
        value: ACTION_TO_STATUS[action] === 'blocked' ? 'blocked' : 'clean',
      });
      patchOps.push({
        op: 'set' as const,
        path: '/moderation/checkedAt',
        value: now,
      });
    } else {
      patchOps.push({
        op: 'set' as const,
        path: '/moderation',
        value: {
          status: ACTION_TO_STATUS[action] === 'blocked' ? 'blocked' : 'clean',
          checkedAt: now,
        },
      });
    }

    await container.item(contentId, partitionKey).patch(patchOps);

    await resolveFlagsForContent(contentId, actorId);

    await recordAdminAudit({
      actorId,
      action: ACTION_TO_AUDIT[action],
      subjectId: contentId,
      targetType: 'content',
      reasonCode,
      note: body?.note ?? null,
      before: { status: beforeState },
      after: { status: ACTION_TO_STATUS[action].toUpperCase() },
      correlationId: context.invocationId,
      metadata: { contentType },
    });

    return createSuccessResponse({
      contentId,
      contentType,
      status: ACTION_TO_STATUS[action].toUpperCase(),
    });
  } catch (error) {
    context.error(`admin.content.${action}_failed`, error);
    return createErrorResponse(500, 'internal_error', 'Failed to update content');
  }
}

export async function blockContent(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleContentAction('block', req, context);
}

export async function publishContent(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handleContentAction('publish', req, context);
}

app.http('admin_content_block', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/content/{contentId}/block',
  handler: withRateLimit(requireActiveAdmin(blockContent), (req) => getPolicyForRoute(req)),
});

app.http('admin_content_publish', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/content/{contentId}/publish',
  handler: withRateLimit(requireActiveAdmin(publishContent), (req) => getPolicyForRoute(req)),
});
