/**
 * Get Signed Post Receipt Function
 *
 * GET /api/posts/{id}/receipt
 *
 * Returns sanitized, signed receipt events for a post.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { postsService } from '@posts/service/postsService';
import {
  buildSignedReceiptPayload,
  getReceiptEventsForPost,
  type SignedReceiptPayload,
} from '@shared/services/receiptEvents';

export const posts_receipt_get = httpHandler<void, SignedReceiptPayload>(async (ctx) => {
  const postId = ctx.params.id;
  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  try {
    const post = await postsService.getPostById(postId);
    if (!post || post.status === 'deleted') {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    const events = await getReceiptEventsForPost(postId);
    const payload = buildSignedReceiptPayload(postId, events);
    return ctx.ok(payload);
  } catch (error) {
    ctx.context.error(`[posts_receipt_get] Error fetching receipt: ${error}`, {
      correlationId: ctx.correlationId,
      postId,
    });
    return ctx.internalError(error as Error);
  }
});

app.http('posts_receipt_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}/receipt',
  handler: posts_receipt_get,
});

