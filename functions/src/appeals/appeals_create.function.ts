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

export const appeals_create = httpHandler<FileAppealRequest, AppealResponse>(async (ctx) => {
  ctx.context.log(`[appeals_create] Filing new appeal [${ctx.correlationId}]`);

  // TODO: Implement create appeal logic
  // - Extract user ID from JWT
  // - Validate FileAppealRequest (caseId, statement, evidence)
  // - Verify case exists and user was affected by the decision
  // - Check appeal eligibility (not already appealed, within time window)
  // - Generate UUID v7 for appeal ID
  // - Create Appeal document in Cosmos appeals container with partition key /id
  // - Set initial status = 'pending'
  // - Return AppealResponse with 201 Created

  return ctx.notImplemented('appeals_create');
});

// Register HTTP trigger
app.http('appeals_create', {
  methods: ['POST'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'appeals',
  handler: appeals_create,
});
