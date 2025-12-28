/**
 * Get Post Insights Function
 *
 * GET /api/posts/{id}/insights
 *
 * Returns sanitized moderation insights for a post.
 * Only accessible by the post author or admins.
 *
 * Privacy: No raw scores, thresholds, or probabilities are exposed.
 *
 * Authorization:
 *   - Authenticated user required (401 if not)
 *   - Must be post author OR have admin role (403 if not)
 *   - 404 if post doesn't exist (consistent with other post endpoints)
 *
 * Response:
 *   - 200: PostInsightsResponse
 *   - 401: Unauthenticated
 *   - 403: Not author or admin
 *   - 404: Post not found
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';
import {
  type PostInsightsResponse,
  getLatestModerationDecision,
  getAppealForPost,
  buildInsightsResponse,
} from '@posts/service/insightsService';

export const posts_get_insights = httpHandler<void, PostInsightsResponse>(async (ctx) => {
  const postId = ctx.params.id;
  ctx.context.log(`[posts_get_insights] Fetching insights for post ${postId} [${ctx.correlationId}]`);

  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  // ─────────────────────────────────────────────────────────────
  // Step 1: Require authentication
  // ─────────────────────────────────────────────────────────────
  let viewerId: string;
  let viewerRoles: string[];
  try {
    const auth = await extractAuthContext(ctx);
    viewerId = auth.userId;
    viewerRoles = auth.roles;
  } catch {
    return ctx.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  // ─────────────────────────────────────────────────────────────
  // Step 2: Check post exists (404 if not)
  // ─────────────────────────────────────────────────────────────
  const post = await postsService.getPostById(postId);
  if (!post || post.status === 'deleted') {
    return ctx.notFound('Post not found', 'POST_NOT_FOUND');
  }

  // ─────────────────────────────────────────────────────────────
  // Step 3: Authorization - author or admin only
  // ─────────────────────────────────────────────────────────────
  const isAuthor = post.authorId === viewerId;
  const isAdmin = viewerRoles.includes('admin');

  if (!isAuthor && !isAdmin) {
    ctx.context.log(`[posts_get_insights] Access denied for user ${viewerId} on post ${postId}`);
    return ctx.forbidden('Access denied', 'ACCESS_DENIED');
  }

  // ─────────────────────────────────────────────────────────────
  // Step 4: Fetch moderation decision and appeal
  // ─────────────────────────────────────────────────────────────
  try {
    const [decision, appeal] = await Promise.all([
      getLatestModerationDecision(postId),
      getAppealForPost(postId),
    ]);

    // Build sanitized response (no raw scores/thresholds)
    const insights = buildInsightsResponse(postId, decision, appeal);

    ctx.context.log(`[posts_get_insights] Returning insights for post ${postId}: band=${insights.riskBand}`);
    return ctx.ok(insights);
  } catch (error) {
    ctx.context.error(`[posts_get_insights] Error fetching insights: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('posts_get_insights', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}/insights',
  handler: posts_get_insights,
});
