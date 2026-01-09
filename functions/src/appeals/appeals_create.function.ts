/**
 * Create Appeal Function
 * 
 * POST /api/appeals
 * 
 * File an appeal against a moderation decision.
 * 
 * OpenAPI: appeals_create
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { FileAppealRequest, AppealResponse } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { createAppeal } from './appealsService';
import { HttpError } from '@shared/utils/errors';
import { getCosmosDatabase } from '@shared/clients/cosmos';

export const appeals_create = httpHandler<FileAppealRequest, AppealResponse>(async (ctx) => {
  ctx.context.log(`[appeals_create] Filing new appeal [${ctx.correlationId}]`);

  if (!ctx.body || !ctx.body.caseId || !ctx.body.statement) {
    return ctx.badRequest('caseId and statement are required', 'INVALID_REQUEST');
  }

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const db = getCosmosDatabase();
    const { resource: user } = await db.container('users').item(auth.userId, auth.userId).read();
    if (!user || user.isActive === false) {
      return ctx.forbidden('Account is disabled', 'ACCOUNT_DISABLED');
    }
  } catch {
    return ctx.forbidden('Account is disabled', 'ACCOUNT_DISABLED');
  }

  try {
    const appeal = await createAppeal(auth.userId, ctx.body);
    return ctx.created({ appeal });
  } catch (error) {
    if (error instanceof HttpError) {
      switch (error.status) {
        case 400:
          return ctx.badRequest(error.message, error.message);
        case 401:
          return ctx.unauthorized(error.message);
        case 404:
          return ctx.notFound(error.message);
      }
    }

    ctx.context.error(`[appeals_create] Error creating appeal: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('appeals_create', {
  methods: ['POST'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'appeals',
  handler: appeals_create,
});
